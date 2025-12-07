'use client'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, Plus, X, Loader2, Star, ArrowUp, ArrowDown, MessageSquare, Send, Brain } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Header } from '@/components/Header'
import { 
  getTopic, 
  createArgument, 
  upvoteArgument,
  downvoteArgument,
  commentOnArgument,
  getComments,
  type TopicDetailResponse,
  type CommentResponse
} from '@/src/api'

export default function TopicPage() {
  const params = useParams()
  const topicId = params.id as string  // UUID is a string
  const { user } = useAuth()
  
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [selectedTopic, setSelectedTopic] = useState<TopicDetailResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rejectionError, setRejectionError] = useState<{ message: string; reasoning: string } | null>(null)
  
  const [showAddArgumentForm, setShowAddArgumentForm] = useState<{ side: 'pro' | 'con' | null }>({ side: null })
  const [newArgument, setNewArgument] = useState<{ title: string; content: string; sources: string; side: 'pro' | 'con' }>({
    title: '',
    content: '',
    sources: '',
    side: 'pro'
  })
  const [votingArgumentId, setVotingArgumentId] = useState<number | null>(null)
  const [expandedComments, setExpandedComments] = useState<Set<number>>(new Set())
  const [commentTexts, setCommentTexts] = useState<Record<number, string>>({})
  const [submittingCommentId, setSubmittingCommentId] = useState<number | null>(null)
  const [comments, setComments] = useState<Record<number, CommentResponse[]>>({})
  const [loadingComments, setLoadingComments] = useState<Set<number>>(new Set())
  const [userVotes, setUserVotes] = useState<Record<number, 'upvote' | 'downvote' | null>>({})

  // Helper function to extract domain from URL
  const getDomain = (url: string): string => {
    try {
      return new URL(url).hostname.replace('www.', '')
    } catch {
      return url
    }
  }

  const fetchTopicDetails = async (id: string) => {
    setLoading(true)
    setError(null)
    try {
      const data = await getTopic(id)
      setSelectedTopic(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch topic details')
      console.error('Error fetching topic:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (topicId) {
      fetchTopicDetails(topicId)
    }
  }, [topicId])

  const handleAddArgument = async (side: 'pro' | 'con') => {
    if (!selectedTopic || !newArgument.title.trim() || !newArgument.content.trim()) return
    
    if (!user) {
      setError('You must be signed in to add arguments')
      return
    }
    
    setLoading(true)
    setError(null)
    setRejectionError(null)
    
    try {
      const username = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'user'
      await createArgument(
        selectedTopic.id,
        {
          title: newArgument.title,
          content: newArgument.content,
          sources: newArgument.sources || undefined,
          side: side,
          author: username
        }
      )
      
      // Reset form
      setNewArgument({ title: '', content: '', sources: '', side: 'pro' })
      setShowAddArgumentForm({ side: null })
      
      // Refresh topic data
      await fetchTopicDetails(selectedTopic.id)
    } catch (err: unknown) {
      // Check for quota exceeded error (403)
      const errorObj = err as { status?: number; detail?: { error?: string; message?: string }; response?: { status?: number; data?: { detail?: { message?: string; reasoning?: string; error?: string } | string } } }
      if (errorObj.status === 403 && errorObj.detail?.error === 'quota_exceeded') {
        setError(errorObj.detail.message || "You've reached your contribution limit.")
      } else if (err && typeof err === 'object' && 'response' in err) {
        // Check if this is a rejection error (400 status with specific structure)
        const errorResponse = errorObj
        if (errorResponse.response?.status === 400) {
          const errorDetail = errorResponse.response?.data?.detail || {}
          // Handle case where detail might be a string or an object
          const errorData = typeof errorDetail === 'object' ? errorDetail : { message: errorDetail }
          
          setRejectionError({
            message: errorData.message || errorData.error || 'This argument was rejected as not relevant to the debate topic.',
            reasoning: errorData.reasoning || 'The argument contains no verifiable factual claims related to the debate topic.'
          })
        } else {
          setError(err instanceof Error ? err.message : 'Failed to add argument')
          console.error('Error adding argument:', err)
        }
      } else {
        setError(err instanceof Error ? err.message : 'Failed to add argument')
        console.error('Error adding argument:', err)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleVote = async (argumentId: number, voteType: 'upvote' | 'downvote') => {
    if (!user) {
      setError('You must be signed in to vote')
      return
    }
    
    setVotingArgumentId(argumentId)
    try {
      let response
      if (voteType === 'upvote') {
        response = await upvoteArgument(argumentId)
      } else {
        response = await downvoteArgument(argumentId)
      }
      
      // Update user vote status
      setUserVotes(prev => ({
        ...prev,
        [argumentId]: response.user_vote
      }))
      
      // Update vote count in selectedTopic
      if (selectedTopic) {
        setSelectedTopic(prev => {
          if (!prev) return prev
          
          const updateArgumentVotes = (args: typeof prev.pro_arguments) => {
            return args.map(arg => 
              arg.id === argumentId 
                ? { ...arg, votes: response.votes }
                : arg
            )
          }
          
          return {
            ...prev,
            pro_arguments: updateArgumentVotes(prev.pro_arguments),
            con_arguments: updateArgumentVotes(prev.con_arguments)
          }
        })
      }
    } catch (err) {
      console.error('Error voting:', err)
      setError(err instanceof Error ? err.message : 'Failed to record vote')
    } finally {
      setVotingArgumentId(null)
    }
  }

  const handleToggleComments = async (argumentId: number) => {
    if (expandedComments.has(argumentId)) {
      // Collapse comments
      setExpandedComments(prev => {
        const newSet = new Set(prev)
        newSet.delete(argumentId)
        return newSet
      })
    } else {
      // Expand and load comments
      setExpandedComments(prev => new Set(prev).add(argumentId))
      
      // Load comments if not already loaded
      if (!comments[argumentId]) {
        setLoadingComments(prev => new Set(prev).add(argumentId))
        try {
          const argumentComments = await getComments(argumentId)
          setComments(prev => ({ ...prev, [argumentId]: argumentComments }))
        } catch (err) {
          console.error('Error loading comments:', err)
        } finally {
          setLoadingComments(prev => {
            const newSet = new Set(prev)
            newSet.delete(argumentId)
            return newSet
          })
        }
      }
    }
  }

  const handleSubmitComment = async (argumentId: number) => {
    const commentText = commentTexts[argumentId]?.trim()
    if (!commentText) return
    
    setSubmittingCommentId(argumentId)
    try {
      await commentOnArgument(argumentId, {
        comment: commentText
      })
      
      // Clear the comment text
      setCommentTexts(prev => {
        const newTexts = { ...prev }
        delete newTexts[argumentId]
        return newTexts
      })
      
      // Refresh comments
      const argumentComments = await getComments(argumentId)
      setComments(prev => ({ ...prev, [argumentId]: argumentComments }))
    } catch (err) {
      console.error('Error submitting comment:', err)
      setError(err instanceof Error ? err.message : 'Failed to submit comment')
    } finally {
      setSubmittingCommentId(null)
    }
  }

  if (loading && !selectedTopic) {
    return (
      <div className="relative min-h-screen overflow-hidden text-text-primary flex flex-col items-center justify-center gap-4 z-10">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
        <p className="text-text-secondary text-lg">Verifying arguments and generating analysis...</p>
        <p className="text-text-tertiary text-sm">This may take 30-60 seconds on first load</p>
      </div>
    )
  }

  if (!selectedTopic) {
    return (
      <div className="relative min-h-screen overflow-hidden text-text-primary">
        <div className="relative z-10 pt-32 pb-20 px-6 max-w-7xl mx-auto">
          <Link href="/browse">
            <Button 
              variant="outline" 
              className="mb-8 rounded-full border-white/20 hover:bg-white/10 hover:text-white text-text-secondary"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Topics
            </Button>
          </Link>
          <Card className="glass-panel p-12 text-center">
            <p className="text-text-secondary text-lg">Topic not found</p>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen overflow-hidden text-text-primary">
      <Header />
      
      <div className="relative z-10 pt-32 pb-20 px-6 max-w-7xl mx-auto">
        <Link href="/browse">
          <Button 
            variant="outline" 
            className="mb-8 rounded-full border-white/20 hover:bg-white/10 hover:text-white text-text-secondary"
            disabled={loading}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Topics
          </Button>
        </Link>

        {error && (
          <Card className="glass-panel border-accent-error/30 bg-accent-error/10 p-4 mb-6">
            <p className="text-accent-error">{error}</p>
          </Card>
        )}

        {/* Rejection Error Modal */}
        {rejectionError && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <Card className="glass-panel border-accent-error/50 p-6 max-w-lg w-full">
              <div className="flex items-start gap-4">
                <div className="text-red-400 text-2xl">❌</div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-red-400 mb-3">Argument Rejected</h3>
                  <p className="text-text-secondary mb-3">{rejectionError.message}</p>
                  <div className="bg-black/30 border border-yellow-500/20 rounded p-3 mb-4">
                    <p className="text-xs text-yellow-300 font-semibold mb-1">Reasoning:</p>
                    <p className="text-xs text-text-tertiary">{rejectionError.reasoning}</p>
                  </div>
                  {selectedTopic && (
                    <p className="text-sm text-text-tertiary mb-4">
                      Please submit an argument with factual claims related to: <span className="text-text-secondary font-semibold">"{selectedTopic.proposition}"</span>
                    </p>
                  )}
                  <Button
                    onClick={() => setRejectionError(null)}
                    className="w-full bg-red-600 hover:bg-red-700 text-white"
                  >
                    Close
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}

        <div className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <span className="font-mono text-sm text-text-tertiary uppercase tracking-[0.3em]">Topic</span>
          </div>
          <div>
            <h1 className="text-[clamp(2rem,4vw,3.5rem)] font-light leading-tight tracking-[-0.04em]">{selectedTopic.proposition}</h1>
            <p className="text-sm text-text-tertiary mt-2">Arguments sorted by validity (highest quality first)</p>
          </div>
        </div>

        <div ref={containerRef} className="relative grid md:grid-cols-2 gap-6 mb-8">
          {/* Pro Column */}
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-1 h-6 bg-green-500 rounded-full" />
                <h4 className="text-lg font-semibold text-green-500">Pro Arguments</h4>
              </div>
              <Button 
                size="sm"
                variant="outline"
                className="border-green-500/30 hover:bg-green-950/30 text-green-500"
                onClick={() => setShowAddArgumentForm({ side: 'pro' })}
                disabled={loading}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add
              </Button>
            </div>

            {showAddArgumentForm.side === 'pro' && (
              <Card className="glass-panel p-6">
                <Input
                  value={newArgument.title}
                  onChange={(e) => setNewArgument(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Argument title..."
                  className="bg-black/50 border-green-800/30 text-white mb-3"
                />
                <Textarea
                  value={newArgument.content}
                  onChange={(e) => setNewArgument(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Argument content..."
                  className="bg-black/50 border-green-800/30 text-white mb-3 min-h-[100px]"
                />
                <Input
                  value={newArgument.sources}
                  onChange={(e) => setNewArgument(prev => ({ ...prev, sources: e.target.value }))}
                  placeholder="Sources (optional)"
                  className="bg-black/50 border-green-800/30 text-white mb-3"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleAddArgument('pro')}
                    disabled={loading || !newArgument.title.trim() || !newArgument.content.trim()}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setShowAddArgumentForm({ side: null })
                      setNewArgument({ title: '', content: '', sources: '', side: 'pro' })
                    }}
                    className="border-green-500/30 text-green-500"
                  >
                    Cancel
                  </Button>
                </div>
              </Card>
            )}
            
            {selectedTopic.pro_arguments.length === 0 ? (
              <Card className="glass-panel p-6 text-center">
                <p className="text-text-tertiary text-sm">Nothing here yet, add to the debate!</p>
              </Card>
            ) : (
              selectedTopic.pro_arguments.map((arg) => {
                const validityScore = typeof arg.validity_score === 'number' ? arg.validity_score : 
                                     arg.validity_score !== null && arg.validity_score !== undefined ? 
                                     parseInt(String(arg.validity_score)) : null
                
                const voteCount = arg.votes || 0
                const voteColor = voteCount > 0 ? 'text-green-400' : voteCount < 0 ? 'text-red-400' : 'text-text-tertiary'
                
                return (
                <Card key={arg.id} className="card card-hover p-6">
                  {/* Voting UI */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex items-center gap-1 bg-black/30 rounded px-2 py-1 border border-gray-700/50">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleVote(arg.id, 'upvote')}
                        disabled={votingArgumentId === arg.id}
                        className="h-6 w-6 p-0 hover:bg-green-950/30 text-green-400 hover:text-green-300"
                      >
                        {votingArgumentId === arg.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <ArrowUp className="w-3 h-3" />
                        )}
                      </Button>
                      <span className={`text-sm font-semibold min-w-[2rem] text-center ${voteColor}`}>
                        {voteCount > 0 ? `+${voteCount}` : voteCount}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleVote(arg.id, 'downvote')}
                        disabled={votingArgumentId === arg.id}
                        className="h-6 w-6 p-0 hover:bg-red-950/30 text-red-400 hover:text-red-300"
                      >
                        {votingArgumentId === arg.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <ArrowDown className="w-3 h-3" />
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex items-start justify-between mb-2">
                    <h5 className="text-green-400 font-semibold flex-1">{arg.title}</h5>
                    {validityScore !== null && validityScore !== undefined && validityScore > 0 ? (
                      <div className="flex items-center gap-0.5 ml-2 flex-shrink-0 bg-yellow-950/20 px-2 py-1 rounded border border-yellow-500/30">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${
                              i < validityScore
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'text-gray-500 fill-transparent'
                            }`}
                          />
                        ))}
                        <span className="text-xs text-yellow-400 ml-1.5 font-semibold">{validityScore}/5</span>
                      </div>
                    ) : null}
                  </div>
                  <p className="text-text-secondary mb-3">{arg.content}</p>
                  {arg.validity_reasoning && (
                    <div className="mb-3 p-3 bg-black/30 rounded border border-yellow-500/20">
                      <p className="text-xs text-yellow-300 font-semibold mb-1">Fact-Check:</p>
                      <p className="text-xs text-text-tertiary">{arg.validity_reasoning}</p>
                    </div>
                  )}
                  {/* User-provided sources */}
                  {arg.sources && arg.sources.trim() !== '' && (
                    <div className="mt-3 pt-3 border-t border-gray-700/50">
                      <p className="text-xs text-text-tertiary mb-2 font-semibold">Provided by author:</p>
                      <p className="text-xs text-text-tertiary font-mono break-words">{arg.sources}</p>
                    </div>
                  )}
                  {/* Fact-checker sources */}
                  {arg.key_urls && arg.key_urls.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-700/50">
                      <p className="text-xs text-accent-warning mb-2 font-semibold">Verified using:</p>
                      <div className="flex flex-wrap gap-2">
                        {arg.key_urls.slice(0, 3).map((url, idx) => (
                          <a
                            key={idx}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-xs text-text-tertiary hover:text-text-secondary transition-colors"
                            title={url}
                          >
                            <img
                              src={`https://www.google.com/s2/favicons?domain=${getDomain(url)}&sz=16`}
                              alt=""
                              className="w-4 h-4"
                            />
                            <span className="truncate max-w-[150px]">{getDomain(url)}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="flex justify-between items-center mt-3">
                    <div className="flex gap-2">
                      <span className="text-xs text-text-tertiary font-mono">by {arg.author}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleToggleComments(arg.id)}
                        className="btn-comment text-text-tertiary hover:text-text-secondary h-auto py-1 text-xs"
                      >
                        <MessageSquare className="w-3 h-3 mr-1" />
                        Comment
                      </Button>
                    </div>
                  </div>
                  
                  {/* Comments Section */}
                  {expandedComments.has(arg.id) && (
                    <div className="mt-4 pt-4 border-t border-gray-700/50">
                      <div className="space-y-4">
                        {/* Existing Comments */}
                        {loadingComments.has(arg.id) ? (
                          <div className="flex items-center justify-center py-4">
                            <Loader2 className="w-4 h-4 animate-spin text-text-tertiary" />
                            <span className="ml-2 text-sm text-text-tertiary">Loading comments...</span>
                          </div>
                        ) : comments[arg.id] && comments[arg.id].length > 0 ? (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 mb-2">
                              <MessageSquare className="w-4 h-4 text-text-tertiary" />
                              <span className="text-sm font-semibold text-text-secondary">
                                Comments ({comments[arg.id].length})
                              </span>
                            </div>
                            {comments[arg.id].map((comment) => (
                              <div key={comment.id} className="bg-black/30 rounded-lg p-3 border border-gray-700/30">
                                <p className="text-sm text-text-secondary whitespace-pre-wrap">{comment.comment}</p>
                                <p className="text-xs text-text-tertiary mt-2">
                                  {new Date(comment.created_at).toLocaleString()}
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-sm text-text-tertiary text-center py-2">
                            No comments yet. Be the first to comment!
                          </div>
                        )}
                        
                        {/* Add Comment Form */}
                        <div className="space-y-3 pt-2 border-t border-gray-700/30">
                          <div className="flex items-center gap-2 mb-2">
                            <MessageSquare className="w-4 h-4 text-text-tertiary" />
                            <span className="text-sm font-semibold text-text-secondary">Add a comment</span>
                          </div>
                          <Textarea
                            value={commentTexts[arg.id] || ''}
                            onChange={(e) => setCommentTexts(prev => ({ ...prev, [arg.id]: e.target.value }))}
                            placeholder="Share your thoughts on this argument..."
                            className="bg-black/50 border-gray-700/50 text-white min-h-[80px] text-sm"
                          />
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setExpandedComments(prev => {
                                  const newSet = new Set(prev)
                                  newSet.delete(arg.id)
                                  return newSet
                                })
                                setCommentTexts(prev => {
                                  const newTexts = { ...prev }
                                  delete newTexts[arg.id]
                                  return newTexts
                                })
                              }}
                              className="text-xs"
                            >
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleSubmitComment(arg.id)}
                              disabled={submittingCommentId === arg.id || !commentTexts[arg.id]?.trim()}
                              className="bg-green-600 hover:bg-green-700 text-white text-xs"
                            >
                              {submittingCommentId === arg.id ? (
                                <>
                                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                  Posting...
                                </>
                              ) : (
                                <>
                                  <Send className="w-3 h-3 mr-1" />
                                  Post Comment
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </Card>
                )
              })
            )}
          </div>

          {/* Con Column */}
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-1 h-6 bg-rose-500 rounded-full" />
                <h4 className="text-lg font-semibold text-rose-500">Con Arguments</h4>
              </div>
              <Button 
                size="sm"
                variant="outline"
                className="border-rose-500/30 hover:bg-rose-950/30 text-rose-500"
                onClick={() => setShowAddArgumentForm({ side: 'con' })}
                disabled={loading}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add
              </Button>
            </div>

            {showAddArgumentForm.side === 'con' && (
              <Card className="glass-panel p-6">
                <Input
                  value={newArgument.title}
                  onChange={(e) => setNewArgument(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Argument title..."
                  className="bg-black/50 border-rose-800/30 text-white mb-3"
                />
                <Textarea
                  value={newArgument.content}
                  onChange={(e) => setNewArgument(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Argument content..."
                  className="bg-black/50 border-rose-800/30 text-white mb-3 min-h-[100px]"
                />
                <Input
                  value={newArgument.sources}
                  onChange={(e) => setNewArgument(prev => ({ ...prev, sources: e.target.value }))}
                  placeholder="Sources (optional)"
                  className="bg-black/50 border-rose-800/30 text-white mb-3"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleAddArgument('con')}
                    disabled={loading || !newArgument.title.trim() || !newArgument.content.trim()}
                    className="bg-rose-600 hover:bg-rose-700 text-white"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setShowAddArgumentForm({ side: null })
                      setNewArgument({ title: '', content: '', sources: '', side: 'con' })
                    }}
                    className="border-rose-500/30 text-rose-500"
                  >
                    Cancel
                  </Button>
                </div>
              </Card>
            )}
            
            {selectedTopic.con_arguments.length === 0 ? (
              <Card className="glass-panel p-6 text-center">
                <p className="text-text-tertiary text-sm">Nothing here yet, add to the debate!</p>
              </Card>
            ) : (
              selectedTopic.con_arguments.map((arg) => {
                const validityScore = typeof arg.validity_score === 'number' ? arg.validity_score : 
                                     arg.validity_score !== null && arg.validity_score !== undefined ? 
                                     parseInt(String(arg.validity_score)) : null
                
                const voteCount = arg.votes || 0
                const voteColor = voteCount > 0 ? 'text-green-400' : voteCount < 0 ? 'text-red-400' : 'text-text-tertiary'
                
                return (
                <Card key={arg.id} className="card card-hover p-6">
                  {/* Voting UI */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex items-center gap-1 bg-black/30 rounded px-2 py-1 border border-gray-700/50">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleVote(arg.id, 'upvote')}
                        disabled={votingArgumentId === arg.id || !user}
                        className={`h-6 w-6 p-0 hover:bg-green-950/30 ${
                          userVotes[arg.id] === 'upvote' 
                            ? 'bg-green-950/50 text-green-300' 
                            : 'text-green-400 hover:text-green-300'
                        }`}
                      >
                        {votingArgumentId === arg.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <ArrowUp className="w-3 h-3" />
                        )}
                      </Button>
                      <span className={`text-sm font-semibold min-w-[2rem] text-center ${voteColor}`}>
                        {voteCount > 0 ? `+${voteCount}` : voteCount}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleVote(arg.id, 'downvote')}
                        disabled={votingArgumentId === arg.id || !user}
                        className={`h-6 w-6 p-0 hover:bg-red-950/30 ${
                          userVotes[arg.id] === 'downvote' 
                            ? 'bg-red-950/50 text-red-300' 
                            : 'text-red-400 hover:text-red-300'
                        }`}
                      >
                        {votingArgumentId === arg.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <ArrowDown className="w-3 h-3" />
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex items-start justify-between mb-2">
                    <h5 className="text-rose-400 font-semibold flex-1">{arg.title}</h5>
                    {validityScore !== null && validityScore !== undefined && validityScore > 0 ? (
                      <div className="flex items-center gap-0.5 ml-2 flex-shrink-0 bg-yellow-950/20 px-2 py-1 rounded border border-yellow-500/30">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${
                              i < validityScore
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'text-gray-500 fill-transparent'
                            }`}
                          />
                        ))}
                        <span className="text-xs text-yellow-400 ml-1.5 font-semibold">{validityScore}/5</span>
                      </div>
                    ) : null}
                  </div>
                  <p className="text-text-secondary mb-3">{arg.content}</p>
                  {arg.validity_reasoning && (
                    <div className="mb-3 p-3 bg-black/30 rounded border border-yellow-500/20">
                      <p className="text-xs text-yellow-300 font-semibold mb-1">Fact-Check:</p>
                      <p className="text-xs text-text-tertiary">{arg.validity_reasoning}</p>
                    </div>
                  )}
                  {/* User-provided sources */}
                  {arg.sources && arg.sources.trim() !== '' && (
                    <div className="mt-3 pt-3 border-t border-gray-700/50">
                      <p className="text-xs text-text-tertiary mb-2 font-semibold">Provided by author:</p>
                      <p className="text-xs text-text-tertiary font-mono break-words">{arg.sources}</p>
                    </div>
                  )}
                  {/* Fact-checker sources */}
                  {arg.key_urls && arg.key_urls.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-700/50">
                      <p className="text-xs text-accent-warning mb-2 font-semibold">Verified using:</p>
                      <div className="flex flex-wrap gap-2">
                        {arg.key_urls.slice(0, 3).map((url, idx) => (
                          <a
                            key={idx}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-xs text-text-tertiary hover:text-text-secondary transition-colors"
                            title={url}
                          >
                            <img
                              src={`https://www.google.com/s2/favicons?domain=${getDomain(url)}&sz=16`}
                              alt=""
                              className="w-4 h-4"
                            />
                            <span className="truncate max-w-[150px]">{getDomain(url)}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="flex justify-between items-center mt-3">
                    <div className="flex gap-2">
                      <span className="text-xs text-text-tertiary font-mono">by {arg.author}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleToggleComments(arg.id)}
                        className="btn-comment text-text-tertiary hover:text-text-secondary h-auto py-1 text-xs"
                      >
                        <MessageSquare className="w-3 h-3 mr-1" />
                        Comment
                      </Button>
                    </div>
                  </div>
                  
                  {/* Comments Section */}
                  {expandedComments.has(arg.id) && (
                    <div className="mt-4 pt-4 border-t border-gray-700/50">
                      <div className="space-y-4">
                        {/* Existing Comments */}
                        {loadingComments.has(arg.id) ? (
                          <div className="flex items-center justify-center py-4">
                            <Loader2 className="w-4 h-4 animate-spin text-text-tertiary" />
                            <span className="ml-2 text-sm text-text-tertiary">Loading comments...</span>
                          </div>
                        ) : comments[arg.id] && comments[arg.id].length > 0 ? (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 mb-2">
                              <MessageSquare className="w-4 h-4 text-text-tertiary" />
                              <span className="text-sm font-semibold text-text-secondary">
                                Comments ({comments[arg.id].length})
                              </span>
                            </div>
                            {comments[arg.id].map((comment) => (
                              <div key={comment.id} className="bg-black/30 rounded-lg p-3 border border-gray-700/30">
                                <p className="text-sm text-text-secondary whitespace-pre-wrap">{comment.comment}</p>
                                <p className="text-xs text-text-tertiary mt-2">
                                  {new Date(comment.created_at).toLocaleString()}
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-sm text-text-tertiary text-center py-2">
                            No comments yet. Be the first to comment!
                          </div>
                        )}
                        
                        {/* Add Comment Form */}
                        <div className="space-y-3 pt-2 border-t border-gray-700/30">
                          <div className="flex items-center gap-2 mb-2">
                            <MessageSquare className="w-4 h-4 text-text-tertiary" />
                            <span className="text-sm font-semibold text-text-secondary">Add a comment</span>
                          </div>
                          <Textarea
                            value={commentTexts[arg.id] || ''}
                            onChange={(e) => setCommentTexts(prev => ({ ...prev, [arg.id]: e.target.value }))}
                            placeholder="Share your thoughts on this argument..."
                            className="bg-black/50 border-gray-700/50 text-white min-h-[80px] text-sm"
                          />
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setExpandedComments(prev => {
                                  const newSet = new Set(prev)
                                  newSet.delete(arg.id)
                                  return newSet
                                })
                                setCommentTexts(prev => {
                                  const newTexts = { ...prev }
                                  delete newTexts[arg.id]
                                  return newTexts
                                })
                              }}
                              className="text-xs"
                            >
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleSubmitComment(arg.id)}
                              disabled={submittingCommentId === arg.id || !commentTexts[arg.id]?.trim()}
                              className="bg-rose-600 hover:bg-rose-700 text-white text-xs"
                            >
                              {submittingCommentId === arg.id ? (
                                <>
                                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                  Posting...
                                </>
                              ) : (
                                <>
                                  <Send className="w-3 h-3 mr-1" />
                                  Post Comment
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </Card>
                )
              })
            )}
          </div>
        </div>

        {/* AI Analysis Section */}
        <div>
        <Card className="glass-panel p-8">
          <div className="flex items-center gap-3 mb-4">
            <Brain className="w-6 h-6 text-purple-400" />
            <h4 className="text-lg font-semibold text-purple-300">Claude Analysis</h4>
            {selectedTopic.overall_summary && (
              <span className="ml-auto text-xs text-purple-400 font-mono">Available</span>
            )}
          </div>
          
          {loading && !selectedTopic.overall_summary ? (
            <div className="flex items-center gap-2 text-purple-400">
              <Loader2 className="w-4 h-4 animate-spin text-white" />
              <span>Generating analysis...</span>
            </div>
          ) : selectedTopic.overall_summary ? (
            <div className="space-y-6">
              <div>
                <h5 className="text-purple-300 font-semibold mb-2">Overall Summary</h5>
                <p className="text-text-secondary leading-relaxed">{selectedTopic.overall_summary}</p>
              </div>
              {selectedTopic.consensus_view && (
                <div>
                  <h5 className="text-purple-300 font-semibold mb-2">Consensus View</h5>
                  <p className="text-text-secondary leading-relaxed">{selectedTopic.consensus_view}</p>
                </div>
              )}
              {selectedTopic.timeline_view && selectedTopic.timeline_view.length > 0 && (
                <div>
                  <h5 className="text-purple-300 font-semibold mb-2">Timeline View</h5>
                  <div className="space-y-3">
                    {selectedTopic.timeline_view.map((item, i) => (
                      <div key={i} className="border-l-2 border-purple-500/30 pl-4">
                        <p className="text-purple-400 font-semibold text-sm mb-1">{item.period}</p>
                        <p className="text-text-secondary text-sm">{item.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div>
              <p className="text-text-secondary">
                {selectedTopic.pro_arguments.length === 0 || selectedTopic.con_arguments.length === 0
                  ? 'Add at least one pro and one con argument to generate analysis'
                  : 'Analysis will be generated automatically...'}
              </p>
            </div>
          )}
        </Card>
        </div>
      </div>
    </div>
  )
}


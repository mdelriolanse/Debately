'use client'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ShaderBackground } from '@/components/ShaderBackground'
import { Users, Brain, Scale, Sparkles, ArrowLeft, Plus, X, Loader2, Star, ArrowUp, ArrowDown, MessageSquare, Send, Search } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { 
  getTopics, 
  createTopic, 
  getTopic, 
  createArgument, 
  upvoteArgument,
  downvoteArgument,
  commentOnArgument,
  getComments,
  validateProposition,
  type TopicListItem,
  type TopicDetailResponse,
  type ArgumentCreate,
  type CommentCreate,
  type CommentResponse,
  type PropositionValidationResponse,
  type PropositionSuggestion
} from '@/src/api'

export default function Home() {
  const [view, setView] = useState<'landing' | 'browse' | 'topic' | 'createDebate'>('landing')
  const [topics, setTopics] = useState<TopicListItem[]>([])
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [selectedTopic, setSelectedTopic] = useState<TopicDetailResponse | null>(null)
  const [selectedTopicId, setSelectedTopicId] = useState<number | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rejectionError, setRejectionError] = useState<{ message: string; reasoning: string } | null>(null)
  const [newDebateForm, setNewDebateForm] = useState({
    title: '',
    createdBy: 'user', // Default username - could be made dynamic
    proArgs: [{ title: '', content: '', sources: '' }],
    conArgs: [{ title: '', content: '', sources: '' }]
  })
  const [showAddArgumentForm, setShowAddArgumentForm] = useState<{ side: 'pro' | 'con' | null }>({ side: null })
  const [newArgument, setNewArgument] = useState<{ title: '', content: '', sources: '', side: 'pro' | 'con' }>({
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
  
  // Proposition validation state
  const [validationState, setValidationState] = useState<{
    result: PropositionValidationResponse | null;
    iterationCount: number;
    showSuggestions: boolean;
    isValidating: boolean;
  }>({
    result: null,
    iterationCount: 0,
    showSuggestions: false,
    isValidating: false
  })
  const [selectedProposition, setSelectedProposition] = useState<string | null>(null)
  const [validationInput, setValidationInput] = useState<string>('')

  // Helper function to extract domain from URL
  const getDomain = (url: string): string => {
    try {
      return new URL(url).hostname.replace('www.', '')
    } catch {
      return url
    }
  }

  const fetchTopics = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getTopics()
      setTopics(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch topics')
      console.error('Error fetching topics:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchTopicDetails = async (topicId: number) => {
    setLoading(true)
    setError(null)
    try {
      // Backend now automatically verifies and sorts by validity
      const data = await getTopic(topicId)
      setSelectedTopic(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch topic details')
      console.error('Error fetching topic details:', err)
    } finally {
      setLoading(false)
    }
  }

  // Fetch topics when browse view is opened
  useEffect(() => {
    if (view === 'browse') {
      fetchTopics()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view])

  // Fetch topic details when a topic is selected
  useEffect(() => {
    if (selectedTopicId !== null) {
      fetchTopicDetails(selectedTopicId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTopicId])


  const handleStartDebate = () => {
    setView('createDebate')
    setError(null)
  }

  const handleBrowseTopics = () => {
    setView('browse')
    setError(null)
    setSearchQuery('')
  }

  const handleSelectTopic = (topic: TopicListItem) => {
    setSelectedTopicId(topic.id)
    setView('topic')
    setError(null)
  }

  const handleBackToLanding = () => {
    setView('landing')
    setSelectedTopic(null)
    setSelectedTopicId(null)
    setError(null)
  }

  const handleBackToBrowse = () => {
    setView('browse')
    setSelectedTopic(null)
    setSelectedTopicId(null)
    setError(null)
    setSearchQuery('')
  }

  const handleAddProArg = () => {
    setNewDebateForm(prev => ({
      ...prev,
      proArgs: [...prev.proArgs, { title: '', content: '', sources: '' }]
    }))
  }

  const handleAddConArg = () => {
    setNewDebateForm(prev => ({
      ...prev,
      conArgs: [...prev.conArgs, { title: '', content: '', sources: '' }]
    }))
  }

  const handleRemoveProArg = (index: number) => {
    setNewDebateForm(prev => ({
      ...prev,
      proArgs: prev.proArgs.filter((_, i) => i !== index)
    }))
  }

  const handleRemoveConArg = (index: number) => {
    setNewDebateForm(prev => ({
      ...prev,
      conArgs: prev.conArgs.filter((_, i) => i !== index)
    }))
  }

  // Validation handler functions
  const handleValidateProposition = async (proposition: string) => {
    if (!proposition.trim()) {
      setError('Please enter a proposition to validate')
      return
    }

    setValidationState(prev => ({ ...prev, isValidating: true }))
    setError(null)
    setValidationInput(proposition)

    try {
      const result = await validateProposition({ proposition })
      setValidationState(prev => ({
        result,
        iterationCount: prev.iterationCount + 1,
        showSuggestions: true,
        isValidating: false
      }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to validate proposition')
      setValidationState(prev => ({ ...prev, isValidating: false }))
      console.error('Error validating proposition:', err)
    }
  }

  const handleSelectSuggestion = async (suggestion: PropositionSuggestion) => {
    // Set selected proposition and proceed to topic creation
    setSelectedProposition(suggestion.proposition)
    setValidationState(prev => ({ ...prev, showSuggestions: false }))
    
    // Automatically trigger topic creation
    await handleCreateTopicWithProposition(suggestion.proposition)
  }

  const handleTryAgain = async (newInput: string) => {
    if (validationState.iterationCount >= 5) {
      setError('Maximum validation attempts reached. Please select a suggestion.')
      return
    }
    await handleValidateProposition(newInput)
  }

  const handleContinueWithOriginal = async () => {
    if (!validationState.result) return
    
    // Use original input as selected proposition
    setSelectedProposition(validationState.result.original_input)
    setValidationState(prev => ({ ...prev, showSuggestions: false }))
    
    // Proceed to topic creation
    await handleCreateTopicWithProposition(validationState.result.original_input)
  }

  const handleCancelValidation = () => {
    setValidationState({
      result: null,
      iterationCount: 0,
      showSuggestions: false,
      isValidating: false
    })
    setSelectedProposition(null)
    setValidationInput('')
    setError(null)
  }

  const handleCreateTopicWithProposition = async (proposition: string) => {
    setLoading(true)
    setError(null)

    try {
      // Validate that we have at least one argument total (either pro or con)
      if ((newDebateForm.proArgs.length === 0 || newDebateForm.proArgs.every(a => !a.title.trim() && !a.content.trim()))
          && (newDebateForm.conArgs.length === 0 || newDebateForm.conArgs.every(a => !a.title.trim() && !a.content.trim()))) {
        throw new Error('Please provide at least one pro or con argument')
      }

      // Create the topic with the selected proposition
      const topicResponse = await createTopic({
        proposition,
        created_by: newDebateForm.createdBy
      })

      const topicId = topicResponse.topic_id

      // Create pro arguments
      for (const arg of newDebateForm.proArgs) {
        if (arg.title.trim() && arg.content.trim()) {
          await createArgument(topicId, {
            side: 'pro',
            title: arg.title,
            content: arg.content,
            sources: arg.sources || undefined,
            author: newDebateForm.createdBy
          })
        }
      }

      // Create con arguments
      for (const arg of newDebateForm.conArgs) {
        if (arg.title.trim() && arg.content.trim()) {
          await createArgument(topicId, {
            side: 'con',
            title: arg.title,
            content: arg.content,
            sources: arg.sources || undefined,
            author: newDebateForm.createdBy
          })
        }
      }

      // Reset form and validation state
      setNewDebateForm({
        title: '',
        createdBy: 'user',
        proArgs: [{ title: '', content: '', sources: '' }],
        conArgs: [{ title: '', content: '', sources: '' }]
      })
      setValidationState({
        result: null,
        iterationCount: 0,
        showSuggestions: false,
        isValidating: false
      })
      setSelectedProposition(null)
      setValidationInput('')
      setView('browse')
      // Refresh topics list
      await fetchTopics()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create debate')
      console.error('Error creating debate:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitDebate = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // If proposition has been selected (from validation), proceed directly to topic creation
    if (selectedProposition) {
      await handleCreateTopicWithProposition(selectedProposition)
      return
    }

    // Otherwise, start validation flow
    if (!newDebateForm.title.trim()) {
      setError('Please enter a debate topic')
      return
    }

    await handleValidateProposition(newDebateForm.title)
  }

  const handleBackFromCreate = () => {
    setView('landing')
    setError(null)
    setValidationState({
      result: null,
      iterationCount: 0,
      showSuggestions: false,
      isValidating: false
    })
    setSelectedProposition(null)
    setValidationInput('')
    setNewDebateForm({
      title: '',
      createdBy: 'user',
      proArgs: [{ title: '', content: '', sources: '' }],
      conArgs: [{ title: '', content: '', sources: '' }]
    })
  }

  const handleAddArgument = async (side: 'pro' | 'con') => {
    if (!selectedTopicId) return

    setLoading(true)
    setError(null)
    setRejectionError(null)

    try {
      await createArgument(selectedTopicId, {
        side,
        title: newArgument.title,
        content: newArgument.content,
        sources: newArgument.sources || undefined,
        author: 'user' // Default username
      })

      // Reset form and refresh topic
      setNewArgument({ title: '', content: '', sources: '', side: 'pro' })
      setShowAddArgumentForm({ side: null })
      await fetchTopicDetails(selectedTopicId)
    } catch (err: any) {
      // Check if it's a 400 error (irrelevant argument rejection)
      if (err?.response?.status === 400 || err?.status === 400) {
        // Extract error detail - it might be nested in response.data.detail or directly in detail
        const errorDetail = err?.response?.data?.detail || err?.detail || {}
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
    } finally {
      setLoading(false)
    }
  }

  const handleVote = async (argumentId: number, voteType: 'upvote' | 'downvote') => {
    if (votingArgumentId === argumentId) return // Prevent double-clicking
    
    setVotingArgumentId(argumentId)
    setError(null)

    // Optimistic update
    if (selectedTopic) {
      const updatedTopic = { ...selectedTopic }
      const allArgs = [...updatedTopic.pro_arguments, ...updatedTopic.con_arguments]
      const arg = allArgs.find(a => a.id === argumentId)
      if (arg) {
        const oldVotes = arg.votes || 0
        arg.votes = voteType === 'upvote' ? oldVotes + 1 : oldVotes - 1
        setSelectedTopic(updatedTopic)
      }
    }

    try {
      const result = voteType === 'upvote' 
        ? await upvoteArgument(argumentId)
        : await downvoteArgument(argumentId)
      
      // Update with actual result
      if (selectedTopic) {
        const updatedTopic = { ...selectedTopic }
        const allArgs = [...updatedTopic.pro_arguments, ...updatedTopic.con_arguments]
        const arg = allArgs.find(a => a.id === argumentId)
        if (arg) {
          arg.votes = result.votes
          setSelectedTopic(updatedTopic)
        }
      }
    } catch (err) {
      // Revert optimistic update on error
      if (selectedTopic) {
        const updatedTopic = { ...selectedTopic }
        const allArgs = [...updatedTopic.pro_arguments, ...updatedTopic.con_arguments]
        const arg = allArgs.find(a => a.id === argumentId)
        if (arg) {
          const oldVotes = arg.votes || 0
          arg.votes = voteType === 'upvote' ? oldVotes - 1 : oldVotes + 1
          setSelectedTopic(updatedTopic)
        }
      }
      setError(err instanceof Error ? err.message : 'Failed to vote')
      console.error('Error voting:', err)
    } finally {
      setVotingArgumentId(null)
    }
  }

  const handleToggleComments = async (argumentId: number) => {
    setExpandedComments(prev => {
      const newSet = new Set(prev)
      if (newSet.has(argumentId)) {
        newSet.delete(argumentId)
      } else {
        newSet.add(argumentId)
        // Fetch comments when expanding
        if (!comments[argumentId]) {
          fetchCommentsForArgument(argumentId)
        }
      }
      return newSet
    })
  }

  const fetchCommentsForArgument = async (argumentId: number) => {
    setLoadingComments(prev => new Set(prev).add(argumentId))
    setError(null)
    try {
      const fetchedComments = await getComments(argumentId)
      setComments(prev => ({ ...prev, [argumentId]: fetchedComments }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch comments')
      console.error('Error fetching comments:', err)
    } finally {
      setLoadingComments(prev => {
        const newSet = new Set(prev)
        newSet.delete(argumentId)
        return newSet
      })
    }
  }

  const handleSubmitComment = async (argumentId: number) => {
    const commentText = commentTexts[argumentId]?.trim()
    if (!commentText) return

    setSubmittingCommentId(argumentId)
    setError(null)

    try {
      await commentOnArgument(argumentId, { comment: commentText })
      // Clear the comment text
      setCommentTexts(prev => {
        const newTexts = { ...prev }
        delete newTexts[argumentId]
        return newTexts
      })
      // Refresh comments to show the new one
      await fetchCommentsForArgument(argumentId)
      // Keep the comment section open to show the new comment
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to post comment')
      console.error('Error posting comment:', err)
    } finally {
      setSubmittingCommentId(null)
    }
  }


  if (view === 'createDebate') {
    return (
      <div className="relative min-h-screen overflow-hidden text-text-primary">
        <div className="fixed inset-0 bg-bg-primary -z-10" />
        <div className="fixed inset-0" style={{ zIndex: 0 }}>
          <ShaderBackground className="w-full h-full pointer-events-none" introDuration={2.5} />
        </div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.5, ease: "easeOut" }}
          className="fixed inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/60 pointer-events-none"
          style={{ zIndex: 1 }}
        />
        
        <div className="relative z-10 pt-32 pb-20 px-6 max-w-7xl mx-auto">
          <Button 
            className="btn-primary mb-8"
            onClick={handleBackFromCreate}
            disabled={loading}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 2 }}
            className="mb-12"
          >
            <h1 className="text-[clamp(2rem,4vw,3.5rem)] font-light leading-tight tracking-[-0.04em] mb-4">Create New Debate</h1>
            <p className="text-text-secondary text-lg">Start a structured discussion on any topic</p>
          </motion.div>

          {error && (
            <Card className="glass-panel border-accent-error/30 bg-accent-error/10 p-4 mb-6">
              <p className="text-accent-error">{error}</p>
            </Card>
          )}

          <motion.form
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 2.3 }}
            onSubmit={handleSubmitDebate}
            className="space-y-8"
          >
            {/* Topic Title */}
            <Card className="glass-panel p-8">
              <label className="block mb-3 text-lg font-semibold">Debate Topic</label>
              <Input
                required
                value={newDebateForm.title}
                onChange={(e) => setNewDebateForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., Should remote work be the default?"
                className="bg-black border-gray-700 text-white text-lg py-6"
              />
              <p className="text-sm text-text-tertiary mt-2">Frame as a clear question that has multiple valid perspectives</p>
            </Card>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Pro Arguments Column */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-6 bg-green-500 rounded-full" />
                    <h3 className="text-xl font-semibold text-green-500">Pro Arguments</h3>
                  </div>
                  <Button 
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleAddProArg}
                    className="border-green-500/30 hover:bg-green-950/30 text-green-500"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add
                  </Button>
                </div>

                <div className="space-y-4">
                  {newDebateForm.proArgs.map((arg, index) => (
                    <Card key={index} className="glass-panel p-6">
                      <div className="flex justify-between items-start mb-3">
                        <label className="text-sm font-medium text-green-400">Argument {index + 1}</label>
                        {newDebateForm.proArgs.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveProArg(index)}
                            className="text-text-tertiary hover:text-accent-error h-auto p-1"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                      <Input
                        value={arg.title}
                        onChange={(e) => {
                          const newProArgs = [...newDebateForm.proArgs]
                          newProArgs[index].title = e.target.value
                          setNewDebateForm(prev => ({ ...prev, proArgs: newProArgs }))
                        }}
                        placeholder="Argument title..."
                        className="mb-3"
                      />
                      <Textarea
                        value={arg.content}
                        onChange={(e) => {
                          const newProArgs = [...newDebateForm.proArgs]
                          newProArgs[index].content = e.target.value
                          setNewDebateForm(prev => ({ ...prev, proArgs: newProArgs }))
                        }}
                        placeholder="Describe the pro argument..."
                        className="bg-black/50 border-green-800/30 text-white mb-3 min-h-[100px]"
                      />
                      <Input
                        value={arg.sources}
                        onChange={(e) => {
                          const newProArgs = [...newDebateForm.proArgs]
                          newProArgs[index].sources = e.target.value
                          setNewDebateForm(prev => ({ ...prev, proArgs: newProArgs }))
                        }}
                        placeholder="Sources (optional)"
                        className="bg-black/50 border-green-800/30 text-white"
                      />
                    </Card>
                  ))}
                </div>
              </div>

              {/* Con Arguments Column */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-6 bg-rose-500 rounded-full" />
                    <h3 className="text-xl font-semibold text-rose-500">Con Arguments</h3>
                  </div>
                  <Button 
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleAddConArg}
                    className="border-rose-500/30 hover:bg-rose-950/30 text-rose-500"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add
                  </Button>
                </div>

                <div className="space-y-4">
                  {newDebateForm.conArgs.map((arg, index) => (
                    <Card key={index} className="glass-panel p-6">
                      <div className="flex justify-between items-start mb-3">
                        <label className="text-sm font-medium text-rose-400">Argument {index + 1}</label>
                        {newDebateForm.conArgs.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveConArg(index)}
                            className="text-text-tertiary hover:text-accent-error h-auto p-1"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                      <Input
                        value={arg.title}
                        onChange={(e) => {
                          const newConArgs = [...newDebateForm.conArgs]
                          newConArgs[index].title = e.target.value
                          setNewDebateForm(prev => ({ ...prev, conArgs: newConArgs }))
                        }}
                        placeholder="Argument title..."
                        className="mb-3"
                      />
                      <Textarea
                        value={arg.content}
                        onChange={(e) => {
                          const newConArgs = [...newDebateForm.conArgs]
                          newConArgs[index].content = e.target.value
                          setNewDebateForm(prev => ({ ...prev, conArgs: newConArgs }))
                        }}
                        placeholder="Describe the con argument..."
                        className="bg-black/50 border-rose-800/30 text-white mb-3 min-h-[100px]"
                      />
                      <Input
                        value={arg.sources}
                        onChange={(e) => {
                          const newConArgs = [...newDebateForm.conArgs]
                          newConArgs[index].sources = e.target.value
                          setNewDebateForm(prev => ({ ...prev, conArgs: newConArgs }))
                        }}
                        placeholder="Sources (optional)"
                        className="bg-black/50 border-rose-800/30 text-white"
                      />
                    </Card>
                  ))}
                </div>
              </div>
            </div>

            {/* Validation UI */}
            {validationState.showSuggestions && validationState.result && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <Card className="glass-panel p-6 border-2">
                  {/* Validation Status */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {validationState.result.is_valid ? (
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-green-500" />
                          <span className="text-green-400 font-semibold">Valid Proposition</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-red-500" />
                          <span className="text-red-400 font-semibold">Invalid Proposition</span>
                        </div>
                      )}
                    </div>
                    <span className="text-text-tertiary text-sm">
                      Attempt {validationState.iterationCount} of 5
                    </span>
                  </div>

                  {/* Interpretation */}
                  {validationState.result.interpretation && (
                    <div className="mb-4 p-4 bg-black/30 rounded-lg">
                      <p className="text-text-secondary text-sm">
                        <span className="font-semibold">Interpretation:</span> {validationState.result.interpretation}
                      </p>
                    </div>
                  )}

                  {/* Rejection Reason */}
                  {!validationState.result.is_valid && validationState.result.rejection_reason && (
                    <div className="mb-4 p-4 bg-red-950/20 border border-red-500/30 rounded-lg">
                      <p className="text-red-400 text-sm">
                        <span className="font-semibold">Rejection Reason:</span> {validationState.result.rejection_reason}
                      </p>
                    </div>
                  )}

                  {/* Suggestions */}
                  {validationState.result.suggestions.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold mb-3">
                        {validationState.result.is_valid ? 'Suggested Alternatives:' : 'Suggested Propositions:'}
                      </h3>
                      <div className="space-y-3">
                        {validationState.result.suggestions.map((suggestion, index) => {
                          const typeColors = {
                            policy: 'bg-blue-500/20 border-blue-500/30 text-blue-400',
                            value: 'bg-purple-500/20 border-purple-500/30 text-purple-400',
                            fact: 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400'
                          }
                          return (
                            <Card key={index} className="glass-panel p-4 border">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className={`px-2 py-1 rounded text-xs font-semibold ${typeColors[suggestion.type] || typeColors.policy}`}>
                                      {suggestion.type.toUpperCase()}
                                    </span>
                                  </div>
                                  <p className="text-text-primary">{suggestion.proposition}</p>
                                </div>
                                <Button
                                  onClick={() => handleSelectSuggestion(suggestion)}
                                  disabled={loading}
                                  className="btn-primary whitespace-nowrap"
                                >
                                  Use This
                                </Button>
                              </div>
                            </Card>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* User Actions */}
                  <div className="space-y-4 pt-4 border-t border-gray-700">
                    {/* Try Again Section */}
                    {validationState.iterationCount < 5 ? (
                      <div>
                        <label className="block text-sm font-semibold mb-2">Try Again:</label>
                        <div className="flex gap-2">
                          <Input
                            value={validationInput || validationState.result.original_input}
                            onChange={(e) => setValidationInput(e.target.value)}
                            placeholder="Enter a new proposition..."
                            className="flex-1 bg-black/50 border-gray-700 text-white"
                            disabled={loading || validationState.isValidating}
                          />
                          <Button
                            onClick={() => handleTryAgain(validationInput || validationState.result.original_input)}
                            disabled={loading || validationState.isValidating || !(validationInput || validationState.result.original_input).trim()}
                            variant="outline"
                          >
                            {validationState.isValidating ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Validating...
                              </>
                            ) : (
                              'Re-validate'
                            )}
                          </Button>
                        </div>
                        <p className="text-xs text-text-tertiary mt-1">
                          {5 - validationState.iterationCount} attempts remaining
                        </p>
                      </div>
                    ) : (
                      <div className="p-4 bg-yellow-950/20 border border-yellow-500/30 rounded-lg">
                        <p className="text-yellow-400 text-sm">
                          Maximum validation attempts reached. Please select one of the suggestions above.
                        </p>
                      </div>
                    )}

                    {/* Continue with Original (only if valid) */}
                    {validationState.result.is_valid && (
                      <Button
                        onClick={handleContinueWithOriginal}
                        disabled={loading}
                        variant="outline"
                        className="w-full"
                      >
                        Continue with Original Proposition
                      </Button>
                    )}

                    {/* Cancel */}
                    <Button
                      onClick={handleCancelValidation}
                      disabled={loading || validationState.isValidating}
                      variant="ghost"
                      className="w-full"
                    >
                      Cancel
                    </Button>
                  </div>
                </Card>
              </motion.div>
            )}

            {/* Submit Button */}
            <div className="flex justify-end gap-4 pt-6">
              <Button 
                type="button"
                variant="outline" 
                onClick={handleBackFromCreate}
                className="px-8 py-6"
                disabled={loading || validationState.isValidating}
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={loading || validationState.isValidating || validationState.showSuggestions}
                className="btn-primary px-8 py-6 disabled:opacity-50"
              >
                {validationState.isValidating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Validating...
                  </>
                ) : loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Debate'
                )}
              </Button>
            </div>
          </motion.form>
        </div>
      </div>
    )
  }

  if (view === 'browse') {
    return (
      <div className="relative min-h-screen overflow-hidden text-text-primary">
        <div className="fixed inset-0 bg-bg-primary -z-10" />
        <div className="fixed inset-0" style={{ zIndex: 0 }}>
          <ShaderBackground className="w-full h-full pointer-events-none" introDuration={2.5} />
        </div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.5, ease: "easeOut" }}
          className="fixed inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/60 pointer-events-none"
          style={{ zIndex: 1 }}
        />
        
        <div className="relative z-10 pt-32 pb-20 px-6 max-w-7xl mx-auto">
          <Button 
            className="btn-primary mb-8"
            onClick={handleBackToLanding}
            disabled={loading}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 2 }}
            className="flex justify-between items-center mb-12"
          >
            <div>
              <h1 className="text-[clamp(2rem,4vw,3.5rem)] font-light leading-tight tracking-[-0.04em] mb-4">Browse Topics</h1>
              <p className="text-text-secondary text-lg">Explore ongoing debates and contribute your perspective</p>
            </div>
            <Button 
              onClick={handleStartDebate}
              className="btn-primary"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Topic
            </Button>
          </motion.div>

          {error && (
            <Card className="glass-panel border-accent-error/30 bg-accent-error/10 p-4 mb-6">
              <p className="text-accent-error">{error}</p>
            </Card>
          )}

          {/* Search Input */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 2.2 }}
            className="mb-8"
          >
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-text-tertiary pointer-events-none z-10" />
              <Input
                type="text"
                placeholder="Search topics..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 py-6 text-lg bg-black/50 border-white/20 focus-visible:ring-white/30 relative z-0"
              />
            </div>
          </motion.div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-white" />
            </div>
          ) : (() => {
            // Filter topics based on search query
            const filteredTopics = searchQuery.trim() === '' 
              ? topics 
              : topics.filter(topic => 
                  topic.proposition.toLowerCase().includes(searchQuery.toLowerCase())
                )
            
            if (filteredTopics.length === 0) {
              return (
                <Card className="glass-panel p-12 text-center">
                  {searchQuery.trim() === '' ? (
                    <>
                      <p className="text-text-secondary text-lg mb-4">No topics yet. Be the first to start a debate!</p>
                      <Button 
                        onClick={handleStartDebate}
                        className="btn-primary"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Create First Topic
                      </Button>
                    </>
                  ) : (
                    <>
                      <p className="text-text-secondary text-lg mb-4">No topics found matching "{searchQuery}"</p>
                      <Button 
                        onClick={() => setSearchQuery('')}
                        variant="outline"
                        className="mt-4"
                      >
                        Clear Search
                      </Button>
                    </>
                  )}
                </Card>
              )
            }

            return (
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 2.3 }}
                className="space-y-6"
              >
                {filteredTopics.map((topic, index) => (
                <motion.div
                  key={topic.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 2.4 + 0.1 * index, ease: [0.16, 1, 0.3, 1] }}
                >
                  <Card 
                    className="card card-hover p-8 cursor-pointer"
                    onClick={() => handleSelectTopic(topic)}
                  >
                  <h3 className="text-2xl font-semibold mb-4">{topic.proposition}</h3>
                  <div className="space-y-3">
                    {/* Argument counts - always show */}
                    <div className="flex gap-6 text-sm">
                      <span className="flex items-center gap-2 text-green-400">
                        <div className="w-2 h-2 bg-green-500 rounded-full" />
                        <span className="font-semibold">{topic.pro_count}</span> PRO
                      </span>
                      <span className="flex items-center gap-2 text-rose-400">
                        <div className="w-2 h-2 bg-rose-500 rounded-full" />
                        <span className="font-semibold">{topic.con_count}</span> CON
                      </span>
                      {topic.controversy_level && (
                        <span className={`flex items-center gap-1.5 text-xs px-2 py-0.5 rounded ${
                          topic.controversy_level === 'Highly Contested' 
                            ? 'bg-red-500/20 text-red-400' 
                            : topic.controversy_level === 'Moderately Contested'
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : 'bg-green-500/20 text-green-400'
                        }`}>
                          {topic.controversy_level === 'Highly Contested' && '🔥'}
                          {topic.controversy_level}
                        </span>
                      )}
                    </div>
                    {/* Validity scores - show if available */}
                    {(topic.pro_avg_validity !== null && topic.pro_avg_validity !== undefined) || 
                     (topic.con_avg_validity !== null && topic.con_avg_validity !== undefined) ? (
                      <div className="flex gap-6 text-xs text-text-tertiary">
                        {topic.pro_avg_validity !== null && topic.pro_avg_validity !== undefined && (
                          <span className="flex items-center gap-1.5">
                            <span className="text-green-400">PRO:</span>
                            <div className="flex items-center gap-0.5">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`w-3 h-3 ${
                                    i < Math.round(topic.pro_avg_validity!)
                                      ? 'fill-yellow-400 text-yellow-400'
                                      : 'text-gray-600 fill-transparent'
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-text-tertiary">({topic.pro_avg_validity})</span>
                          </span>
                        )}
                        {topic.con_avg_validity !== null && topic.con_avg_validity !== undefined && (
                          <span className="flex items-center gap-1.5">
                            <span className="text-rose-400">CON:</span>
                            <div className="flex items-center gap-0.5">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`w-3 h-3 ${
                                    i < Math.round(topic.con_avg_validity!)
                                      ? 'fill-yellow-400 text-yellow-400'
                                      : 'text-gray-600 fill-transparent'
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-text-tertiary">({topic.con_avg_validity})</span>
                          </span>
                        )}
                      </div>
                    ) : (
                      topic.pro_count > 0 && topic.con_count > 0 && (
                        <span className="flex items-center gap-2 text-xs text-text-tertiary">
                          <Brain className="w-3 h-3 text-purple-400" />
                          Not verified yet
                        </span>
                      )
                    )}
                  </div>
                </Card>
                </motion.div>
                ))}
              </motion.div>
            )
          })()}
        </div>
      </div>
    )
  }

  if (view === 'topic') {
    if (loading && !selectedTopic) {
      return (
        <div className="relative min-h-screen overflow-hidden text-text-primary flex flex-col items-center justify-center gap-4">
          <div className="fixed inset-0 bg-bg-primary -z-10" />
          <div className="fixed inset-0" style={{ zIndex: 0 }}>
            <ShaderBackground className="w-full h-full pointer-events-none" introDuration={2.5} />
          </div>
          <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
          <p className="text-text-secondary text-lg">Verifying arguments and generating analysis...</p>
          <p className="text-text-tertiary text-sm">This may take 30-60 seconds on first load</p>
        </div>
      )
    }

    if (!selectedTopic) {
      return (
        <div className="relative min-h-screen overflow-hidden text-text-primary">
          <div className="fixed inset-0 bg-bg-primary -z-10" />
          <div className="relative z-10 pt-32 pb-20 px-6 max-w-7xl mx-auto">
            <Button 
              variant="ghost" 
              className="text-text-tertiary hover:text-white mb-8"
              onClick={handleBackToBrowse}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Topics
            </Button>
            <Card className="glass-panel p-12 text-center">
              <p className="text-text-secondary text-lg">Topic not found</p>
            </Card>
          </div>
        </div>
      )
    }

    return (
      <div className="relative min-h-screen overflow-hidden text-text-primary">
        <div className="fixed inset-0 bg-bg-primary -z-10" />
        <div className="fixed inset-0" style={{ zIndex: 0 }}>
          <ShaderBackground className="w-full h-full pointer-events-none" introDuration={2.5} />
        </div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.5, ease: "easeOut" }}
          className="fixed inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/60 pointer-events-none"
          style={{ zIndex: 1 }}
        />
        
        <div className="relative z-10 pt-32 pb-20 px-6 max-w-7xl mx-auto">
          <Button 
            variant="ghost" 
            className="text-text-tertiary hover:text-white mb-8"
            onClick={handleBackToBrowse}
            disabled={loading}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Topics
          </Button>

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

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 2 }}
            className="mb-12"
          >
            <div className="flex items-center gap-3 mb-4">
              <span className="font-mono text-sm text-text-tertiary uppercase tracking-[0.3em]">Topic</span>
            </div>
            <div>
              <h1 className="text-[clamp(2rem,4vw,3.5rem)] font-light leading-tight tracking-[-0.04em]">{selectedTopic.proposition}</h1>
              <p className="text-sm text-text-tertiary mt-2">Arguments sorted by validity (highest quality first)</p>
            </div>
          </motion.div>

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
                  // Debug: log argument data
                  if (process.env.NODE_ENV === 'development') {
                    console.log('Pro argument:', arg.id, 'validity_score:', arg.validity_score, 'validity_reasoning:', arg.validity_reasoning)
                  }
                  
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
                  // Debug: log argument data
                  if (process.env.NODE_ENV === 'development') {
                    console.log('Con argument:', arg.id, 'validity_score:', arg.validity_score, 'validity_reasoning:', arg.validity_reasoning)
                  }
                  
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
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 2.3 }}
          >
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
                <Loader2 className="w-4 h-4 animate-spin" />
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
          </motion.div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen overflow-hidden text-text-primary">
      {/* Background */}
      <div className="fixed inset-0 bg-bg-primary -z-10" />
      
      {/* Shader Background */}
      <div className="fixed inset-0" style={{ zIndex: 0 }}>
        <ShaderBackground className="w-full h-full pointer-events-none" introDuration={2.5} />
      </div>
      
      {/* Gradient Overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 1.5, ease: "easeOut" }}
        className="fixed inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/60 pointer-events-none"
        style={{ zIndex: 1 }}
      />
      
      {/* Hero Section */}
      <main className="relative z-10 pt-32 pb-20 px-6">
        <div className="mx-auto max-w-4xl space-y-16">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 2 }}
            className="text-center space-y-6"
          >
            <p className="text-xl uppercase tracking-[0.4em] text-text-tertiary">
              Debately
            </p>
            <h1 className="text-[clamp(2rem,4.5vw,3.5rem)] font-light leading-tight tracking-[-0.04em]">
              AI-powered debate platform for <span className="text-white">structured discourse</span>.
            </h1>
            <p className="text-text-secondary text-lg">
              Create topics, contribute arguments, let AI synthesize understanding. The resilient platform for structured debate.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 2.3, ease: "easeOut" }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            <Button 
              size="lg" 
              className="btn-primary text-lg px-8 py-6 rounded-full"
              onClick={handleStartDebate}
            >
              Start a Debate
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="text-lg px-8 py-6 rounded-full"
              onClick={handleBrowseTopics}
            >
              Browse Topics
            </Button>
          </motion.div>

          {/* Features Section */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 2.5, ease: [0.16, 1, 0.3, 1] }}
            className="grid gap-6 md:grid-cols-3"
          >
            {[
              {
                number: "01",
                title: "Community-Driven Arguments",
                description: "Every topic starts with real perspectives. Users contribute pro and con arguments with sources."
              },
              {
                number: "02",
                title: "AI Synthesis",
                description: "Claude analyzes all arguments to generate summaries, identify consensus, and track how debates evolve."
              },
              {
                number: "03",
                title: "Structured Discourse",
                description: "Balanced presentation prevents echo chambers. See both sides, understand the nuances."
              }
            ].map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 2.6 + 0.15 * index, ease: [0.16, 1, 0.3, 1] }}
                className="card card-hover text-left p-8"
              >
                <p className="text-sm uppercase tracking-[0.3em] text-text-tertiary mb-3">
                  {feature.number}
                </p>
                <h3 className="text-xl font-light mb-2">{feature.title}</h3>
                <p className="text-text-secondary text-sm">{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </main>

    </div>
  )
}

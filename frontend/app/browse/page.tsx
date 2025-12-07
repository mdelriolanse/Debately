'use client'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Header } from '@/components/Header'
import { useAuth } from '@/contexts/AuthContext'
import { ArrowLeft, Plus, Loader2, Star, Brain, Search } from 'lucide-react'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { 
  getTopics, 
  type TopicListItem 
} from '@/src/api'

export default function BrowsePage() {
  const router = useRouter()
  const { user, loading: authLoading, signIn } = useAuth()
  const [topics, setTopics] = useState<TopicListItem[]>([])
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  useEffect(() => {
    fetchTopics()
  }, [])

  return (
    <div className="relative min-h-screen overflow-hidden text-text-primary">
      <Header />
      <div className="relative z-10 pt-32 pb-20 px-6 max-w-7xl mx-auto">
        <Link href="/">
          <Button 
            variant="outline"
            className="mb-8 rounded-full border-white/20 hover:bg-white/10 hover:text-white text-text-secondary"
            disabled={loading}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </Link>

        <div className="flex justify-between items-center mb-12">
          <div>
            <h1 className="text-[clamp(2rem,4vw,3.5rem)] font-light leading-tight tracking-[-0.04em] mb-4">Browse Topics</h1>
            <p className="text-text-secondary text-lg">Explore ongoing debates and contribute your perspective</p>
          </div>
          {!authLoading && !user ? (
            <Button className="btn-primary" onClick={signIn}>
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Start with Google
            </Button>
          ) : (
            <Link href="/new">
              <Button className="btn-primary">
                <Plus className="w-4 h-4 mr-2" />
                New Topic
              </Button>
            </Link>
          )}
        </div>

        {error && (
          <Card className="glass-panel border-accent-error/30 bg-accent-error/10 p-4 mb-6">
            <p className="text-accent-error">{error}</p>
          </Card>
        )}

        {/* Search Input */}
        <div className="mb-8">
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
        </div>

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
                  <p className="text-text-secondary text-lg">No topics yet. Be the first to start a debate!</p>
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
            <div className="space-y-6">
              {filteredTopics.map((topic, index) => (
              <div key={topic.id}>
                <Card 
                  className="card card-hover p-8 cursor-pointer"
                  onClick={() => router.push(`/topic/${topic.id}`)}
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
                    {topic.controversy_level && (topic.pro_count + topic.con_count) > 6 && (
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
              </div>
              ))}
            </div>
          )
        })()}
      </div>
    </div>
  )
}


'use client'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { AuroraBackground } from '@/components/AuroraBackground'
import { ArrowLeft, Plus, Loader2, Star, Brain, Search } from 'lucide-react'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { 
  getTopics, 
  type TopicListItem 
} from '@/src/api'

export default function BrowsePage() {
  const router = useRouter()
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
      <div className="fixed inset-0 bg-bg-primary -z-10" />
      <div className="fixed inset-0" style={{ zIndex: 0 }}>
        <AuroraBackground />
      </div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 1.5, ease: "easeOut" }}
        className="fixed inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/60 pointer-events-none"
        style={{ zIndex: 1 }}
      />
      
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
          <Link href="/new">
            <Button className="btn-primary">
              <Plus className="w-4 h-4 mr-2" />
              New Topic
            </Button>
          </Link>
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
                    <Link href="/new">
                      <Button className="btn-primary">
                        <Plus className="w-4 h-4 mr-2" />
                        Create First Topic
                      </Button>
                    </Link>
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


'use client'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { AuroraBackground } from '@/components/AuroraBackground'
import { ArrowLeft, Plus, X, Loader2 } from 'lucide-react'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { 
  createTopic, 
  createArgument, 
  validateProposition,
  type PropositionValidationResponse,
  type PropositionSuggestion
} from '@/src/api'

// Bank of example propositions for the Create New Debate page
const PROPOSITION_EXAMPLES = [
  "Universal basic income would reduce poverty.",
  "Remote work should be the default for office jobs.",
  "Social media has done more harm than good to society.",
  "Nuclear energy is essential for addressing climate change.",
  "Artificial intelligence will create more jobs than it eliminates.",
  "College education should be free for all citizens.",
  "Standardized testing is an ineffective measure of student ability.",
  "Space exploration funding should be increased significantly.",
  "Cryptocurrencies will eventually replace traditional currencies.",
  "Zoos are unethical and should be abolished.",
  "Voting should be mandatory for all eligible citizens.",
  "Genetically modified foods are safe for human consumption.",
  "The minimum wage should be raised to a living wage.",
  "Video games contribute to violent behavior in youth.",
  "Single-payer healthcare would improve outcomes in the United States."
]

export default function NewDebatePage() {
  const router = useRouter()
  
  // Random proposition example for the create debate form
  const [propositionExample, setPropositionExample] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newDebateForm, setNewDebateForm] = useState({
    title: '',
    createdBy: 'user',
    proArgs: [{ title: '', content: '', sources: '' }],
    conArgs: [{ title: '', content: '', sources: '' }]
  })
  
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
  const [validationInput, setValidationInput] = useState<string | null>(null)

  // Set random example on mount
  useEffect(() => {
    setPropositionExample(PROPOSITION_EXAMPLES[Math.floor(Math.random() * PROPOSITION_EXAMPLES.length)])
  }, [])

  // Handlers
  const handleAddProArg = () => {
    setNewDebateForm(prev => ({
      ...prev,
      proArgs: [...prev.proArgs, { title: '', content: '', sources: '' }]
    }))
  }

  const handleRemoveProArg = (index: number) => {
    setNewDebateForm(prev => ({
      ...prev,
      proArgs: prev.proArgs.filter((_, i) => i !== index)
    }))
  }

  const handleAddConArg = () => {
    setNewDebateForm(prev => ({
      ...prev,
      conArgs: [...prev.conArgs, { title: '', content: '', sources: '' }]
    }))
  }

  const handleRemoveConArg = (index: number) => {
    setNewDebateForm(prev => ({
      ...prev,
      conArgs: prev.conArgs.filter((_, i) => i !== index)
    }))
  }

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

  const handleSelectSuggestion = (suggestion: PropositionSuggestion) => {
    // Set selected proposition - UI will now show confirmed state with argument sections
    setSelectedProposition(suggestion.proposition)
    setValidationState(prev => ({ ...prev, showSuggestions: false }))
  }

  const handleTryAgain = async (newInput: string) => {
    if (validationState.iterationCount >= 5) {
      setError('Maximum validation attempts reached. Please select a suggestion.')
      return
    }
    await handleValidateProposition(newInput)
  }

  const handleContinueWithOriginal = () => {
    if (!validationState.result) return
    
    // Use original input as selected proposition - UI will now show confirmed state with argument sections
    setSelectedProposition(validationState.result.original_input)
    setValidationState(prev => ({ ...prev, showSuggestions: false }))
  }

  const handleCancelValidation = () => {
    setValidationState({
      result: null,
      iterationCount: 0,
      showSuggestions: false,
      isValidating: false
    })
    setSelectedProposition(null)
    setValidationInput(null)
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
          await createArgument({
            topic_id: topicId,
            title: arg.title,
            content: arg.content,
            sources: arg.sources || undefined,
            side: 'pro',
            author: newDebateForm.createdBy
          })
        }
      }

      // Create con arguments
      for (const arg of newDebateForm.conArgs) {
        if (arg.title.trim() && arg.content.trim()) {
          await createArgument({
            topic_id: topicId,
            title: arg.title,
            content: arg.content,
            sources: arg.sources || undefined,
            side: 'con',
            author: newDebateForm.createdBy
          })
        }
      }

      // Reset form and navigate to browse
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
      setValidationInput(null)
      
      // Navigate to the new topic
      router.push(`/topic/${topicId}`)
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
    router.push('/')
  }

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
          {/* Proposition Section */}
          {selectedProposition ? (
            /* Confirmed Proposition - Read Only */
            <Card className="glass-panel p-8 border-2 border-green-500/30">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-green-400 font-semibold text-sm uppercase tracking-wider">Confirmed Proposition</span>
              </div>
              <p className="text-xl text-text-primary">{selectedProposition}</p>
            </Card>
          ) : (
            /* Editable Proposition Input */
            <Card className="glass-panel p-8">
              <label className="block mb-3 text-lg font-semibold">Write a statement that takes a position.</label>
              <Input
                required
                value={newDebateForm.title}
                onChange={(e) => setNewDebateForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder={propositionExample ? `e.g., ${propositionExample}` : 'e.g., Universal basic income would reduce poverty.'}
                className="bg-black border-gray-700 text-white text-lg py-6"
                disabled={validationState.showSuggestions || validationState.isValidating}
              />
            </Card>
          )}

          {/* Pro/Con Arguments - Only show after proposition is confirmed */}
          {selectedProposition && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="grid md:grid-cols-2 gap-6"
            >
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
            </motion.div>
          )}

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
                        const typeColors: Record<string, string> = {
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
                                type="button"
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
                          value={validationInput ?? validationState.result.original_input}
                          onChange={(e) => setValidationInput(e.target.value)}
                          placeholder="Enter a new proposition..."
                          className="flex-1 bg-black/50 border-gray-700 text-white"
                          disabled={loading || validationState.isValidating}
                        />
                        <Button
                          type="button"
                          onClick={() => handleTryAgain(validationInput ?? validationState.result!.original_input)}
                          disabled={loading || validationState.isValidating || !(validationInput ?? validationState.result.original_input).trim()}
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
                      type="button"
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
                    type="button"
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
                'Continue'
              )}
            </Button>
          </div>
        </motion.form>
      </div>
    </div>
  )
}


'use client'

import { Button } from '@/components/ui/button'
import { AuroraBackground } from '@/components/AuroraBackground'
import { motion } from 'framer-motion'
import Link from 'next/link'

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden text-text-primary">
      {/* Background */}
      <div className="fixed inset-0 bg-bg-primary -z-10" />
      
      {/* Aurora Background */}
      <div className="fixed inset-0" style={{ zIndex: 0 }}>
        <AuroraBackground />
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
            <Link href="/new">
              <Button 
                size="lg" 
                className="btn-primary text-lg px-8 py-6 rounded-full"
              >
                Start a Debate
              </Button>
            </Link>
            <Link href="/browse">
              <Button 
                size="lg" 
                variant="outline" 
                className="text-lg px-8 py-6 rounded-full"
              >
                Browse Topics
              </Button>
            </Link>
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

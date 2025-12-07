'use client'

import { Button } from '@/components/ui/button'
import { Header } from '@/components/Header'
import { useAuth } from '@/contexts/AuthContext'
import Link from 'next/link'

export default function Home() {
  const { user, loading, signIn } = useAuth()

  return (
    <div className="relative min-h-screen overflow-hidden text-text-primary">
      <Header />
      
      {/* Hero Section */}
      <main className="relative z-10 pt-32 pb-20 px-6">
        <div className="mx-auto max-w-4xl space-y-16">
          <div className="text-center space-y-6">
            <div className="flex items-center justify-center gap-0">
              {/* <Image 
                src="/logo-icon.png" 
                alt="Debately logo" 
                width={110} 
                height={100}
                className="opacity-100"
              /> */}
              <p className="text-5xl text-white/100 font-[var(--font-dm-sans)] font-bold">
                debately.
              </p>
            </div>
            <h1 className="text-[clamp(2rem,4.5vw,3.5rem)] font-light leading-tight tracking-[-0.04em]">
              AI-powered debate platform for <span className="text-white">structured discourse</span>.
            </h1>
            <p className="text-text-secondary text-lg">
              Create topics, contribute arguments, let AI synthesize understanding. The resilient platform for structured debate.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            {!loading && !user ? (
              <Button 
                size="lg" 
                className="btn-primary text-lg px-8 py-6 rounded-full"
                onClick={signIn}
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Start with Google
              </Button>
            ) : (
              <Link href="/new">
                <Button 
                  size="lg" 
                  className="btn-primary text-lg px-8 py-6 rounded-full"
                >
                  Start a Debate
                </Button>
              </Link>
            )}
            <Link href="/browse">
              <Button 
                size="lg" 
                variant="outline" 
                className="text-lg px-8 py-6 rounded-full"
              >
                Browse Topics
              </Button>
            </Link>
          </div>

          {/* Features Section */}
          <div className="grid gap-6 md:grid-cols-3">
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
              <div
                key={feature.title}
                className="card card-hover text-left p-8"
              >
                <p className="text-sm uppercase tracking-[0.3em] text-text-tertiary mb-3">
                  {feature.number}
                </p>
                <h3 className="text-xl font-light mb-2">{feature.title}</h3>
                <p className="text-text-secondary text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}

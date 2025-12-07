'use client'

import { AuroraProvider } from '@/contexts/AuroraContext'
import { AuroraBackground } from '@/components/AuroraBackground'

export function GlobalAurora({ children }: { children: React.ReactNode }) {
  return (
    <AuroraProvider>
      {/* Persistent Aurora Background */}
      <div className="fixed inset-0 bg-bg-primary -z-10" />
      <div className="fixed inset-0" style={{ zIndex: 0 }}>
        <AuroraBackground />
      </div>
      <div
        className="fixed inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/60 pointer-events-none"
        style={{ zIndex: 1 }}
      />
      {children}
    </AuroraProvider>
  )
}


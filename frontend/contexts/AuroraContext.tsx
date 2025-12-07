'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'

type AuroraVariant = 'home' | 'browse' | 'new' | 'topic'

interface AuroraContextType {
  variant: AuroraVariant
}

const AuroraContext = createContext<AuroraContextType | undefined>(undefined)

function getVariantFromPath(pathname: string): AuroraVariant {
  if (pathname === '/') return 'home'
  if (pathname === '/browse') return 'browse'
  if (pathname === '/new') return 'new'
  if (pathname.startsWith('/topic/')) return 'topic'
  return 'home'
}

export function AuroraProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [variant, setVariant] = useState<AuroraVariant>('home')

  useEffect(() => {
    setVariant(getVariantFromPath(pathname))
  }, [pathname])

  return (
    <AuroraContext.Provider value={{ variant }}>
      {children}
    </AuroraContext.Provider>
  )
}

export function useAurora() {
  const context = useContext(AuroraContext)
  if (context === undefined) {
    throw new Error('useAurora must be used within an AuroraProvider')
  }
  return context
}


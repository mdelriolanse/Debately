'use client'

import { useAuth } from '@/contexts/AuthContext'
import { UserMenu } from '@/components/auth/UserMenu'

export function Header() {
  const { user, loading } = useAuth()

  // Only show header when user is logged in
  if (loading || !user) {
    return null
  }

  return (
    <header className="fixed top-0 right-0 z-50 p-4 pr-8">
      <UserMenu />
    </header>
  )
}





'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User, Session } from '@supabase/supabase-js'
import { logout as apiLogout, deleteAccount as apiDeleteAccount } from '@/src/api'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signIn: () => Promise<void>
  signOut: () => Promise<void>
  deleteAccount: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  const signIn = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) {
      console.error('Error signing in:', error)
    }
  }

  const signOut = async () => {
    try {
      // Call backend logout endpoint for consistency with login flow
      await apiLogout()
    } catch (err) {
      // Continue with client-side logout even if backend call fails
      console.error('Error calling backend logout:', err)
    }
    
    // Sign out from Supabase (client-side)
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('Error signing out:', error)
    }
  }

  const deleteAccount = async () => {
    try {
      // Delete account from backend first
      await apiDeleteAccount()
    } catch (err) {
      console.error('Error deleting account from backend:', err)
      throw err // Re-throw so UI can handle the error
    }
    
    // Sign out from Supabase (client-side)
    // Note: We don't delete the Supabase auth user - that would require admin privileges
    // The backend profile deletion is the main cleanup
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('Error signing out after account deletion:', error)
    }
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signOut, deleteAccount }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}





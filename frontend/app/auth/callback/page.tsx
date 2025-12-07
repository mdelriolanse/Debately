'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'

export default function AuthCallback() {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const { data, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Auth callback error:', error)
          router.push('/?error=auth_failed')
          return
        }

        if (data.session) {
          // Sync user profile with backend
          try {
            const response = await fetch('http://localhost:8000/api/auth/sync-profile', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${data.session.access_token}`,
              },
            })
            
            if (!response.ok) {
              console.error('Failed to sync profile:', await response.text())
            }
          } catch (err) {
            console.error('Error syncing profile:', err)
          }

          // Redirect to home page
          router.push('/')
        } else {
          router.push('/?error=no_session')
        }
      } catch (err) {
        console.error('Unexpected error:', err)
        router.push('/?error=unexpected')
      }
    }

    handleAuthCallback()
  }, [router, supabase])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center space-y-4">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-white" />
      </div>
    </div>
  )
}





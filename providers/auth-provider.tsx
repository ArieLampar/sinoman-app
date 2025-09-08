'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
})

export function useAuthContext() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider')
  }
  return context
}

export function AuthProvider({ 
  children,
  initialUser,
  initialSession,
}: {
  children: React.ReactNode
  initialUser?: User | null
  initialSession?: Session | null
}) {
  const [user, setUser] = useState<User | null>(initialUser ?? null)
  const [session, setSession] = useState<Session | null>(initialSession ?? null)
  const [loading, setLoading] = useState(!initialUser)
  
  const supabase = createClient()

  useEffect(() => {
    // Only get session if we don't have initial data
    if (!initialUser && !initialSession) {
      const getInitialSession = async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession()
          setSession(session)
          setUser(session?.user ?? null)
        } catch (error) {
          console.error('Error getting initial session:', error)
        } finally {
          setLoading(false)
        }
      }

      getInitialSession()
    } else {
      setLoading(false)
    }

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
      
      // Optional: Handle specific events
      switch (event) {
        case 'SIGNED_IN':
          console.log('User signed in')
          break
        case 'SIGNED_OUT':
          console.log('User signed out')
          break
        case 'TOKEN_REFRESHED':
          console.log('Token refreshed')
          break
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [initialUser, initialSession, supabase])

  const value = {
    user,
    session,
    loading,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
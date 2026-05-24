'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import type { Database, UserRole } from '@/lib/supabase/types'

type Profile = Database['public']['Tables']['profiles']['Row']

interface AuthState {
  user: User | null
  profile: Profile | null
  role: UserRole | null
  loading: boolean
  isAdmin: boolean
  isClient: boolean
  isSupplier: boolean
  isAuditor: boolean
  orgId: string | null  // org owner's profile id (for team members, this differs from profile.id)
}

/**
 * Central auth hook. Replaces useAuth from convex/auth + requireClient/requireAdmin guards.
 *
 * Usage:
 *   const { user, profile, role, orgId, isClient, loading } = useAuth()
 */
export function useAuth(): AuthState & {
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
} {
  const supabase = createClient()
  const router = useRouter()

  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single()
    setProfile(data ?? null)
  }, [])

  useEffect(() => {
    // Initial session check
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      setUser(user ?? null)
      if (user) await loadProfile(user.id)
      setLoading(false)
    })

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const currentUser = session?.user ?? null
        setUser(currentUser)
        if (currentUser) {
          await loadProfile(currentUser.id)
        } else {
          setProfile(null)
        }
        setLoading(false)
      },
    )

    return () => subscription.unsubscribe()
  }, [loadProfile])

  const signIn = useCallback(
    async (email: string, password: string): Promise<{ error: string | null }> => {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) return { error: error.message }
      return { error: null }
    },
    [],
  )

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }, [router])

  const role = (profile?.role ?? null) as UserRole | null

  return {
    user,
    profile,
    role,
    loading,
    isAdmin: role === 'ADMIN',
    isClient: role === 'CLIENT',
    isSupplier: role === 'SUPPLIER',
    isAuditor: role === 'AUDITOR',
    // Resolve org id: team members point to parent, owners use their own id
    orgId: profile?.parent_client_id ?? profile?.id ?? null,
    signIn,
    signOut,
  }
}

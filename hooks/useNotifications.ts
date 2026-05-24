'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/types'

type Notification = Database['public']['Tables']['notifications']['Row']

/**
 * Subscribes to the current user's notifications in real-time.
 * Replaces the Convex useQuery(api.notifications.listMine) pattern.
 *
 * Returns:
 *  - notifications: sorted newest-first
 *  - unreadCount: number of unread
 *  - markRead: marks one notification as read
 *  - markAllRead: marks all as read
 */
export function useNotifications() {
  const supabase = createClient()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [profileId, setProfileId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Get current profile id
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single()
      if (data) setProfileId((data as { id: string }).id)
    })
  }, [])

  // Initial load
  useEffect(() => {
    if (!profileId) return
    setLoading(true)
    supabase
      .from('notifications')
      .select('*')
      .eq('user_id', profileId)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        setNotifications(data ?? [])
        setLoading(false)
      })
  }, [profileId])

  // Real-time subscription
  useEffect(() => {
    if (!profileId) return

    const channel = supabase
      .channel(`notifications:${profileId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${profileId}`,
        },
        (payload) => {
          setNotifications((prev) => [payload.new as Notification, ...prev])
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${profileId}`,
        },
        (payload) => {
          setNotifications((prev) =>
            prev.map((n) =>
              n.id === (payload.new as Notification).id
                ? (payload.new as Notification)
                : n,
            ),
          )
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [profileId])

  const markRead = useCallback(
    async (id: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('notifications') as any)
        .update({ read: true })
        .eq('id', id)
    },
    [],
  )

  const markAllRead = useCallback(async () => {
    if (!profileId) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('notifications') as any)
      .update({ read: true })
      .eq('user_id', profileId)
      .eq('read', false)
  }, [profileId])

  return {
    notifications,
    unreadCount: notifications.filter((n) => !n.read).length,
    loading,
    markRead,
    markAllRead,
  }
}

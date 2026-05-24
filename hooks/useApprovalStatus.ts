'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/types'

type ApprovalRequest = Database['public']['Tables']['approval_requests']['Row']

/**
 * Subscribes to approval request status changes in real-time.
 * Used by clients to see when their quote approvals are decided,
 * and by admins to track the approval queue.
 */
export function useApprovalStatus(approvalRequestId?: string) {
  const supabase = createClient()
  const [requests, setRequests] = useState<ApprovalRequest[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let query = supabase
      .from('approval_requests')
      .select('*')
      .order('requested_at', { ascending: false })

    if (approvalRequestId) {
      query = query.eq('id', approvalRequestId)
    }

    query.then(({ data }) => {
      setRequests(data ?? [])
      setLoading(false)
    })
  }, [approvalRequestId])

  useEffect(() => {
    const filter = approvalRequestId
      ? `id=eq.${approvalRequestId}`
      : undefined

    const channel = supabase
      .channel(`approvals:${approvalRequestId ?? 'all'}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'approval_requests',
          ...(filter ? { filter } : {}),
        },
        (payload) => {
          const updated = payload.new as ApprovalRequest
          setRequests((prev) =>
            prev.map((r) => (r.id === updated.id ? updated : r)),
          )
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [approvalRequestId])

  return {
    requests,
    request: approvalRequestId ? requests[0] ?? null : null,
    loading,
  }
}

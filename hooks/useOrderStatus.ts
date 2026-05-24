'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/types'

type Order = Database['public']['Tables']['orders']['Row']

/**
 * Subscribes to order status changes in real-time.
 * Works for both clients (see their orders) and suppliers.
 *
 * Pass orderId to watch a single order, or leave undefined to
 * watch all orders for the current user's org/supplier account.
 */
export function useOrderStatus(orderId?: string) {
  const supabase = createClient()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let query = supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })

    if (orderId) {
      query = query.eq('id', orderId)
    }

    query.then(({ data }) => {
      setOrders(data ?? [])
      setLoading(false)
    })
  }, [orderId])

  useEffect(() => {
    const filter = orderId ? `id=eq.${orderId}` : undefined

    const channel = supabase
      .channel(`orders:${orderId ?? 'all'}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          ...(filter ? { filter } : {}),
        },
        (payload) => {
          const updated = payload.new as Order
          setOrders((prev) => {
            const exists = prev.find((o) => o.id === updated.id)
            if (exists) {
              return prev.map((o) => (o.id === updated.id ? updated : o))
            }
            return [updated, ...prev]
          })
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [orderId])

  return {
    orders,
    order: orderId ? orders[0] ?? null : null,
    loading,
  }
}

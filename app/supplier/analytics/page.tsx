'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { PageHeader, Panel } from '@/components/app/AppSurface'

type Metrics = {
  totalOrders: number
  completedOrders: number
  activeQuotes: number
  approvedProducts: number
}

export default function SupplierAnalyticsPage() {
  const supabase = createClient()
  const { orgId } = useAuth()
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!orgId) return
    const run = async () => {
      const [totalOrdersRes, completedOrdersRes, activeQuotesRes, approvedProductsRes] = await Promise.all([
        (supabase as any).from('orders').select('id', { count: 'exact', head: true }).eq('supplier_id', orgId).neq('status', 'CANCELLED'),
        (supabase as any).from('orders').select('id', { count: 'exact', head: true }).eq('supplier_id', orgId).eq('status', 'COMPLETED'),
        supabase.from('quotes').select('id', { count: 'exact', head: true }).eq('supplier_id', orgId).in('status', ['PENDING_ADMIN', 'SENT_TO_CLIENT', 'REVISION_SUBMITTED']),
        supabase.from('products').select('id', { count: 'exact', head: true }).eq('supplier_id', orgId).eq('approval_status', 'APPROVED'),
      ])
      setMetrics({
        totalOrders: totalOrdersRes.count ?? 0,
        completedOrders: completedOrdersRes.count ?? 0,
        activeQuotes: activeQuotesRes.count ?? 0,
        approvedProducts: approvedProductsRes.count ?? 0,
      })
      setLoading(false)
    }
    run()
  }, [orgId])

  return (
    <div className="space-y-6">
      <PageHeader title="Analytics" description="Performance overview for your supplier account." />
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Panel>
            <div className="flex flex-col items-start gap-1">
              <span className="text-4xl font-semibold text-gray-900">{metrics?.totalOrders ?? 0}</span>
              <span className="text-sm font-medium text-gray-600">Total Orders</span>
            </div>
          </Panel>
          <Panel>
            <div className="flex flex-col items-start gap-1">
              <span className="text-4xl font-semibold text-gray-900">{metrics?.completedOrders ?? 0}</span>
              <span className="text-sm font-medium text-gray-600">Completed Orders</span>
            </div>
          </Panel>
          <Panel>
            <div className="flex flex-col items-start gap-1">
              <span className="text-4xl font-semibold text-gray-900">{metrics?.activeQuotes ?? 0}</span>
              <span className="text-sm font-medium text-gray-600">Active Quotes</span>
            </div>
          </Panel>
          <Panel>
            <div className="flex flex-col items-start gap-1">
              <span className="text-4xl font-semibold text-gray-900">{metrics?.approvedProducts ?? 0}</span>
              <span className="text-sm font-medium text-gray-600">Approved Products</span>
            </div>
          </Panel>
        </div>
      )}
    </div>
  )
}

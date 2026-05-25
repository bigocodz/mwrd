'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { PageHeader, MetricCard } from '@/components/app/AppSurface'
import { PackageCheck, CheckCircle, FileQuestion, Receipt } from 'lucide-react'

export default function ReportsPage() {
  const { orgId, loading: authLoading } = useAuth()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [ordersThisMonth, setOrdersThisMonth] = useState(0)
  const [completedOrders, setCompletedOrders] = useState(0)
  const [activeRfqs, setActiveRfqs] = useState(0)
  const [pendingInvoices, setPendingInvoices] = useState(0)

  useEffect(() => {
    if (authLoading || !orgId) return

    const fetch = async () => {
      setLoading(true)

      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

      const [
        { count: monthOrders },
        { count: doneOrders },
        { count: openRfqs },
        { count: unpaidInvoices },
      ] = await Promise.all([
        (supabase as any)
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('client_id', orgId)
          .gte('created_at', startOfMonth),
        (supabase as any)
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('client_id', orgId)
          .eq('status', 'COMPLETED'),
        (supabase as any)
          .from('rfqs')
          .select('*', { count: 'exact', head: true })
          .eq('client_id', orgId)
          .eq('status', 'OPEN'),
        (supabase as any)
          .from('client_invoices')
          .select('*', { count: 'exact', head: true })
          .eq('client_id', orgId)
          .eq('status', 'PENDING_PAYMENT'),
      ])

      setOrdersThisMonth(monthOrders ?? 0)
      setCompletedOrders(doneOrders ?? 0)
      setActiveRfqs(openRfqs ?? 0)
      setPendingInvoices(unpaidInvoices ?? 0)
      setLoading(false)
    }

    fetch()
  }, [orgId, authLoading])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Procurement analytics and spend summary."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Orders This Month"
          value={ordersThisMonth}
          icon={PackageCheck}
          loading={loading}
          tone="default"
        />
        <MetricCard
          label="Completed Orders"
          value={completedOrders}
          icon={CheckCircle}
          loading={loading}
          tone="success"
        />
        <MetricCard
          label="Active RFQs"
          value={activeRfqs}
          icon={FileQuestion}
          loading={loading}
          tone="warning"
        />
        <MetricCard
          label="Pending Invoices"
          value={pendingInvoices}
          icon={Receipt}
          loading={loading}
          tone={pendingInvoices > 0 ? 'danger' : 'default'}
        />
      </div>
    </div>
  )
}

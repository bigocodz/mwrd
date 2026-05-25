'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Panel } from '@/components/app/AppSurface'
import { Button } from '@/components/ui/button'
import { OrderStatusBadge, DisputeBadge } from '@/components/shared/StatusBadge'
import type { Database } from '@/lib/supabase/types'

type Order = Database['public']['Tables']['orders']['Row']
type OrderStatus = Order['status']

const SAR = (n: number) =>
  new Intl.NumberFormat('en-SA', { style: 'currency', currency: 'SAR', maximumFractionDigits: 0 }).format(n)

const fmt = (d: string | null) =>
  d
    ? new Date(d).toLocaleString('en-SA', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—'

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  PENDING_CONFIRMATION: 'CONFIRMED',
  CONFIRMED: 'PREPARING',
  PREPARING: 'DISPATCHED',
  DISPATCHED: 'DELIVERED',
  DELIVERED: 'COMPLETED',
}

export default function AdminOrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const supabase = createClient()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [advancing, setAdvancing] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  useEffect(() => {
    if (!id) return
    supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        setOrder(data ?? null)
        setLoading(false)
      })
  }, [id])

  const advance = async () => {
    if (!order) return
    const next = NEXT_STATUS[order.status]
    if (!next) return
    setAdvancing(true)
    const now = new Date().toISOString()
    const update = {
      status: next,
      ...(next === 'CONFIRMED' ? { confirmed_at: now } : {}),
      ...(next === 'DISPATCHED' ? { dispatched_at: now } : {}),
      ...(next === 'DELIVERED' ? { delivered_at: now } : {}),
      ...(next === 'COMPLETED' ? { completed_at: now } : {}),
    }
    const { error } = await (supabase as any).from('orders').update(update).eq('id', order.id)
    if (error) {
      toast.error('Failed to advance order: ' + error.message)
    } else {
      toast.success(`Order moved to ${next}`)
      setOrder((prev) => (prev ? { ...prev, ...update } : null))
    }
    setAdvancing(false)
  }

  const cancel = async () => {
    if (!order) return
    if (!confirm('Cancel this order? This cannot be undone.')) return
    setCancelling(true)
    const { error } = await supabase
      .from('orders')
      .update({ status: 'CANCELLED', cancelled_at: new Date().toISOString() })
      .eq('id', order.id)
    if (error) {
      toast.error('Failed to cancel order: ' + error.message)
    } else {
      toast.success('Order cancelled')
      setOrder((prev) => (prev ? { ...prev, status: 'CANCELLED', cancelled_at: new Date().toISOString() } : null))
    }
    setCancelling(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="py-12 text-center text-gray-500">
        Order not found.{' '}
        <Link href="/admin/orders" className="text-[#ff6d43] hover:underline">
          Back to orders
        </Link>
      </div>
    )
  }

  const nextStatus = NEXT_STATUS[order.status]

  return (
    <>
      <Link
        href="/admin/orders"
        className="mb-5 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Orders
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-gray-900">Order</h1>
            <span className="font-mono text-sm text-gray-400">{order.id.slice(0, 8)}…</span>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <OrderStatusBadge status={order.status} />
            {order.dispute_status && <DisputeBadge status={order.dispute_status} />}
          </div>
        </div>
        <div className="flex gap-2">
          {nextStatus && order.status !== 'CANCELLED' && (
            <Button onClick={advance} disabled={advancing}>
              {advancing && <Loader2 className="h-4 w-4 animate-spin me-1.5" />}
              Move to {nextStatus.replace(/_/g, ' ').toLowerCase()}
            </Button>
          )}
          {!['COMPLETED', 'CANCELLED'].includes(order.status) && (
            <Button variant="destructive" onClick={cancel} disabled={cancelling}>
              {cancelling && <Loader2 className="h-4 w-4 animate-spin me-1.5" />}
              Cancel Order
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Panel title="Order Details">
          <dl className="space-y-2 text-sm">
            <Row label="Client" value={<span className="font-mono">{order.client_id.slice(0, 16)}…</span>} />
            <Row label="Supplier" value={<span className="font-mono">{order.supplier_id.slice(0, 16)}…</span>} />
            <Row label="Quote" value={<span className="font-mono">{order.quote_id.slice(0, 16)}…</span>} />
            <Row label="RFQ" value={<span className="font-mono">{order.rfq_id.slice(0, 16)}…</span>} />
            <Row label="PO Reference" value={order.client_po_id || '—'} />
            <Row label="Transaction Ref" value={order.transaction_ref || '—'} />
            <Row label="Delivery Location" value={order.delivery_location || '—'} />
            <Row label="Required By" value={order.required_by ? new Date(order.required_by).toLocaleDateString('en-SA') : '—'} />
            {order.notes && <Row label="Notes" value={order.notes} />}
          </dl>
        </Panel>

        <Panel title="Financials">
          <dl className="space-y-2 text-sm">
            <Row label="Subtotal (before VAT)" value={SAR(order.total_before_vat)} />
            <Row label="Total (incl. VAT)" value={<strong>{SAR(order.total_with_vat)}</strong>} />
          </dl>
        </Panel>
      </div>

      <Panel className="mt-6" title="Timeline">
        <ol className="relative ms-3 border-s border-gray-200 pb-2">
          <TimelineEvent label="Created" time={order.created_at} />
          {order.confirmed_at && <TimelineEvent label="Confirmed" time={order.confirmed_at} />}
          {order.dispatched_at && <TimelineEvent label="Dispatched" time={order.dispatched_at} />}
          {order.delivered_at && <TimelineEvent label="Delivered" time={order.delivered_at} />}
          {order.completed_at && <TimelineEvent label="Completed" time={order.completed_at} />}
          {order.cancelled_at && (
            <TimelineEvent label="Cancelled" time={order.cancelled_at} danger reason={order.cancelled_reason} />
          )}
        </ol>
      </Panel>
    </>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <dt className="min-w-[160px] shrink-0 text-gray-500">{label}:</dt>
      <dd className="text-gray-900">{value}</dd>
    </div>
  )
}

function TimelineEvent({
  label,
  time,
  danger,
  reason,
}: {
  label: string
  time: string
  danger?: boolean
  reason?: string | null
}) {
  return (
    <li className="mb-4 ms-4">
      <div
        className={`absolute -start-1.5 mt-1.5 h-3 w-3 rounded-full border-2 border-white ${danger ? 'bg-red-500' : 'bg-[#ff6d43]'}`}
      />
      <p className={`text-sm font-medium ${danger ? 'text-red-700' : 'text-gray-900'}`}>{label}</p>
      <p className="text-xs text-gray-400">{fmt(time)}</p>
      {reason && <p className="mt-0.5 text-xs text-gray-600">{reason}</p>}
    </li>
  )
}

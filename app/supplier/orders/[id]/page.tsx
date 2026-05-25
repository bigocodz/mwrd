'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ChevronRight, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { PageHeader, Panel, EmptyMessage } from '@/components/app/AppSurface'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { OrderStatusBadge } from '@/components/shared/StatusBadge'
import type { Database } from '@/lib/supabase/types'

type Order = Database['public']['Tables']['orders']['Row']
type OrderStatus = Order['status']

type OrderItem = {
  id: string
  order_id: string
  description: string
  quantity: number
  unit: string | null
  unit_price: number
  vat_rate: number | null
  total_price: number | null
}

const fmt = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('en-SA', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'

const sar = (n: number) =>
  new Intl.NumberFormat('en-SA', { style: 'currency', currency: 'SAR' }).format(n)

type Transition = {
  from: OrderStatus
  to: OrderStatus
  label: string
  field: string
}

const TRANSITIONS: Transition[] = [
  { from: 'PENDING_CONFIRMATION', to: 'CONFIRMED', label: 'Confirm Order', field: 'confirmed_at' },
  { from: 'CONFIRMED', to: 'PREPARING', label: 'Start Preparing', field: 'confirmed_at' },
  { from: 'PREPARING', to: 'DISPATCHED', label: 'Mark Dispatched', field: 'dispatched_at' },
  { from: 'DISPATCHED', to: 'DELIVERED', label: 'Mark Delivered', field: 'delivered_at' },
  { from: 'DELIVERED', to: 'COMPLETED', label: 'Mark Completed', field: 'completed_at' },
]

export default function SupplierOrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const supabase = createClient()
  const { orgId } = useAuth()

  const [order, setOrder] = useState<Order | null>(null)
  const [orderItems, setOrderItems] = useState<OrderItem[]>([])
  const [loading, setLoading] = useState(true)
  const [advancing, setAdvancing] = useState(false)

  useEffect(() => {
    if (!id || !orgId) return
    Promise.all([
      supabase.from('orders').select('*').eq('id', id).eq('supplier_id', orgId).single(),
      (supabase as any).from('order_items').select('*').eq('order_id', id).order('created_at'),
    ]).then(([{ data: orderData }, { data: itemData }]) => {
      setOrder(orderData ?? null)
      setOrderItems(itemData ?? [])
      setLoading(false)
    })
  }, [id, orgId])

  const advanceStatus = async () => {
    if (!order) return
    const transition = TRANSITIONS.find((t) => t.from === order.status)
    if (!transition) return

    setAdvancing(true)
    const now = new Date().toISOString()
    const update: Record<string, string> = {
      status: transition.to,
      [transition.field]: now,
    }
    const { error } = await (supabase as any)
      .from('orders')
      .update(update)
      .eq('id', order.id)
    if (error) {
      toast.error(error.message)
    } else {
      setOrder((prev) =>
        prev ? { ...prev, status: transition.to, [transition.field]: now } : prev,
      )
      toast.success(`Order marked as ${transition.to.replace(/_/g, ' ').toLowerCase()}`)
    }
    setAdvancing(false)
  }

  const transition = order ? TRANSITIONS.find((t) => t.from === order.status) : null

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
        <Link href="/supplier/orders" className="text-[#ff6d43] hover:underline">
          Back to Orders
        </Link>
      </div>
    )
  }

  return (
    <>
      <Link
        href="/supplier/orders"
        className="mb-5 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Orders
      </Link>

      <PageHeader
        title="Order Details"
        description={<OrderStatusBadge status={order.status} />}
        actions={
          transition ? (
            <Button onClick={advanceStatus} disabled={advancing}>
              {advancing ? (
                <Loader2 className="h-4 w-4 animate-spin me-1.5" />
              ) : (
                <ChevronRight className="h-4 w-4 me-1.5" />
              )}
              {transition.label}
            </Button>
          ) : undefined
        }
      />

      <div className="grid gap-6 md:grid-cols-2">
        <Panel title="Order Details">
          <dl className="space-y-2 text-sm">
            <Row label="Order ID" value={<span className="font-mono text-xs">{order.id}</span>} />
            <Row label="Status" value={<OrderStatusBadge status={order.status} />} />
            <Row label="Total (before VAT)" value={sar(order.total_before_vat)} />
            <Row label="Total (incl. VAT)" value={<span className="font-semibold">{sar(order.total_with_vat)}</span>} />
            <Row label="Delivery Location" value={order.delivery_location || '—'} />
            <Row label="Required By" value={fmt(order.required_by)} />
            <Row label="Placed" value={fmt(order.created_at)} />
            {order.confirmed_at && <Row label="Confirmed" value={fmt(order.confirmed_at)} />}
            {order.dispatched_at && <Row label="Dispatched" value={fmt(order.dispatched_at)} />}
            {order.delivered_at && <Row label="Delivered" value={fmt(order.delivered_at)} />}
            {order.completed_at && <Row label="Completed" value={fmt(order.completed_at)} />}
            {order.cancelled_at && <Row label="Cancelled" value={fmt(order.cancelled_at)} />}
            {order.cancelled_reason && <Row label="Cancel Reason" value={order.cancelled_reason} />}
            {order.dispute_status && (
              <Row
                label="Dispute"
                value={
                  <span className={`font-medium ${order.dispute_status === 'OPEN' ? 'text-amber-600' : 'text-green-600'}`}>
                    {order.dispute_status}
                  </span>
                }
              />
            )}
            {order.notes && <Row label="Notes" value={order.notes} />}
          </dl>
        </Panel>

        <Panel title="Reference IDs">
          <dl className="space-y-2 text-sm">
            <Row label="RFQ" value={<span className="font-mono text-xs text-gray-500">{order.rfq_id.slice(0, 16)}…</span>} />
            <Row label="Quote" value={<span className="font-mono text-xs text-gray-500">{order.quote_id.slice(0, 16)}…</span>} />
            {order.client_po_id && <Row label="Client PO" value={order.client_po_id} />}
            {order.transaction_ref && <Row label="Transaction Ref" value={order.transaction_ref} />}
          </dl>
        </Panel>
      </div>

      <Panel className="mt-6" title="Order Items">
        {orderItems.length === 0 ? (
          <EmptyMessage>No line items available.</EmptyMessage>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">VAT %</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orderItems.map((item) => {
                  const subtotal = (item.unit_price ?? 0) * (item.quantity ?? 1)
                  const vat = subtotal * ((item.vat_rate ?? 15) / 100)
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="text-sm">{item.description}</TableCell>
                      <TableCell className="text-right text-sm">{item.quantity}</TableCell>
                      <TableCell className="text-sm text-gray-500">{item.unit || 'pcs'}</TableCell>
                      <TableCell className="text-right text-sm">{sar(item.unit_price ?? 0)}</TableCell>
                      <TableCell className="text-right text-sm">{item.vat_rate ?? 15}%</TableCell>
                      <TableCell className="text-right text-sm font-medium">{sar(subtotal + vat)}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
            <div className="mt-4 space-y-1 border-t border-gray-200 pt-4 text-sm">
              <div className="flex justify-between text-gray-500">
                <span>Subtotal (before VAT)</span>
                <span>{sar(order.total_before_vat)}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>VAT</span>
                <span>{sar(order.total_with_vat - order.total_before_vat)}</span>
              </div>
              <div className="flex justify-between text-base font-semibold text-gray-900">
                <span>Total</span>
                <span>{sar(order.total_with_vat)}</span>
              </div>
            </div>
          </>
        )}
      </Panel>
    </>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <dt className="min-w-[140px] shrink-0 text-gray-500">{label}:</dt>
      <dd className="text-gray-900">{value}</dd>
    </div>
  )
}

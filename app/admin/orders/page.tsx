'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Download } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { PageHeader, Panel, SkeletonLine, EmptyMessage } from '@/components/app/AppSurface'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Select, SelectOption } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { OrderStatusBadge, DisputeBadge } from '@/components/shared/StatusBadge'
import { PaginationControls, paginate, totalPages } from '@/components/shared/Pagination'
import type { Database } from '@/lib/supabase/types'

type Order = Database['public']['Tables']['orders']['Row']

const PAGE_SIZE = 20
const SAR = (n: number) =>
  new Intl.NumberFormat('en-SA', { style: 'currency', currency: 'SAR', maximumFractionDigits: 0 }).format(n)

const STATUS_OPTIONS = [
  'ALL', 'DISPUTED', 'PENDING_CONFIRMATION', 'CONFIRMED', 'PREPARING',
  'DISPATCHED', 'DELIVERED', 'COMPLETED', 'CANCELLED',
]

const STATUS_LABELS: Record<string, string> = {
  ALL: 'All statuses',
  DISPUTED: 'Disputed',
  PENDING_CONFIRMATION: 'Pending',
  CONFIRMED: 'Confirmed',
  PREPARING: 'Preparing',
  DISPATCHED: 'Dispatched',
  DELIVERED: 'Delivered',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
}

export default function AdminOrdersPage() {
  const supabase = createClient()
  const router = useRouter()

  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [page, setPage] = useState(1)

  useEffect(() => {
    setLoading(true)
    let q = supabase.from('orders').select('*').order('created_at', { ascending: false })
    if (statusFilter === 'DISPUTED') {
      q = q.eq('dispute_status', 'OPEN')
    } else if (statusFilter !== 'ALL') {
      q = q.eq('status', statusFilter as Order['status'])
    }
    q.then(({ data }) => {
      setOrders(data ?? [])
      setLoading(false)
    })
  }, [statusFilter])

  const numPages = totalPages(orders.length, PAGE_SIZE)
  const paged = paginate(orders, page, PAGE_SIZE)
  const fmt = (d: string) =>
    new Date(d).toLocaleDateString('en-SA', { year: 'numeric', month: 'short', day: 'numeric' })

  const exportCsv = () => {
    const rows = [
      ['order_id', 'status', 'dispute', 'total_with_vat', 'delivery_location', 'required_by', 'created_at'],
      ...orders.map((o) => [
        o.id, o.status, o.dispute_status ?? '', String(o.total_with_vat),
        o.delivery_location ?? '', o.required_by ?? '', o.created_at,
      ]),
    ]
    const csv = rows.map((r) => r.join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = `mwrd-orders-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
  }

  return (
    <>
      <PageHeader
        title="Orders"
        description="Lifecycle of every accepted-quote order."
        actions={
          <Button variant="outline" onClick={exportCsv} disabled={orders.length === 0}>
            <Download className="h-4 w-4 me-1.5" />
            Export CSV
          </Button>
        }
      />

      <Panel>
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <Select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
            className="w-56"
          >
            {STATUS_OPTIONS.map((s) => (
              <SelectOption key={s} value={s}>{STATUS_LABELS[s]}</SelectOption>
            ))}
          </Select>
          <span className="text-sm text-gray-500 ms-auto">{orders.length} orders</span>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <SkeletonLine key={i} className="h-12 w-full" />)}
          </div>
        ) : orders.length === 0 ? (
          <EmptyMessage>No orders found.</EmptyMessage>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-end">Total (incl. VAT)</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.map((o) => (
                  <TableRow key={o.id} onClick={() => router.push(`/admin/orders/${o.id}`)}>
                    <TableCell className="font-mono text-xs">{o.id.slice(0, 8)}…</TableCell>
                    <TableCell className="font-mono text-xs text-gray-500">{o.client_id.slice(0, 8)}…</TableCell>
                    <TableCell className="font-mono text-xs text-gray-500">{o.supplier_id.slice(0, 8)}…</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        <OrderStatusBadge status={o.status} />
                        {o.dispute_status && <DisputeBadge status={o.dispute_status} />}
                      </div>
                    </TableCell>
                    <TableCell className="text-end font-medium">{SAR(o.total_with_vat)}</TableCell>
                    <TableCell className="text-gray-500 text-sm">{fmt(o.created_at)}</TableCell>
                    <TableCell>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); router.push(`/admin/orders/${o.id}`) }}
                        className="text-xs font-medium text-[#ff6d43] hover:underline"
                      >
                        View
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <PaginationControls
              page={page}
              totalPages={numPages}
              total={orders.length}
              onPageChange={setPage}
              className="mt-4"
            />
          </>
        )}
      </Panel>
    </>
  )
}

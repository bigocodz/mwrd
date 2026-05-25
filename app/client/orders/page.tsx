'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { PageHeader, Panel, SkeletonLine, EmptyMessage } from '@/components/app/AppSurface'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Select, SelectOption } from '@/components/ui/select'
import { OrderStatusBadge } from '@/components/shared/StatusBadge'
import { PaginationControls, paginate, totalPages } from '@/components/shared/Pagination'
import type { Database } from '@/lib/supabase/types'

type Order = Database['public']['Tables']['orders']['Row']

const PAGE_SIZE = 20

const fmt = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('en-SA', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'

const sar = (n: number) =>
  new Intl.NumberFormat('en-SA', { style: 'currency', currency: 'SAR' }).format(n)

export default function ClientOrdersPage() {
  const supabase = createClient()
  const { orgId } = useAuth()
  const router = useRouter()

  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('ALL')
  const [page, setPage] = useState(1)

  useEffect(() => {
    if (!orgId) return
    setLoading(true)
    let q = supabase
      .from('orders')
      .select('*')
      .eq('client_id', orgId)
      .order('created_at', { ascending: false })
    if (filter !== 'ALL') q = (q as any).eq('status', filter)
    q.then(({ data }) => {
      setOrders(data ?? [])
      setLoading(false)
    })
  }, [orgId, filter])

  const numPages = totalPages(orders.length, PAGE_SIZE)
  const paged = paginate(orders, page, PAGE_SIZE)

  return (
    <>
      <PageHeader
        title="My Orders"
        description="Track the status of your confirmed orders."
      />

      <Panel>
        <div className="mb-5 flex items-center gap-3">
          <Select
            value={filter}
            onChange={(e) => { setFilter(e.target.value); setPage(1) }}
            className="w-[200px]"
          >
            <SelectOption value="ALL">All Statuses</SelectOption>
            <SelectOption value="PENDING_CONFIRMATION">Pending Confirmation</SelectOption>
            <SelectOption value="CONFIRMED">Confirmed</SelectOption>
            <SelectOption value="PREPARING">Preparing</SelectOption>
            <SelectOption value="DISPATCHED">Dispatched</SelectOption>
            <SelectOption value="DELIVERED">Delivered</SelectOption>
            <SelectOption value="COMPLETED">Completed</SelectOption>
            <SelectOption value="CANCELLED">Cancelled</SelectOption>
          </Select>
          <span className="ms-auto text-sm text-gray-500">{orders.length} orders</span>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonLine key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <EmptyMessage>No orders yet.</EmptyMessage>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Total (incl. VAT)</TableHead>
                  <TableHead>Required By</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.map((o) => (
                  <TableRow key={o.id} onClick={() => router.push(`/client/orders/${o.id}`)}>
                    <TableCell className="font-mono text-xs">{o.id.slice(0, 8)}…</TableCell>
                    <TableCell>
                      <OrderStatusBadge status={o.status} />
                    </TableCell>
                    <TableCell className="font-medium">{sar(o.total_with_vat)}</TableCell>
                    <TableCell className="text-sm text-gray-500">{fmt(o.required_by)}</TableCell>
                    <TableCell className="text-sm text-gray-500">{fmt(o.created_at)}</TableCell>
                    <TableCell>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); router.push(`/client/orders/${o.id}`) }}
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

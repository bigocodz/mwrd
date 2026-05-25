'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PageHeader, Panel, SkeletonLine, EmptyMessage } from '@/components/app/AppSurface'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { OrderStatusBadge } from '@/components/shared/StatusBadge'
import { PaginationControls, paginate, totalPages } from '@/components/shared/Pagination'

const PAGE_SIZE = 20

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('en-SA', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'

export default function AdminLifecyclePage() {
  const supabase = createClient()
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)

  useEffect(() => {
    setLoading(true)
    supabase
      .from('orders')
      .select('*')
      .not('status', 'in', '("COMPLETED","CANCELLED")')
      .order('created_at', { ascending: false })
      .then(({ data }: any) => {
        setItems(data ?? [])
        setLoading(false)
      })
  }, [])

  const numPages = totalPages(items.length, PAGE_SIZE)
  const paged = paginate(items, page, PAGE_SIZE)

  return (
    <>
      <PageHeader
        title="Lifecycle & SLA"
        description="Monitor in-flight orders and SLA health."
      />
      <Panel>
        {loading ? (
          <div className="space-y-3">
            <SkeletonLine className="h-8 w-full" />
            <SkeletonLine className="h-8 w-full" />
            <SkeletonLine className="h-8 w-full" />
          </div>
        ) : items.length === 0 ? (
          <EmptyMessage>No in-flight orders found.</EmptyMessage>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Client ID</TableHead>
                  <TableHead>Supplier ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead>Required By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-xs text-gray-500">{item.id?.slice(0, 8)}…</TableCell>
                    <TableCell className="font-mono text-xs text-gray-500">{item.client_id?.slice(0, 8)}…</TableCell>
                    <TableCell className="font-mono text-xs text-gray-500">{item.supplier_id?.slice(0, 8)}…</TableCell>
                    <TableCell><OrderStatusBadge status={item.status} /></TableCell>
                    <TableCell className="text-gray-600">{fmtDate(item.created_at)}</TableCell>
                    <TableCell className="text-gray-600">{fmtDate(item.required_by)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <PaginationControls
              page={page}
              totalPages={numPages}
              total={items.length}
              onPageChange={setPage}
              className="mt-4"
            />
          </>
        )}
      </Panel>
    </>
  )
}

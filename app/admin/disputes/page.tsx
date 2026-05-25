'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PageHeader, Panel, SkeletonLine, EmptyMessage } from '@/components/app/AppSurface'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { DisputeBadge, OrderStatusBadge } from '@/components/shared/StatusBadge'
import { PaginationControls, paginate, totalPages } from '@/components/shared/Pagination'

const PAGE_SIZE = 20

const fmt = (n: number) =>
  new Intl.NumberFormat('en-SA', { style: 'currency', currency: 'SAR', maximumFractionDigits: 0 }).format(n)

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('en-SA', { year: 'numeric', month: 'short', day: 'numeric' })

export default function AdminDisputesPage() {
  const supabase = createClient()
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)

  useEffect(() => {
    setLoading(true)
    supabase
      .from('orders')
      .select('*')
      .eq('dispute_status', 'OPEN')
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
        title="Disputes"
        description="Orders currently under dispute requiring admin resolution."
      />
      <Panel>
        {loading ? (
          <div className="space-y-3">
            <SkeletonLine className="h-8 w-full" />
            <SkeletonLine className="h-8 w-full" />
            <SkeletonLine className="h-8 w-full" />
          </div>
        ) : items.length === 0 ? (
          <EmptyMessage>No open disputes found.</EmptyMessage>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Client ID</TableHead>
                  <TableHead>Supplier ID</TableHead>
                  <TableHead>Total (VAT)</TableHead>
                  <TableHead>Dispute</TableHead>
                  <TableHead>Order Status</TableHead>
                  <TableHead>Created At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-xs text-gray-500">{item.id?.slice(0, 8)}…</TableCell>
                    <TableCell className="font-mono text-xs text-gray-500">{item.client_id?.slice(0, 8)}…</TableCell>
                    <TableCell className="font-mono text-xs text-gray-500">{item.supplier_id?.slice(0, 8)}…</TableCell>
                    <TableCell className="font-medium text-gray-900">{fmt(item.total_with_vat ?? 0)}</TableCell>
                    <TableCell><DisputeBadge status={item.dispute_status} /></TableCell>
                    <TableCell><OrderStatusBadge status={item.status} /></TableCell>
                    <TableCell className="text-gray-600">{fmtDate(item.created_at)}</TableCell>
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

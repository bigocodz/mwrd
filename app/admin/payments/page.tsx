'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PageHeader, Panel, SkeletonLine, EmptyMessage } from '@/components/app/AppSurface'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Select, SelectOption } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { PaginationControls, paginate, totalPages } from '@/components/shared/Pagination'

const PAGE_SIZE = 20

const fmt = (n: number) =>
  new Intl.NumberFormat('en-SA', { style: 'currency', currency: 'SAR', maximumFractionDigits: 0 }).format(n)

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('en-SA', { year: 'numeric', month: 'short', day: 'numeric' })

function PaymentStatusBadge({ status }: { status: string }) {
  const variants: Record<string, 'warning' | 'success' | 'danger' | 'default'> = {
    PENDING: 'warning',
    COMPLETED: 'success',
    FAILED: 'danger',
  }
  return <Badge variant={variants[status] ?? 'default'}>{status}</Badge>
}

export default function AdminPaymentsPage() {
  const supabase = createClient()
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('ALL')
  const [page, setPage] = useState(1)

  useEffect(() => {
    setLoading(true)
    setPage(1)
    let q = (supabase as any)
      .from('payments')
      .select('*')
      .order('created_at', { ascending: false })
    if (filter !== 'ALL') q = q.eq('status', filter)
    q.then(({ data }: any) => {
      setItems(data ?? [])
      setLoading(false)
    })
  }, [filter])

  const numPages = totalPages(items.length, PAGE_SIZE)
  const paged = paginate(items, page, PAGE_SIZE)

  return (
    <>
      <PageHeader title="Payments" description="Track all payment transactions on the platform." />
      <Panel>
        <div className="mb-4 flex items-center gap-3">
          <Select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <SelectOption value="ALL">All statuses</SelectOption>
            <SelectOption value="PENDING">Pending</SelectOption>
            <SelectOption value="COMPLETED">Completed</SelectOption>
            <SelectOption value="FAILED">Failed</SelectOption>
          </Select>
        </div>
        {loading ? (
          <div className="space-y-3">
            <SkeletonLine className="h-8 w-full" />
            <SkeletonLine className="h-8 w-full" />
            <SkeletonLine className="h-8 w-full" />
          </div>
        ) : items.length === 0 ? (
          <EmptyMessage>No payments found.</EmptyMessage>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Invoice ID</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-xs text-gray-500">{item.id?.slice(0, 8)}…</TableCell>
                    <TableCell className="font-mono text-xs text-gray-500">
                      {item.invoice_id ? `${item.invoice_id.slice(0, 8)}…` : '—'}
                    </TableCell>
                    <TableCell className="font-medium text-gray-900">{fmt(item.amount ?? 0)}</TableCell>
                    <TableCell><PaymentStatusBadge status={item.status} /></TableCell>
                    <TableCell className="text-gray-600">{item.created_at ? fmtDate(item.created_at) : '—'}</TableCell>
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

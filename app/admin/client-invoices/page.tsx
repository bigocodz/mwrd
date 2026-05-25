'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PageHeader, Panel, SkeletonLine, EmptyMessage } from '@/components/app/AppSurface'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Select, SelectOption } from '@/components/ui/select'
import { InvoiceStatusBadge } from '@/components/shared/StatusBadge'
import { PaginationControls, paginate, totalPages } from '@/components/shared/Pagination'

const PAGE_SIZE = 20

const fmt = (n: number) =>
  new Intl.NumberFormat('en-SA', { style: 'currency', currency: 'SAR', maximumFractionDigits: 0 }).format(n)

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('en-SA', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'

export default function AdminClientInvoicesPage() {
  const supabase = createClient()
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('ALL')
  const [page, setPage] = useState(1)

  useEffect(() => {
    setLoading(true)
    setPage(1)
    let q = supabase
      .from('client_invoices')
      .select('*')
      .order('created_at', { ascending: false })
    if (filter !== 'ALL') q = (q as any).eq('status', filter)
    q.then(({ data }: any) => {
      setItems(data ?? [])
      setLoading(false)
    })
  }, [filter])

  const numPages = totalPages(items.length, PAGE_SIZE)
  const paged = paginate(items, page, PAGE_SIZE)

  return (
    <>
      <PageHeader title="Client Invoices" description="Invoices issued to clients for completed orders." />
      <Panel>
        <div className="mb-4 flex items-center gap-3">
          <Select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <SelectOption value="ALL">All statuses</SelectOption>
            <SelectOption value="PENDING_PAYMENT">Pending Payment</SelectOption>
            <SelectOption value="PAID">Paid</SelectOption>
            <SelectOption value="OVERDUE">Overdue</SelectOption>
            <SelectOption value="VOID">Void</SelectOption>
          </Select>
        </div>
        {loading ? (
          <div className="space-y-3">
            <SkeletonLine className="h-8 w-full" />
            <SkeletonLine className="h-8 w-full" />
            <SkeletonLine className="h-8 w-full" />
          </div>
        ) : items.length === 0 ? (
          <EmptyMessage>No client invoices found.</EmptyMessage>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Client ID</TableHead>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Issue Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Total Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium text-gray-900">{item.invoice_number ?? '—'}</TableCell>
                    <TableCell className="font-mono text-xs text-gray-500">{item.client_id?.slice(0, 8)}…</TableCell>
                    <TableCell className="font-mono text-xs text-gray-500">
                      {item.order_id ? `${item.order_id.slice(0, 8)}…` : '—'}
                    </TableCell>
                    <TableCell className="text-gray-600">{fmtDate(item.issue_date)}</TableCell>
                    <TableCell className="text-gray-600">{fmtDate(item.due_date)}</TableCell>
                    <TableCell className="font-medium text-gray-900">{fmt(item.total_amount ?? 0)}</TableCell>
                    <TableCell><InvoiceStatusBadge status={item.status} /></TableCell>
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

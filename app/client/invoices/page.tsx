'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { PageHeader, Panel, SkeletonLine, EmptyMessage } from '@/components/app/AppSurface'
import { Select, SelectOption } from '@/components/ui/select'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { InvoiceStatusBadge } from '@/components/shared/StatusBadge'
import { PaginationControls, paginate, totalPages } from '@/components/shared/Pagination'
import type { Database } from '@/lib/supabase/types'

type Invoice = Database['public']['Tables']['client_invoices']['Row']
type StatusFilter = 'ALL' | 'PENDING_PAYMENT' | 'PAID' | 'OVERDUE' | 'VOID'

const fmt = (n: number) =>
  new Intl.NumberFormat('en-SA', { style: 'currency', currency: 'SAR', maximumFractionDigits: 0 }).format(n)
const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('en-SA', { year: 'numeric', month: 'short', day: 'numeric' })

const PAGE_SIZE = 20

export default function InvoicesPage() {
  const { orgId, loading: authLoading } = useAuth()
  const supabase = createClient()

  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [page, setPage] = useState(1)

  useEffect(() => {
    if (authLoading || !orgId) return

    const fetch = async () => {
      setLoading(true)
      let query = (supabase as any)
        .from('client_invoices')
        .select('*')
        .eq('client_id', orgId)
        .order('issue_date', { ascending: false })

      if (statusFilter !== 'ALL') {
        query = query.eq('status', statusFilter)
      }

      const { data } = await query
      setInvoices(data ?? [])
      setPage(1)
      setLoading(false)
    }

    fetch()
  }, [orgId, authLoading, statusFilter])

  const pages = totalPages(invoices.length, PAGE_SIZE)
  const visible = paginate(invoices, page, PAGE_SIZE)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invoices"
        description="Your invoice history and payment status."
        actions={
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          >
            <SelectOption value="ALL">All Statuses</SelectOption>
            <SelectOption value="PENDING_PAYMENT">Pending Payment</SelectOption>
            <SelectOption value="PAID">Paid</SelectOption>
            <SelectOption value="OVERDUE">Overdue</SelectOption>
            <SelectOption value="VOID">Void</SelectOption>
          </Select>
        }
      />

      <Panel>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonLine key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : invoices.length === 0 ? (
          <EmptyMessage>No invoices found.</EmptyMessage>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead>Issue Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-mono text-sm">{inv.invoice_number}</TableCell>
                    <TableCell className="font-mono text-sm text-gray-500">
                      {inv.order_id ? inv.order_id.slice(0, 8) + '…' : '—'}
                    </TableCell>
                    <TableCell>{fmtDate(inv.issue_date)}</TableCell>
                    <TableCell>{fmtDate(inv.due_date)}</TableCell>
                    <TableCell className="font-semibold">{fmt(inv.total_amount)}</TableCell>
                    <TableCell>
                      <InvoiceStatusBadge status={inv.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <PaginationControls
              page={page}
              totalPages={pages}
              total={invoices.length}
              onPageChange={setPage}
              className="mt-4"
            />
          </>
        )}
      </Panel>
    </div>
  )
}

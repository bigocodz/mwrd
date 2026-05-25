'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { PageHeader, Panel, EmptyMessage } from '@/components/app/AppSurface'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Select, SelectOption } from '@/components/ui/select'
import { InvoiceStatusBadge } from '@/components/shared/StatusBadge'
import { PaginationControls, paginate, totalPages } from '@/components/shared/Pagination'

const PAGE_SIZE = 20

type SupplierInvoice = {
  id: string
  invoice_number: string
  order_id: string
  supplier_id: string
  status: string
  issue_date: string | null
  due_date: string | null
  total_amount: number
  created_at: string
}

type StatusFilter = 'ALL' | 'PENDING_PAYMENT' | 'PAID' | 'OVERDUE' | 'VOID'

const fmt = (n: number) => new Intl.NumberFormat('en-SA', { style: 'currency', currency: 'SAR' }).format(n)
const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString('en-SA', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'

export default function SupplierInvoicesPage() {
  const supabase = createClient()
  const { orgId } = useAuth()
  const [invoices, setInvoices] = useState<SupplierInvoice[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<StatusFilter>('ALL')
  const [page, setPage] = useState(1)

  useEffect(() => {
    if (!orgId) return
    setLoading(true)
    const run = async () => {
      let q = (supabase as any).from('supplier_invoices').select('*').eq('supplier_id', orgId).order('created_at', { ascending: false })
      if (filter !== 'ALL') {
        q = q.eq('status', filter)
      }
      const { data, error } = await q
      if (error) {
        toast.error(error.message)
      } else {
        setInvoices(data ?? [])
      }
      setLoading(false)
    }
    run()
  }, [orgId, filter])

  useEffect(() => { setPage(1) }, [filter])

  const paged = paginate(invoices, page, PAGE_SIZE)
  const total = invoices.length
  const pages = totalPages(total, PAGE_SIZE)

  return (
    <div className="space-y-6">
      <PageHeader title="Invoices" description="Supplier invoices for completed orders." />
      <Panel
        title="Invoices"
        actions={
          <Select value={filter} onChange={e => setFilter(e.target.value as StatusFilter)}>
            <SelectOption value="ALL">All Statuses</SelectOption>
            <SelectOption value="PENDING_PAYMENT">Pending Payment</SelectOption>
            <SelectOption value="PAID">Paid</SelectOption>
            <SelectOption value="OVERDUE">Overdue</SelectOption>
            <SelectOption value="VOID">Void</SelectOption>
          </Select>
        }
      >
        {loading ? (
          <p className="text-sm text-gray-500">Loading...</p>
        ) : invoices.length === 0 ? (
          <EmptyMessage>No invoices found.</EmptyMessage>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Issue Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.map(inv => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-medium">{inv.invoice_number}</TableCell>
                    <TableCell className="font-mono text-xs">{inv.order_id?.slice(0, 8) ?? '—'}</TableCell>
                    <TableCell>{fmtDate(inv.issue_date)}</TableCell>
                    <TableCell>{fmtDate(inv.due_date)}</TableCell>
                    <TableCell>{fmt(inv.total_amount ?? 0)}</TableCell>
                    <TableCell><InvoiceStatusBadge status={inv.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <PaginationControls page={page} totalPages={pages} total={total} onPageChange={setPage} className="mt-4" />
          </>
        )}
      </Panel>
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { PageHeader, Panel, EmptyMessage } from '@/components/app/AppSurface'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Select, SelectOption } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { PaginationControls, paginate, totalPages } from '@/components/shared/Pagination'

const PAGE_SIZE = 20

type Payout = {
  id: string
  supplier_id: string
  amount: number
  status: string
  bank_reference: string | null
  processed_at: string | null
  created_at: string
}

type StatusFilter = 'ALL' | 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'

const fmt = (n: number) => new Intl.NumberFormat('en-SA', { style: 'currency', currency: 'SAR' }).format(n)
const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString('en-SA', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'

function PayoutStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: 'warning' | 'info' | 'success' | 'danger' | 'default' }> = {
    PENDING: { label: 'Pending', variant: 'warning' },
    PROCESSING: { label: 'Processing', variant: 'info' },
    COMPLETED: { label: 'Completed', variant: 'success' },
    FAILED: { label: 'Failed', variant: 'danger' },
  }
  const m = map[status] ?? { label: status, variant: 'default' as const }
  return <Badge variant={m.variant}>{m.label}</Badge>
}

export default function SupplierPayoutsPage() {
  const supabase = createClient()
  const { orgId } = useAuth()
  const [payouts, setPayouts] = useState<Payout[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<StatusFilter>('ALL')
  const [page, setPage] = useState(1)

  useEffect(() => {
    if (!orgId) return
    setLoading(true)
    const run = async () => {
      let q = (supabase as any).from('payouts').select('*').eq('supplier_id', orgId).order('created_at', { ascending: false })
      if (filter !== 'ALL') {
        q = q.eq('status', filter)
      }
      const { data, error } = await q
      if (error) {
        toast.error(error.message)
      } else {
        setPayouts(data ?? [])
      }
      setLoading(false)
    }
    run()
  }, [orgId, filter])

  useEffect(() => { setPage(1) }, [filter])

  const paged = paginate(payouts, page, PAGE_SIZE)
  const total = payouts.length
  const pages = totalPages(total, PAGE_SIZE)

  return (
    <div className="space-y-6">
      <PageHeader title="Payouts" description="Payment disbursements to your account." />
      <Panel
        title="Payouts"
        actions={
          <Select value={filter} onChange={e => setFilter(e.target.value as StatusFilter)}>
            <SelectOption value="ALL">All Statuses</SelectOption>
            <SelectOption value="PENDING">Pending</SelectOption>
            <SelectOption value="PROCESSING">Processing</SelectOption>
            <SelectOption value="COMPLETED">Completed</SelectOption>
            <SelectOption value="FAILED">Failed</SelectOption>
          </Select>
        }
      >
        {loading ? (
          <p className="text-sm text-gray-500">Loading...</p>
        ) : payouts.length === 0 ? (
          <EmptyMessage>No payouts found.</EmptyMessage>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Bank Reference</TableHead>
                  <TableHead>Processed</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs">{p.id.slice(0, 8)}</TableCell>
                    <TableCell>{fmt(p.amount ?? 0)}</TableCell>
                    <TableCell><PayoutStatusBadge status={p.status} /></TableCell>
                    <TableCell>{p.bank_reference ?? '—'}</TableCell>
                    <TableCell>{fmtDate(p.processed_at)}</TableCell>
                    <TableCell>{fmtDate(p.created_at)}</TableCell>
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

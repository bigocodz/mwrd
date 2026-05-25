'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { PageHeader, Panel, EmptyMessage } from '@/components/app/AppSurface'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Select, SelectOption } from '@/components/ui/select'
import { QuoteStatusBadge } from '@/components/shared/StatusBadge'
import { PaginationControls, paginate, totalPages } from '@/components/shared/Pagination'

const PAGE_SIZE = 20

type Quote = {
  id: string
  rfq_id: string
  supplier_id: string
  status: string
  review_until: string | null
  created_at: string
}

type StatusFilter = 'ALL' | 'PENDING_ADMIN' | 'SENT_TO_CLIENT' | 'CLIENT_REVISION_REQUESTED' | 'ACCEPTED' | 'REJECTED'

export default function SupplierQuotesPage() {
  const supabase = createClient()
  const { orgId } = useAuth()
  const router = useRouter()
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<StatusFilter>('ALL')
  const [page, setPage] = useState(1)

  useEffect(() => {
    if (!orgId) return
    setLoading(true)
    const run = async () => {
      let q = supabase.from('quotes').select('*').eq('supplier_id', orgId).order('created_at', { ascending: false })
      if (filter !== 'ALL') {
        q = (q as any).eq('status', filter)
      }
      const { data, error } = await q
      if (error) {
        toast.error(error.message)
      } else {
        setQuotes((data as Quote[]) ?? [])
      }
      setLoading(false)
    }
    run()
  }, [orgId, filter])

  useEffect(() => { setPage(1) }, [filter])

  const paged = paginate(quotes, page, PAGE_SIZE)
  const total = quotes.length
  const pages = totalPages(total, PAGE_SIZE)

  return (
    <div className="space-y-6">
      <PageHeader title="My Quotes" description="Quotes you've submitted to client RFQs." />
      <Panel
        title="Quotes"
        actions={
          <Select value={filter} onChange={e => setFilter(e.target.value as StatusFilter)}>
            <SelectOption value="ALL">All Statuses</SelectOption>
            <SelectOption value="PENDING_ADMIN">Pending Review</SelectOption>
            <SelectOption value="SENT_TO_CLIENT">Sent to Client</SelectOption>
            <SelectOption value="CLIENT_REVISION_REQUESTED">Revision Requested</SelectOption>
            <SelectOption value="ACCEPTED">Accepted</SelectOption>
            <SelectOption value="REJECTED">Rejected</SelectOption>
          </Select>
        }
      >
        {loading ? (
          <p className="text-sm text-gray-500">Loading...</p>
        ) : quotes.length === 0 ? (
          <EmptyMessage>No quotes found.</EmptyMessage>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quote ID</TableHead>
                  <TableHead>RFQ ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Review Until</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.map(q => (
                  <TableRow
                    key={q.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/supplier/rfqs/${q.rfq_id}`)}
                  >
                    <TableCell className="font-mono text-xs">{q.id.slice(0, 8)}</TableCell>
                    <TableCell
                      className="font-mono text-xs text-blue-600 hover:underline"
                      onClick={e => { e.stopPropagation(); router.push(`/supplier/rfqs/${q.rfq_id}`) }}
                    >
                      {q.rfq_id.slice(0, 8)}
                    </TableCell>
                    <TableCell><QuoteStatusBadge status={q.status} /></TableCell>
                    <TableCell>{q.review_until ? new Date(q.review_until).toLocaleDateString('en-SA', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}</TableCell>
                    <TableCell>{new Date(q.created_at).toLocaleDateString('en-SA', { year: 'numeric', month: 'short', day: 'numeric' })}</TableCell>
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

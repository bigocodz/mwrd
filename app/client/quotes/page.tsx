'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { PageHeader, Panel, SkeletonLine, EmptyMessage } from '@/components/app/AppSurface'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Select, SelectOption } from '@/components/ui/select'
import { QuoteStatusBadge, RfqStatusBadge } from '@/components/shared/StatusBadge'
import { PaginationControls, paginate, totalPages } from '@/components/shared/Pagination'
import type { Database } from '@/lib/supabase/types'

type Quote = Database['public']['Tables']['quotes']['Row']
type Rfq = Database['public']['Tables']['rfqs']['Row']

type QuoteRow = Quote & { rfq: Rfq | null }

const PAGE_SIZE = 20

const fmt = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('en-SA', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'

export default function ClientQuotesPage() {
  const supabase = createClient()
  const { orgId } = useAuth()
  const router = useRouter()

  const [quotes, setQuotes] = useState<QuoteRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('ALL')
  const [page, setPage] = useState(1)

  useEffect(() => {
    if (!orgId) return
    setLoading(true)

    supabase
      .from('rfqs')
      .select('id')
      .eq('client_id', orgId)
      .then(({ data: rfqRows }) => {
        const rfqIds = (rfqRows ?? []).map((r) => r.id)
        if (rfqIds.length === 0) {
          setQuotes([])
          setLoading(false)
          return
        }

        let q = (supabase as any)
          .from('quotes')
          .select('*, rfq:rfqs(*)')
          .in('rfq_id', rfqIds)
          .order('created_at', { ascending: false })

        if (filter !== 'ALL') q = q.eq('status', filter)

        q.then(({ data }: any) => {
          setQuotes(data ?? [])
          setLoading(false)
        })
      })
  }, [orgId, filter])

  const numPages = totalPages(quotes.length, PAGE_SIZE)
  const paged = paginate(quotes, page, PAGE_SIZE)

  return (
    <>
      <PageHeader
        title="My Quotes"
        description="Quotes submitted by suppliers in response to your RFQs."
      />

      <Panel>
        <div className="mb-5 flex items-center gap-3">
          <Select
            value={filter}
            onChange={(e) => { setFilter(e.target.value); setPage(1) }}
            className="w-[200px]"
          >
            <SelectOption value="ALL">All Statuses</SelectOption>
            <SelectOption value="SENT_TO_CLIENT">Awaiting Review</SelectOption>
            <SelectOption value="CLIENT_REVISION_REQUESTED">Revision Requested</SelectOption>
            <SelectOption value="REVISION_SUBMITTED">Revised</SelectOption>
            <SelectOption value="ACCEPTED">Accepted</SelectOption>
            <SelectOption value="REJECTED">Rejected</SelectOption>
          </Select>
          <span className="ms-auto text-sm text-gray-500">{quotes.length} quotes</span>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonLine key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : quotes.length === 0 ? (
          <EmptyMessage>No quotes found.</EmptyMessage>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quote ID</TableHead>
                  <TableHead>RFQ</TableHead>
                  <TableHead>RFQ Status</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Review Until</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.map((q) => (
                  <TableRow
                    key={q.id}
                    onClick={() => router.push(`/client/rfqs/${q.rfq_id}`)}
                  >
                    <TableCell className="font-mono text-xs">{q.id.slice(0, 8)}…</TableCell>
                    <TableCell className="font-mono text-xs text-gray-500">
                      {q.rfq_id.slice(0, 8)}…
                    </TableCell>
                    <TableCell>
                      {q.rfq ? <RfqStatusBadge status={q.rfq.status} /> : '—'}
                    </TableCell>
                    <TableCell>
                      <QuoteStatusBadge status={q.status} />
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {fmt(q.review_until)}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {fmt(q.created_at)}
                    </TableCell>
                    <TableCell>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); router.push(`/client/rfqs/${q.rfq_id}`) }}
                        className="text-xs font-medium text-[#ff6d43] hover:underline"
                      >
                        View RFQ
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <PaginationControls
              page={page}
              totalPages={numPages}
              total={quotes.length}
              onPageChange={setPage}
              className="mt-4"
            />
          </>
        )}
      </Panel>
    </>
  )
}

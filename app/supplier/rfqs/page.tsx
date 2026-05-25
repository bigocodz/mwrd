'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { PageHeader, Panel, SkeletonLine, EmptyMessage } from '@/components/app/AppSurface'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Select, SelectOption } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { RfqStatusBadge } from '@/components/shared/StatusBadge'
import { PaginationControls, paginate, totalPages } from '@/components/shared/Pagination'
import type { Database } from '@/lib/supabase/types'

type Rfq = Database['public']['Tables']['rfqs']['Row']

const PAGE_SIZE = 20

const fmt = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('en-SA', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'

export default function SupplierRfqsPage() {
  const supabase = createClient()
  useAuth()
  const router = useRouter()

  const [rfqs, setRfqs] = useState<Rfq[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('ALL')
  const [page, setPage] = useState(1)

  useEffect(() => {
    setLoading(true)
    let q = supabase
      .from('rfqs')
      .select('*')
      .order('created_at', { ascending: false })
    if (filter !== 'ALL') q = (q as any).eq('status', filter)
    q.then(({ data }) => {
      setRfqs(data ?? [])
      setLoading(false)
    })
  }, [filter])

  const numPages = totalPages(rfqs.length, PAGE_SIZE)
  const paged = paginate(rfqs, page, PAGE_SIZE)

  return (
    <>
      <PageHeader
        title="Available RFQs"
        description="Browse open client requests and submit competitive quotes."
      />

      <Panel>
        <div className="mb-5 flex items-center gap-3">
          <Select
            value={filter}
            onChange={(e) => { setFilter(e.target.value); setPage(1) }}
            className="w-[160px]"
          >
            <SelectOption value="ALL">All</SelectOption>
            <SelectOption value="OPEN">Open</SelectOption>
            <SelectOption value="QUOTED">Quoted</SelectOption>
            <SelectOption value="CLOSED">Closed</SelectOption>
          </Select>
          <span className="ms-auto text-sm text-gray-500">{rfqs.length} RFQs</span>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonLine key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : rfqs.length === 0 ? (
          <EmptyMessage>No RFQs available.</EmptyMessage>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>RFQ ID</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Required By</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.map((r) => (
                  <TableRow key={r.id} onClick={() => router.push(`/supplier/rfqs/${r.id}`)}>
                    <TableCell className="font-mono text-xs">{r.id.slice(0, 8)}…</TableCell>
                    <TableCell>
                      {r.category ? <Badge variant="info">{r.category}</Badge> : '—'}
                    </TableCell>
                    <TableCell><RfqStatusBadge status={r.status} /></TableCell>
                    <TableCell className="text-sm text-gray-500">{fmt(r.required_by)}</TableCell>
                    <TableCell className="text-sm text-gray-500">{fmt(r.expiry_date)}</TableCell>
                    <TableCell className="text-sm text-gray-500">{fmt(r.created_at)}</TableCell>
                    <TableCell>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); router.push(`/supplier/rfqs/${r.id}`) }}
                        className="text-xs font-medium text-[#ff6d43] hover:underline"
                      >
                        {r.status === 'OPEN' ? 'Quote' : 'View'}
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <PaginationControls
              page={page}
              totalPages={numPages}
              total={rfqs.length}
              onPageChange={setPage}
              className="mt-4"
            />
          </>
        )}
      </Panel>
    </>
  )
}

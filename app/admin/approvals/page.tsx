'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PageHeader, Panel, SkeletonLine, EmptyMessage } from '@/components/app/AppSurface'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Select, SelectOption } from '@/components/ui/select'
import { ApprovalStatusBadge } from '@/components/shared/StatusBadge'
import { PaginationControls, paginate, totalPages } from '@/components/shared/Pagination'

const PAGE_SIZE = 20

const fmt = (n: number) =>
  new Intl.NumberFormat('en-SA', { style: 'currency', currency: 'SAR', maximumFractionDigits: 0 }).format(n)

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('en-SA', { year: 'numeric', month: 'short', day: 'numeric' })

export default function AdminApprovalsPage() {
  const supabase = createClient()
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('ALL')
  const [page, setPage] = useState(1)

  useEffect(() => {
    setLoading(true)
    setPage(1)
    let q = supabase
      .from('approval_requests')
      .select('*')
      .order('requested_at', { ascending: false })
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
      <PageHeader
        title="Approval Requests"
        description="Review and monitor quote approval workflows."
      />
      <Panel>
        <div className="mb-4 flex items-center gap-3">
          <Select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <SelectOption value="ALL">All statuses</SelectOption>
            <SelectOption value="PENDING">Pending</SelectOption>
            <SelectOption value="APPROVED">Approved</SelectOption>
            <SelectOption value="REJECTED">Rejected</SelectOption>
          </Select>
        </div>
        {loading ? (
          <div className="space-y-3">
            <SkeletonLine className="h-8 w-full" />
            <SkeletonLine className="h-8 w-full" />
            <SkeletonLine className="h-8 w-full" />
          </div>
        ) : items.length === 0 ? (
          <EmptyMessage>No approval requests found.</EmptyMessage>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Rule Name</TableHead>
                  <TableHead>Quote ID</TableHead>
                  <TableHead>RFQ ID</TableHead>
                  <TableHead>Client ID</TableHead>
                  <TableHead>Quote Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Groups</TableHead>
                  <TableHead>Requested At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-xs text-gray-500">{item.id?.slice(0, 8)}…</TableCell>
                    <TableCell className="font-medium text-gray-900">{item.rule_name ?? '—'}</TableCell>
                    <TableCell className="font-mono text-xs text-gray-500">{item.quote_id?.slice(0, 8)}…</TableCell>
                    <TableCell className="font-mono text-xs text-gray-500">{item.rfq_id?.slice(0, 8)}…</TableCell>
                    <TableCell className="font-mono text-xs text-gray-500">{item.client_id?.slice(0, 8)}…</TableCell>
                    <TableCell>{fmt(item.quote_total ?? 0)}</TableCell>
                    <TableCell><ApprovalStatusBadge status={item.status} /></TableCell>
                    <TableCell className="text-gray-600">{item.current_group ?? '—'}/{item.total_groups ?? '—'}</TableCell>
                    <TableCell className="text-gray-600">{item.requested_at ? fmtDate(item.requested_at) : '—'}</TableCell>
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

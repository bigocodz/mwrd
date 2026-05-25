'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { PageHeader, Panel, SkeletonLine, EmptyMessage } from '@/components/app/AppSurface'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Select, SelectOption } from '@/components/ui/select'
import { RfqStatusBadge } from '@/components/shared/StatusBadge'
import { PaginationControls, paginate, totalPages } from '@/components/shared/Pagination'

const PAGE_SIZE = 20

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('en-SA', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'

export default function AdminRfqsPage() {
  const supabase = createClient()
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('ALL')
  const [page, setPage] = useState(1)

  useEffect(() => {
    setLoading(true)
    setPage(1)
    let q = supabase
      .from('rfqs')
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
      <PageHeader title="RFQs" description="Browse and manage all request for quotations." />
      <Panel>
        <div className="mb-4 flex items-center gap-3">
          <Select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <SelectOption value="ALL">All statuses</SelectOption>
            <SelectOption value="OPEN">Open</SelectOption>
            <SelectOption value="QUOTED">Quoted</SelectOption>
            <SelectOption value="CLOSED">Closed</SelectOption>
          </Select>
        </div>
        {loading ? (
          <div className="space-y-3">
            <SkeletonLine className="h-8 w-full" />
            <SkeletonLine className="h-8 w-full" />
            <SkeletonLine className="h-8 w-full" />
          </div>
        ) : items.length === 0 ? (
          <EmptyMessage>No RFQs found.</EmptyMessage>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Client ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Required By</TableHead>
                  <TableHead>Expiry Date</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-xs text-gray-500">{item.id?.slice(0, 8)}…</TableCell>
                    <TableCell className="font-mono text-xs text-gray-500">{item.client_id?.slice(0, 8)}…</TableCell>
                    <TableCell><RfqStatusBadge status={item.status} /></TableCell>
                    <TableCell className="text-gray-700">{item.category ?? '—'}</TableCell>
                    <TableCell className="text-gray-600">{fmtDate(item.required_by)}</TableCell>
                    <TableCell className="text-gray-600">{fmtDate(item.expiry_date)}</TableCell>
                    <TableCell className="text-gray-600">{fmtDate(item.created_at)}</TableCell>
                    <TableCell>
                      <Link
                        href={`/admin/rfqs/${item.id}`}
                        className="inline-flex h-8 items-center rounded-lg border border-gray-200 bg-white px-3 text-xs font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
                      >
                        View
                      </Link>
                    </TableCell>
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

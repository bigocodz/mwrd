'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PageHeader, Panel, SkeletonLine, EmptyMessage } from '@/components/app/AppSurface'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Select, SelectOption } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { PaginationControls, paginate, totalPages } from '@/components/shared/Pagination'

const PAGE_SIZE = 20

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('en-SA', { year: 'numeric', month: 'short', day: 'numeric' })

function DeliveryNoteStatusBadge({ status }: { status: string }) {
  const variants: Record<string, 'default' | 'warning' | 'info' | 'success'> = {
    DRAFT: 'default',
    SUBMITTED: 'warning',
    CONFIRMED: 'success',
  }
  return <Badge variant={variants[status] ?? 'default'}>{status}</Badge>
}

export default function AdminDeliveryNotesPage() {
  const supabase = createClient()
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('ALL')
  const [page, setPage] = useState(1)

  useEffect(() => {
    setLoading(true)
    setPage(1)
    let q = (supabase as any)
      .from('delivery_notes')
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
      <PageHeader title="Delivery Notes" description="Track delivery notes for supplier-fulfilled orders." />
      <Panel>
        <div className="mb-4 flex items-center gap-3">
          <Select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <SelectOption value="ALL">All statuses</SelectOption>
            <SelectOption value="DRAFT">Draft</SelectOption>
            <SelectOption value="SUBMITTED">Submitted</SelectOption>
            <SelectOption value="CONFIRMED">Confirmed</SelectOption>
          </Select>
        </div>
        {loading ? (
          <div className="space-y-3">
            <SkeletonLine className="h-8 w-full" />
            <SkeletonLine className="h-8 w-full" />
            <SkeletonLine className="h-8 w-full" />
          </div>
        ) : items.length === 0 ? (
          <EmptyMessage>No delivery notes found.</EmptyMessage>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Supplier ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-xs text-gray-500">{item.id?.slice(0, 8)}…</TableCell>
                    <TableCell className="font-mono text-xs text-gray-500">
                      {item.order_id ? `${item.order_id.slice(0, 8)}…` : '—'}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-gray-500">
                      {item.supplier_id ? `${item.supplier_id.slice(0, 8)}…` : '—'}
                    </TableCell>
                    <TableCell><DeliveryNoteStatusBadge status={item.status} /></TableCell>
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

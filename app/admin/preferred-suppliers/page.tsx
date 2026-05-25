'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PageHeader, Panel, SkeletonLine, EmptyMessage } from '@/components/app/AppSurface'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { ProfileStatusBadge, KycBadge } from '@/components/shared/StatusBadge'
import { PaginationControls, paginate, totalPages } from '@/components/shared/Pagination'

const PAGE_SIZE = 20

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('en-SA', { year: 'numeric', month: 'short', day: 'numeric' })

export default function AdminPreferredSuppliersPage() {
  const supabase = createClient()
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [removing, setRemoving] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  const fetchItems = useCallback(() => {
    setLoading(true)
    supabase
      .from('profiles')
      .select('*')
      .eq('is_preferred', true)
      .eq('role', 'SUPPLIER')
      .order('created_at', { ascending: false })
      .then(({ data }: any) => {
        setItems(data ?? [])
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  async function handleRemovePreferred(id: string) {
    setRemoving(id)
    await supabase.from('profiles').update({ is_preferred: false }).eq('id', id)
    setRemoving(null)
    fetchItems()
  }

  const numPages = totalPages(items.length, PAGE_SIZE)
  const paged = paginate(items, page, PAGE_SIZE)

  return (
    <>
      <PageHeader
        title="Preferred Suppliers"
        description="Suppliers marked as preferred and featured on the platform."
      />
      <Panel>
        {loading ? (
          <div className="space-y-3">
            <SkeletonLine className="h-8 w-full" />
            <SkeletonLine className="h-8 w-full" />
            <SkeletonLine className="h-8 w-full" />
          </div>
        ) : items.length === 0 ? (
          <EmptyMessage>No preferred suppliers found.</EmptyMessage>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Public ID</TableHead>
                  <TableHead>Company Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>KYC Status</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-xs text-gray-500">{item.public_id ?? '—'}</TableCell>
                    <TableCell className="font-medium text-gray-900">{item.company_name ?? '—'}</TableCell>
                    <TableCell><ProfileStatusBadge status={item.status} /></TableCell>
                    <TableCell><KycBadge status={item.kyc_status} /></TableCell>
                    <TableCell className="text-gray-600">{fmtDate(item.created_at)}</TableCell>
                    <TableCell>
                      <button
                        type="button"
                        disabled={removing === item.id}
                        onClick={() => handleRemovePreferred(item.id)}
                        className="inline-flex h-8 items-center rounded-lg border border-gray-200 bg-white px-3 text-xs font-medium text-gray-700 shadow-sm transition-colors hover:bg-red-50 hover:border-red-200 hover:text-red-700 disabled:opacity-50"
                      >
                        {removing === item.id ? 'Removing…' : 'Remove preferred'}
                      </button>
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

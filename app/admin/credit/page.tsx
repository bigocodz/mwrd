'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PageHeader, Panel, SkeletonLine, EmptyMessage } from '@/components/app/AppSurface'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { PaginationControls, paginate, totalPages } from '@/components/shared/Pagination'

const PAGE_SIZE = 20

const fmt = (n: number | null) =>
  n != null
    ? new Intl.NumberFormat('en-SA', { style: 'currency', currency: 'SAR', maximumFractionDigits: 0 }).format(n)
    : '—'

export default function AdminCreditPage() {
  const supabase = createClient()
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)

  useEffect(() => {
    setLoading(true)
    supabase
      .from('profiles')
      .select('id, public_id, company_name, credit_limit, current_balance')
      .eq('role', 'CLIENT')
      .eq('status', 'ACTIVE')
      .order('company_name', { ascending: true })
      .then(({ data }: any) => {
        setItems(data ?? [])
        setLoading(false)
      })
  }, [])

  const numPages = totalPages(items.length, PAGE_SIZE)
  const paged = paginate(items, page, PAGE_SIZE)

  function utilization(item: any): number | null {
    if (!item.credit_limit || item.credit_limit === 0) return null
    return (item.current_balance / item.credit_limit) * 100
  }

  return (
    <>
      <PageHeader
        title="Credit Management"
        description="Monitor client credit utilization."
      />
      <Panel>
        {loading ? (
          <div className="space-y-3">
            <SkeletonLine className="h-8 w-full" />
            <SkeletonLine className="h-8 w-full" />
            <SkeletonLine className="h-8 w-full" />
          </div>
        ) : items.length === 0 ? (
          <EmptyMessage>No active clients found.</EmptyMessage>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Public ID</TableHead>
                  <TableHead>Company Name</TableHead>
                  <TableHead>Credit Limit</TableHead>
                  <TableHead>Current Balance</TableHead>
                  <TableHead>Utilization</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.map((item: any) => {
                  const pct = utilization(item)
                  const isHigh = pct != null && pct > 80
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-xs text-gray-500">{item.public_id ?? '—'}</TableCell>
                      <TableCell className="font-medium text-gray-900">{item.company_name ?? '—'}</TableCell>
                      <TableCell className="text-gray-700">{fmt(item.credit_limit)}</TableCell>
                      <TableCell className="text-gray-700">{fmt(item.current_balance)}</TableCell>
                      <TableCell>
                        {pct != null ? (
                          <span
                            className={
                              isHigh
                                ? 'inline-flex rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700'
                                : 'inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700'
                            }
                          >
                            {pct.toFixed(0)}%
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
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

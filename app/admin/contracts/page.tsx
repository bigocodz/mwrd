'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { PageHeader, Panel, SkeletonLine, EmptyMessage } from '@/components/app/AppSurface'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Select, SelectOption } from '@/components/ui/select'
import { PaginationControls, paginate, totalPages } from '@/components/shared/Pagination'

type Contract = {
  id: string
  client_id: string
  title: string
  status: string
  start_date: string | null
  end_date: string | null
  total_value: number | null
  created_at: string
}

const statusVariant = (s: string): 'success' | 'warning' | 'danger' | 'info' | 'default' => {
  const m: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'default'> = {
    ACTIVE: 'success',
    DRAFT: 'warning',
    EXPIRED: 'danger',
    TERMINATED: 'default',
  }
  return m[s] ?? 'default'
}

const SAR = (n: number) =>
  new Intl.NumberFormat('en-SA', { style: 'currency', currency: 'SAR', maximumFractionDigits: 0 }).format(n)

const PAGE_SIZE = 20

export default function AdminContractsPage() {
  const supabase = createClient()
  const router = useRouter()

  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [page, setPage] = useState(1)

  useEffect(() => {
    setLoading(true)
    let q = (supabase as any).from('contracts').select('*').order('created_at', { ascending: false })
    if (statusFilter !== 'ALL') q = q.eq('status', statusFilter)
    q.then(({ data }: any) => {
      setContracts(data ?? [])
      setLoading(false)
    })
  }, [statusFilter])

  const numPages = totalPages(contracts.length, PAGE_SIZE)
  const paged = paginate(contracts, page, PAGE_SIZE)
  const fmt = (d: string | null) =>
    d ? new Date(d).toLocaleDateString('en-SA', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'

  return (
    <>
      <PageHeader title="Contracts" description="Framework agreements and long-term supply contracts." />

      <Panel>
        <div className="mb-5 flex items-center gap-3">
          <Select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }} className="w-[160px]">
            <SelectOption value="ALL">All Statuses</SelectOption>
            <SelectOption value="DRAFT">Draft</SelectOption>
            <SelectOption value="ACTIVE">Active</SelectOption>
            <SelectOption value="EXPIRED">Expired</SelectOption>
            <SelectOption value="TERMINATED">Terminated</SelectOption>
          </Select>
          <span className="text-sm text-gray-500 ms-auto">{contracts.length} contracts</span>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => <SkeletonLine key={i} className="h-10 w-full" />)}
          </div>
        ) : contracts.length === 0 ? (
          <EmptyMessage>No contracts found.</EmptyMessage>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Start</TableHead>
                  <TableHead>End</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.map((c) => (
                  <TableRow key={c.id} onClick={() => router.push(`/admin/contracts/${c.id}`)}>
                    <TableCell className="font-medium">{c.title}</TableCell>
                    <TableCell className="font-mono text-xs text-gray-500">{c.client_id.slice(0, 8)}…</TableCell>
                    <TableCell><Badge variant={statusVariant(c.status)}>{c.status}</Badge></TableCell>
                    <TableCell className="font-medium">{c.total_value ? SAR(c.total_value) : '—'}</TableCell>
                    <TableCell className="text-sm text-gray-500">{fmt(c.start_date)}</TableCell>
                    <TableCell className="text-sm text-gray-500">{fmt(c.end_date)}</TableCell>
                    <TableCell>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); router.push(`/admin/contracts/${c.id}`) }}
                        className="text-xs font-medium text-[#ff6d43] hover:underline"
                      >
                        View
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <PaginationControls page={page} totalPages={numPages} total={contracts.length} onPageChange={setPage} className="mt-4" />
          </>
        )}
      </Panel>
    </>
  )
}

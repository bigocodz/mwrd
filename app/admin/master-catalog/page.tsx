'use client'

import { useEffect, useState } from 'react'
import { Package, Plus, Search } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { PageHeader, Panel, SkeletonLine, EmptyMessage } from '@/components/app/AppSurface'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { PaginationControls, paginate, totalPages } from '@/components/shared/Pagination'

type MasterProduct = {
  id: string
  name: string
  description: string | null
  category: string
  unit: string | null
  created_at: string
}

const PAGE_SIZE = 20

export default function AdminMasterCatalogPage() {
  const supabase = createClient()
  const [products, setProducts] = useState<MasterProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    setLoading(true)
    ;(supabase as unknown as any)
      .from('master_products')
      .select('*')
      .order('name', { ascending: true })
      .then(({ data }: any) => {
        setProducts(data ?? [])
        setLoading(false)
      })
  }, [])

  const filtered = products.filter((p) => {
    if (!search) return true
    const s = search.toLowerCase()
    return p.name.toLowerCase().includes(s) || p.category?.toLowerCase().includes(s)
  })

  const numPages = totalPages(filtered.length, PAGE_SIZE)
  const paged = paginate(filtered, page, PAGE_SIZE)
  const fmt = (d: string) =>
    new Date(d).toLocaleDateString('en-SA', { year: 'numeric', month: 'short', day: 'numeric' })

  return (
    <>
      <PageHeader
        title="Master Catalog"
        description="Canonical product definitions that supplier products are matched against."
      />

      <Panel>
        <div className="mb-5">
          <div className="relative max-w-sm">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <Input
              placeholder="Search by name or category…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              className="ps-9"
            />
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <SkeletonLine key={i} className="h-10 w-full" />)}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyMessage>
            {search ? 'No products match your search.' : 'Master catalog is empty.'}
          </EmptyMessage>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="flex items-start gap-2">
                        <Package className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                        <div>
                          <p className="font-medium text-gray-900">{p.name}</p>
                          {p.description && (
                            <p className="text-xs text-gray-500 line-clamp-1">{p.description}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell><Badge variant="info">{p.category}</Badge></TableCell>
                    <TableCell className="text-gray-500">{p.unit || '—'}</TableCell>
                    <TableCell className="text-gray-500 text-sm">{fmt(p.created_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <PaginationControls
              page={page}
              totalPages={numPages}
              total={filtered.length}
              onPageChange={setPage}
              className="mt-4"
            />
          </>
        )}
      </Panel>
    </>
  )
}

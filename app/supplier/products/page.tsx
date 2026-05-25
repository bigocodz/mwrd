'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2, Package, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { PageHeader, Panel, SkeletonLine, EmptyMessage } from '@/components/app/AppSurface'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Select, SelectOption } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ProductStatusBadge } from '@/components/shared/StatusBadge'
import { PaginationControls, paginate, totalPages } from '@/components/shared/Pagination'
import type { Database } from '@/lib/supabase/types'

type Product = Database['public']['Tables']['products']['Row']

const PAGE_SIZE = 20

const sar = (n: number) =>
  new Intl.NumberFormat('en-SA', { style: 'currency', currency: 'SAR' }).format(n)

export default function SupplierProductsPage() {
  const supabase = createClient()
  const { orgId } = useAuth()
  const router = useRouter()

  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('ALL')
  const [page, setPage] = useState(1)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    if (!orgId) return
    setLoading(true)
    let q = supabase
      .from('products')
      .select('*')
      .eq('supplier_id', orgId)
      .order('created_at', { ascending: false })
    if (filter !== 'ALL') q = (q as any).eq('approval_status', filter)
    q.then(({ data }) => {
      setProducts(data ?? [])
      setLoading(false)
    })
  }, [orgId, filter])

  const deleteProduct = async (id: string) => {
    if (!confirm('Delete this product?')) return
    setDeletingId(id)
    const { error } = await supabase.from('products').delete().eq('id', id)
    if (error) {
      toast.error(error.message)
    } else {
      setProducts((prev) => prev.filter((p) => p.id !== id))
      toast.success('Product deleted')
    }
    setDeletingId(null)
  }

  const numPages = totalPages(products.length, PAGE_SIZE)
  const paged = paginate(products, page, PAGE_SIZE)

  return (
    <>
      <PageHeader
        title="My Products"
        description="Manage products you've listed on the MWRD platform."
        actions={
          <Button asChild>
            <Link href="/supplier/products/new">
              <Plus className="h-4 w-4 me-1.5" />
              Add Product
            </Link>
          </Button>
        }
      />

      <Panel>
        <div className="mb-5 flex items-center gap-3">
          <Select
            value={filter}
            onChange={(e) => { setFilter(e.target.value); setPage(1) }}
            className="w-[180px]"
          >
            <SelectOption value="ALL">All Statuses</SelectOption>
            <SelectOption value="PENDING">Pending Review</SelectOption>
            <SelectOption value="APPROVED">Approved</SelectOption>
            <SelectOption value="REJECTED">Rejected</SelectOption>
          </Select>
          <span className="ms-auto text-sm text-gray-500">{products.length} products</span>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonLine key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <EmptyMessage>No products yet. Add your first product.</EmptyMessage>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Cost Price</TableHead>
                  <TableHead>Lead Time</TableHead>
                  <TableHead>Availability</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.map((p) => (
                  <TableRow key={p.id} onClick={() => router.push(`/supplier/products/${p.id}/edit`)}>
                    <TableCell>
                      {p.images?.length > 0 ? (
                        <img
                          src={p.images[0]}
                          alt={p.name}
                          className="h-9 w-9 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100">
                          <Package className="h-4 w-4 text-gray-400" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>
                      <Badge variant="info">{p.category}</Badge>
                    </TableCell>
                    <TableCell>{sar(p.cost_price)}</TableCell>
                    <TableCell className="text-sm text-gray-500">{p.lead_time_days}d</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          p.availability_status === 'AVAILABLE'
                            ? 'success'
                            : p.availability_status === 'LIMITED_STOCK'
                            ? 'warning'
                            : 'danger'
                        }
                      >
                        {p.availability_status.replace(/_/g, ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <ProductStatusBadge status={p.approval_status} />
                    </TableCell>
                    <TableCell>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteProduct(p.id)
                        }}
                        disabled={deletingId === p.id}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-red-500 hover:bg-red-50 disabled:opacity-40"
                      >
                        {deletingId === p.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <PaginationControls
              page={page}
              totalPages={numPages}
              total={products.length}
              onPageChange={setPage}
              className="mt-4"
            />
          </>
        )}
      </Panel>
    </>
  )
}

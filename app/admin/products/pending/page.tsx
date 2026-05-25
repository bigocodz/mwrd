'use client'

import { useEffect, useState } from 'react'
import { CheckCircle, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { PageHeader, Panel, SkeletonLine, EmptyMessage } from '@/components/app/AppSurface'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import type { Database } from '@/lib/supabase/types'

type Product = Database['public']['Tables']['products']['Row']

const SAR = (n: number) =>
  new Intl.NumberFormat('en-SA', { style: 'currency', currency: 'SAR', maximumFractionDigits: 0 }).format(n)

export default function AdminPendingProductsPage() {
  const supabase = createClient()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    supabase
      .from('products')
      .select('*')
      .eq('approval_status', 'PENDING')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setProducts(data ?? [])
        setLoading(false)
      })
  }

  useEffect(() => { load() }, [])

  const decide = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    setActing(id)
    const { error } = await supabase
      .from('products')
      .update({ approval_status: status })
      .eq('id', id)
    if (error) {
      toast.error('Action failed: ' + error.message)
    } else {
      toast.success(status === 'APPROVED' ? 'Product approved' : 'Product rejected')
      setProducts((prev) => prev.filter((p) => p.id !== id))
    }
    setActing(null)
  }

  const fmt = (d: string) =>
    new Date(d).toLocaleDateString('en-SA', { year: 'numeric', month: 'short', day: 'numeric' })

  return (
    <>
      <PageHeader
        title="Pending Product Approvals"
        description="Review and approve or reject supplier product submissions."
      />

      <Panel>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => <SkeletonLine key={i} className="h-12 w-full" />)}
          </div>
        ) : products.length === 0 ? (
          <EmptyMessage>No pending products. All caught up!</EmptyMessage>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Cost Price</TableHead>
                <TableHead>Lead Time</TableHead>
                <TableHead>Availability</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-gray-900">{p.name}</p>
                      {p.description && (
                        <p className="mt-0.5 text-xs text-gray-500 line-clamp-1">{p.description}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="info">{p.category}</Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-gray-500">
                    {p.supplier_id.slice(0, 8)}…
                  </TableCell>
                  <TableCell className="font-medium">{SAR(p.cost_price)}</TableCell>
                  <TableCell>{p.lead_time_days}d</TableCell>
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
                  <TableCell className="text-gray-500 text-sm">{fmt(p.created_at)}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => decide(p.id, 'APPROVED')}
                        disabled={acting === p.id}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-green-600 transition-colors hover:bg-green-50 disabled:opacity-40"
                        title="Approve"
                      >
                        <CheckCircle className="h-5 w-5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => decide(p.id, 'REJECTED')}
                        disabled={acting === p.id}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-red-500 transition-colors hover:bg-red-50 disabled:opacity-40"
                        title="Reject"
                      >
                        <XCircle className="h-5 w-5" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Panel>
    </>
  )
}

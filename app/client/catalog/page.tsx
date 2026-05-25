'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Loader2, Package, Search, ShoppingCart, Star } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { PageHeader, EmptyMessage } from '@/components/app/AppSurface'
import { Input } from '@/components/ui/input'
import { Select, SelectOption } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { Database } from '@/lib/supabase/types'

type Product = Database['public']['Tables']['products']['Row']

type CartEntry = {
  id: string
  product_id: string
  cart_quantity: number
  alias: string | null
  pinned: boolean | null
  hidden: boolean | null
}

export default function ClientCatalogPage() {
  const supabase = createClient()
  const { profile, orgId } = useAuth()

  const [products, setProducts] = useState<Product[]>([])
  const [cartEntries, setCartEntries] = useState<CartEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('ALL')
  const [busyId, setBusyId] = useState<string | null>(null)

  useEffect(() => {
    if (!orgId) return
    Promise.all([
      supabase.from('products').select('*').eq('approval_status', 'APPROVED').order('name'),
      (supabase as any)
        .from('client_catalog_entries')
        .select('id, product_id, cart_quantity, alias, pinned, hidden')
        .eq('client_id', orgId),
    ]).then(([{ data: p }, { data: c }]) => {
      setProducts(p ?? [])
      setCartEntries(c ?? [])
      setLoading(false)
    })
  }, [orgId])

  const cartMap = useMemo(
    () => new Map(cartEntries.map((e) => [e.product_id, e])),
    [cartEntries],
  )

  const cartCount = cartEntries.reduce((sum, e) => sum + (e.cart_quantity ?? 0), 0)

  const categories = useMemo(
    () => ['ALL', ...Array.from(new Set(products.map((p) => p.category))).sort()],
    [products],
  )

  const filtered = products.filter((p) => {
    if (catFilter !== 'ALL' && p.category !== catFilter) return false
    if (search) {
      const s = search.toLowerCase()
      return p.name.toLowerCase().includes(s) || p.description?.toLowerCase().includes(s)
    }
    return true
  })

  const addToCart = async (product: Product) => {
    if (!orgId) return
    setBusyId(product.id)
    const existing = cartMap.get(product.id)
    if (existing) {
      const { error } = await (supabase as any)
        .from('client_catalog_entries')
        .update({ cart_quantity: (existing.cart_quantity ?? 0) + 1 })
        .eq('id', existing.id)
      if (!error) {
        setCartEntries((prev) =>
          prev.map((e) =>
            e.id === existing.id ? { ...e, cart_quantity: (e.cart_quantity ?? 0) + 1 } : e,
          ),
        )
        toast.success(`${product.name} quantity updated`)
      }
    } else {
      const { data, error } = await (supabase as any)
        .from('client_catalog_entries')
        .insert({ client_id: orgId, product_id: product.id, cart_quantity: 1 })
        .select()
        .single()
      if (!error && data) {
        setCartEntries((prev) => [...prev, data as CartEntry])
        toast.success(`${product.name} added to cart`)
      } else if (error) {
        toast.error('Failed: ' + error.message)
      }
    }
    setBusyId(null)
  }

  return (
    <>
      <PageHeader
        title="Product Catalog"
        description="Browse approved supplier products and add them to your cart."
        actions={
          <Button asChild variant="outline">
            <Link href="/client/cart" className="relative">
              <ShoppingCart className="h-4 w-4 me-1.5" />
              Cart
              {cartCount > 0 && (
                <span className="ms-1.5 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#ff6d43] px-1.5 text-[11px] font-semibold text-white">
                  {cartCount}
                </span>
              )}
            </Link>
          </Button>
        }
      />

      {/* Filter bar */}
      <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search products…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border-0 ps-9 shadow-none focus:ring-0"
          />
        </div>
        <Select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} className="w-[180px]">
          {categories.map((c) => (
            <SelectOption key={c} value={c}>{c === 'ALL' ? 'All Categories' : c}</SelectOption>
          ))}
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyMessage>No products found.</EmptyMessage>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((p) => {
            const inCart = cartMap.has(p.id)
            const qty = cartMap.get(p.id)?.cart_quantity ?? 0
            return (
              <div
                key={p.id}
                className="group flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md"
              >
                {/* Image */}
                {p.images?.length > 0 ? (
                  <div className="aspect-[4/3] overflow-hidden bg-gray-50">
                    <img
                      src={p.images[0]}
                      alt={p.name}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                      onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = 'none')}
                    />
                  </div>
                ) : (
                  <div className="flex aspect-[4/3] items-center justify-center bg-gray-50">
                    <Package className="h-9 w-9 text-gray-300" />
                  </div>
                )}
                {/* Content */}
                <div className="flex flex-1 flex-col gap-3 p-4">
                  <div className="min-w-0">
                    <h3 className="truncate text-[15px] font-semibold text-gray-900">{p.name}</h3>
                    <p className="mt-1 line-clamp-2 text-sm leading-5 text-gray-500">
                      {p.description || 'No description'}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="info">{p.category}</Badge>
                    <Badge variant="outline">Lead: {p.lead_time_days}d</Badge>
                    {p.availability_status !== 'AVAILABLE' && (
                      <Badge variant="warning">
                        {p.availability_status.replace(/_/g, ' ')}
                      </Badge>
                    )}
                  </div>
                  <div className="mt-auto pt-1">
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={() => addToCart(p)}
                      disabled={busyId === p.id}
                    >
                      {busyId === p.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin me-1.5" />
                      ) : (
                        <ShoppingCart className="h-3.5 w-3.5 me-1.5" />
                      )}
                      {inCart ? `In cart (${qty})` : 'Add to cart'}
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}

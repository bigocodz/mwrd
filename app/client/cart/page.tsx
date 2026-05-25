'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Loader2, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { PageHeader, Panel, EmptyMessage } from '@/components/app/AppSurface'
import { Button } from '@/components/ui/button'
import type { Database } from '@/lib/supabase/types'

type Product = Database['public']['Tables']['products']['Row']

type CartItem = {
  id: string
  product_id: string
  cart_quantity: number
  alias: string | null
  product: Product
}

export default function ClientCartPage() {
  const supabase = createClient()
  const { orgId } = useAuth()
  const router = useRouter()

  const [items, setItems] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!orgId) return
    setLoading(true)
    ;(supabase as any)
      .from('client_catalog_entries')
      .select('id, product_id, cart_quantity, alias, product:products(*)')
      .eq('client_id', orgId)
      .gt('cart_quantity', 0)
      .then(({ data }: any) => {
        setItems(data ?? [])
        setLoading(false)
      })
  }, [orgId])

  const updateQty = async (id: string, qty: number) => {
    if (qty <= 0) {
      const { error } = await (supabase as any)
        .from('client_catalog_entries')
        .update({ cart_quantity: 0 })
        .eq('id', id)
      if (!error) setItems((prev) => prev.filter((i) => i.id !== id))
    } else {
      const { error } = await (supabase as any)
        .from('client_catalog_entries')
        .update({ cart_quantity: qty })
        .eq('id', id)
      if (!error) setItems((prev) => prev.map((i) => (i.id === id ? { ...i, cart_quantity: qty } : i)))
    }
  }

  const createRfq = async () => {
    if (!orgId || items.length === 0) return
    setBusy(true)
    try {
      // Create RFQ record
      const { data: rfq, error: rfqError } = await supabase
        .from('rfqs')
        .insert({ client_id: orgId, status: 'OPEN' })
        .select()
        .single()
      if (rfqError) throw rfqError

      // Create RFQ items from cart
      const rfqItems = items.map((item) => ({
        rfq_id: rfq.id,
        product_id: item.product_id,
        quantity: item.cart_quantity,
        description: item.alias || item.product.name,
      }))
      const { error: itemsError } = await (supabase as any).from('rfq_items').insert(rfqItems)
      if (itemsError) throw itemsError

      // Clear cart
      const ids = items.map((i) => i.id)
      await (supabase as any)
        .from('client_catalog_entries')
        .update({ cart_quantity: 0 })
        .in('id', ids)

      toast.success('RFQ created from cart')
      router.push(`/client/rfqs/${rfq.id}`)
    } catch (err: unknown) {
      toast.error((err as Error).message ?? 'Failed to create RFQ')
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <>
      <PageHeader
        title="Cart"
        description="Review items before submitting an RFQ to suppliers."
      />

      {items.length === 0 ? (
        <div className="py-16 text-center">
          <ShoppingBag className="mx-auto mb-4 h-12 w-12 text-gray-300" />
          <p className="text-lg font-medium text-gray-700">Your cart is empty</p>
          <p className="mt-1 text-sm text-gray-500">Browse the catalog to add products.</p>
          <Button asChild className="mt-4">
            <Link href="/client/catalog">Browse Catalog</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Cart items */}
          <div className="lg:col-span-2">
            <Panel title={`${items.length} item${items.length !== 1 ? 's' : ''}`}>
              <div className="divide-y divide-gray-100">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center gap-4 py-4">
                    {item.product.images?.length > 0 ? (
                      <img
                        src={item.product.images[0]}
                        alt={item.product.name}
                        className="h-16 w-16 shrink-0 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-gray-100">
                        <ShoppingBag className="h-6 w-6 text-gray-400" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900">{item.alias || item.product.name}</p>
                      <p className="mt-0.5 text-xs text-gray-500">
                        {item.product.category} · Lead: {item.product.lead_time_days}d
                      </p>
                    </div>
                    {/* Qty controls */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => updateQty(item.id, item.cart_quantity - 1)}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-8 text-center text-sm font-medium">{item.cart_quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateQty(item.id, item.cart_quantity + 1)}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => updateQty(item.id, 0)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-red-500 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </Panel>
          </div>

          {/* Summary + checkout */}
          <div>
            <Panel title="Summary">
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Items</span>
                  <span className="font-medium">{items.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Total qty</span>
                  <span className="font-medium">
                    {items.reduce((sum, i) => sum + i.cart_quantity, 0)}
                  </span>
                </div>
                <p className="text-xs text-gray-400">
                  Pricing is determined after suppliers respond to your RFQ.
                </p>
              </div>
              <Button className="mt-5 w-full" onClick={createRfq} disabled={busy}>
                {busy && <Loader2 className="h-4 w-4 animate-spin me-1.5" />}
                Submit RFQ
              </Button>
              <Button asChild variant="outline" className="mt-2 w-full">
                <Link href="/client/rfqs/create">Custom RFQ</Link>
              </Button>
            </Panel>
          </div>
        </div>
      )}
    </>
  )
}

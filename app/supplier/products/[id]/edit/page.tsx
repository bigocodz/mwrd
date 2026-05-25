'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { PageHeader, Panel } from '@/components/app/AppSurface'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectOption } from '@/components/ui/select'
import { ProductStatusBadge } from '@/components/shared/StatusBadge'
import { ImageListUpload } from '@/components/ui/FileUpload'
import type { Database } from '@/lib/supabase/types'

type Product = Database['public']['Tables']['products']['Row']

const CATEGORIES = [
  'Office Supplies',
  'IT Equipment',
  'Furniture',
  'Cleaning & Janitorial',
  'Safety & Security',
  'Food & Beverages',
  'Medical & Healthcare',
  'Construction & Maintenance',
  'Printing & Stationery',
  'Other',
]

export default function SupplierEditProductPage() {
  const { id } = useParams<{ id: string }>()
  const supabase = createClient()
  const { orgId } = useAuth()
  const router = useRouter()

  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState(CATEGORIES[0])
  const [costPrice, setCostPrice] = useState('')
  const [leadTime, setLeadTime] = useState('7')
  const [availability, setAvailability] = useState<'AVAILABLE' | 'LIMITED_STOCK' | 'OUT_OF_STOCK'>('AVAILABLE')
  const [autoQuote, setAutoQuote] = useState(false)
  const [images, setImages] = useState<string[]>([])

  useEffect(() => {
    if (!id || !orgId) return
    supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .eq('supplier_id', orgId)
      .single()
      .then(({ data }) => {
        if (data) {
          setProduct(data)
          setName(data.name)
          setDescription(data.description ?? '')
          setCategory(data.category)
          setCostPrice(String(data.cost_price))
          setLeadTime(String(data.lead_time_days))
          setAvailability(data.availability_status)
          setAutoQuote(data.auto_quote ?? false)
          setImages(data.images ?? [])
        }
        setLoading(false)
      })
  }, [id, orgId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!product) return
    setSaving(true)
    const { error } = await supabase
      .from('products')
      .update({
        name: name.trim(),
        description: description.trim() || null,
        category,
        cost_price: parseFloat(costPrice) || 0,
        lead_time_days: parseInt(leadTime) || 7,
        availability_status: availability,
        auto_quote: autoQuote,
        images,
        approval_status: 'PENDING',
      })
      .eq('id', product.id)
    if (error) {
      toast.error(error.message)
    } else {
      setProduct((prev) => prev ? { ...prev, approval_status: 'PENDING' } : prev)
      toast.success('Product updated and submitted for re-review')
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!product) {
    return (
      <div className="py-12 text-center text-gray-500">
        Product not found.{' '}
        <Link href="/supplier/products" className="text-[#ff6d43] hover:underline">
          Back to Products
        </Link>
      </div>
    )
  }

  return (
    <>
      <Link
        href="/supplier/products"
        className="mb-5 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Products
      </Link>

      <PageHeader
        title="Edit Product"
        description={<ProductStatusBadge status={product.approval_status} />}
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <Panel title="Product Details">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="name">Product Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-[#ff6d43] focus:outline-none focus:ring-2 focus:ring-[#ff6d43]/20"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="category">Category *</Label>
              <Select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {CATEGORIES.map((c) => (
                  <SelectOption key={c} value={c}>{c}</SelectOption>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="availability">Availability</Label>
              <Select
                id="availability"
                value={availability}
                onChange={(e) => setAvailability(e.target.value as typeof availability)}
              >
                <SelectOption value="AVAILABLE">Available</SelectOption>
                <SelectOption value="LIMITED_STOCK">Limited Stock</SelectOption>
                <SelectOption value="OUT_OF_STOCK">Out of Stock</SelectOption>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cost-price">Cost Price (SAR) *</Label>
              <Input
                id="cost-price"
                type="number"
                min={0}
                step="0.01"
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lead-time">Lead Time (days)</Label>
              <Input
                id="lead-time"
                type="number"
                min={1}
                value={leadTime}
                onChange={(e) => setLeadTime(e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={autoQuote}
                  onChange={(e) => setAutoQuote(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-[#ff6d43] focus:ring-[#ff6d43]"
                />
                <span className="text-sm text-gray-700">Enable auto-quote</span>
              </label>
            </div>
            {orgId && (
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Product Images</Label>
                <ImageListUpload
                  bucket="product-images"
                  path={orgId}
                  images={images}
                  onChange={setImages}
                  maxImages={8}
                />
              </div>
            )}
          </div>
        </Panel>

        <div className="flex gap-3">
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin me-1.5" />}
            Save Changes
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/supplier/products">Cancel</Link>
          </Button>
        </div>
      </form>
    </>
  )
}

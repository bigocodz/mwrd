'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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
import { ImageListUpload } from '@/components/ui/FileUpload'

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

export default function SupplierNewProductPage() {
  const supabase = createClient()
  const { orgId } = useAuth()
  const router = useRouter()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState(CATEGORIES[0])
  const [costPrice, setCostPrice] = useState('')
  const [leadTime, setLeadTime] = useState('7')
  const [availability, setAvailability] = useState<'AVAILABLE' | 'LIMITED_STOCK' | 'OUT_OF_STOCK'>('AVAILABLE')
  const [autoQuote, setAutoQuote] = useState(false)
  const [images, setImages] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!orgId) return
    if (!name.trim()) { toast.error('Product name is required'); return }
    if (!costPrice || isNaN(parseFloat(costPrice))) { toast.error('Valid cost price is required'); return }

    setSubmitting(true)
    try {
      const { data: product, error } = await supabase
        .from('products')
        .insert({
          supplier_id: orgId,
          name: name.trim(),
          description: description.trim() || null,
          category,
          cost_price: parseFloat(costPrice),
          lead_time_days: parseInt(leadTime) || 7,
          availability_status: availability,
          approval_status: 'PENDING',
          auto_quote: autoQuote,
          images,
        })
        .select()
        .single()
      if (error) throw error

      toast.success('Product submitted for review')
      router.push(`/supplier/products/${product.id}/edit`)
    } catch (err: unknown) {
      toast.error((err as Error).message ?? 'Failed to create product')
    } finally {
      setSubmitting(false)
    }
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
        title="Add New Product"
        description="Submit a product for admin review. It will be visible in the catalog once approved."
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
                placeholder="e.g. A4 Copy Paper 80gsm"
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
                placeholder="Describe the product, specifications, etc."
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
                placeholder="0.00"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lead-time">Lead Time (days) *</Label>
              <Input
                id="lead-time"
                type="number"
                min={1}
                value={leadTime}
                onChange={(e) => setLeadTime(e.target.value)}
                required
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
                <span className="text-sm text-gray-700">
                  Enable auto-quote — automatically include this product in RFQ responses
                </span>
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
          <Button type="submit" disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin me-1.5" />}
            Submit for Review
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/supplier/products">Cancel</Link>
          </Button>
        </div>
      </form>
    </>
  )
}

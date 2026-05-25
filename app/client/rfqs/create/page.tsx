'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { PageHeader, Panel } from '@/components/app/AppSurface'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type LineItem = {
  description: string
  quantity: string
  unit: string
  notes: string
}

const emptyLine = (): LineItem => ({ description: '', quantity: '1', unit: 'pcs', notes: '' })

export default function ClientCreateRfqPage() {
  const supabase = createClient()
  const { orgId } = useAuth()
  const router = useRouter()

  const [category, setCategory] = useState('')
  const [deliveryLocation, setDeliveryLocation] = useState('')
  const [requiredBy, setRequiredBy] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState<LineItem[]>([emptyLine()])
  const [submitting, setSubmitting] = useState(false)

  const addLine = () => setLines((prev) => [...prev, emptyLine()])
  const removeLine = (i: number) => setLines((prev) => prev.filter((_, idx) => idx !== i))
  const updateLine = (i: number, field: keyof LineItem, val: string) =>
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, [field]: val } : l)))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!orgId) return
    if (lines.every((l) => !l.description.trim())) {
      toast.error('Add at least one line item')
      return
    }
    setSubmitting(true)
    try {
      const { data: rfq, error: rfqError } = await supabase
        .from('rfqs')
        .insert({
          client_id: orgId,
          status: 'OPEN',
          category: category.trim() || null,
          delivery_location: deliveryLocation.trim() || null,
          required_by: requiredBy || null,
          expiry_date: expiryDate || null,
          notes: notes.trim() || null,
        })
        .select()
        .single()
      if (rfqError) throw rfqError

      const validLines = lines.filter((l) => l.description.trim())
      if (validLines.length > 0) {
        const { error: itemsError } = await (supabase as any).from('rfq_items').insert(
          validLines.map((l) => ({
            rfq_id: rfq.id,
            description: l.description.trim(),
            quantity: parseInt(l.quantity) || 1,
            unit: l.unit.trim() || 'pcs',
            notes: l.notes.trim() || null,
          })),
        )
        if (itemsError) throw itemsError
      }

      toast.success('RFQ submitted successfully')
      router.push(`/client/rfqs/${rfq.id}`)
    } catch (err: unknown) {
      toast.error((err as Error).message ?? 'Failed to create RFQ')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <Link
        href="/client/rfqs"
        className="mb-5 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to RFQs
      </Link>

      <PageHeader title="New RFQ" description="Submit a request for quotation to our supplier network." />

      <form onSubmit={handleSubmit} className="space-y-6">
        <Panel title="Request Details">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. Office Supplies, IT Equipment…"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="delivery">Delivery Location</Label>
              <Input
                id="delivery"
                value={deliveryLocation}
                onChange={(e) => setDeliveryLocation(e.target.value)}
                placeholder="City or address"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="required-by">Required By</Label>
              <Input
                id="required-by"
                type="date"
                value={requiredBy}
                onChange={(e) => setRequiredBy(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="expiry">Quote Deadline</Label>
              <Input
                id="expiry"
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-[#ff6d43] focus:outline-none focus:ring-2 focus:ring-[#ff6d43]/20"
                placeholder="Any additional requirements or specifications…"
              />
            </div>
          </div>
        </Panel>

        <Panel
          title="Line Items"
          description="Specify what you need. Pricing will be provided by suppliers."
          actions={
            <Button type="button" variant="outline" size="sm" onClick={addLine}>
              <Plus className="h-3.5 w-3.5 me-1" />
              Add line
            </Button>
          }
        >
          <div className="space-y-3">
            {lines.map((line, i) => (
              <div key={i} className="grid gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3 sm:grid-cols-12">
                <div className="sm:col-span-5 space-y-1">
                  <Label className="text-xs text-gray-500">Description *</Label>
                  <Input
                    value={line.description}
                    onChange={(e) => updateLine(i, 'description', e.target.value)}
                    placeholder="Product or service name"
                    className="text-sm"
                  />
                </div>
                <div className="sm:col-span-2 space-y-1">
                  <Label className="text-xs text-gray-500">Qty</Label>
                  <Input
                    type="number"
                    min={1}
                    value={line.quantity}
                    onChange={(e) => updateLine(i, 'quantity', e.target.value)}
                    className="text-sm"
                  />
                </div>
                <div className="sm:col-span-2 space-y-1">
                  <Label className="text-xs text-gray-500">Unit</Label>
                  <Input
                    value={line.unit}
                    onChange={(e) => updateLine(i, 'unit', e.target.value)}
                    placeholder="pcs"
                    className="text-sm"
                  />
                </div>
                <div className="sm:col-span-2 space-y-1">
                  <Label className="text-xs text-gray-500">Notes</Label>
                  <Input
                    value={line.notes}
                    onChange={(e) => updateLine(i, 'notes', e.target.value)}
                    placeholder="Optional"
                    className="text-sm"
                  />
                </div>
                <div className="sm:col-span-1 flex items-end justify-center pb-0.5">
                  {lines.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeLine(i)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-red-500 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <div className="flex gap-3">
          <Button type="submit" disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin me-1.5" />}
            Submit RFQ
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/client/rfqs">Cancel</Link>
          </Button>
        </div>
      </form>
    </>
  )
}

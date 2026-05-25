'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, Plus, Send, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { PageHeader, Panel, EmptyMessage } from '@/components/app/AppSurface'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { RfqStatusBadge, QuoteStatusBadge } from '@/components/shared/StatusBadge'
import type { Database } from '@/lib/supabase/types'

type Rfq = Database['public']['Tables']['rfqs']['Row']
type Quote = Database['public']['Tables']['quotes']['Row']

type RfqItem = {
  id: string
  rfq_id: string
  description: string
  quantity: number
  unit: string | null
  notes: string | null
}

type QuoteLine = {
  rfq_item_id: string | null
  description: string
  quantity: string
  unit: string
  unit_price: string
  vat_rate: string
}

const emptyLine = (rfqItem?: RfqItem): QuoteLine => ({
  rfq_item_id: rfqItem?.id ?? null,
  description: rfqItem?.description ?? '',
  quantity: String(rfqItem?.quantity ?? 1),
  unit: rfqItem?.unit ?? 'pcs',
  unit_price: '',
  vat_rate: '15',
})

const fmt = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('en-SA', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'

const sar = (n: number) =>
  new Intl.NumberFormat('en-SA', { style: 'currency', currency: 'SAR' }).format(n)

export default function SupplierRfqDetailPage() {
  const { id } = useParams<{ id: string }>()
  const supabase = createClient()
  const { orgId } = useAuth()
  const router = useRouter()

  const [rfq, setRfq] = useState<Rfq | null>(null)
  const [rfqItems, setRfqItems] = useState<RfqItem[]>([])
  const [existingQuote, setExistingQuote] = useState<Quote | null>(null)
  const [loading, setLoading] = useState(true)

  const [lines, setLines] = useState<QuoteLine[]>([])
  const [supplierNotes, setSupplierNotes] = useState('')
  const [reviewUntil, setReviewUntil] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!id || !orgId) return
    Promise.all([
      supabase.from('rfqs').select('*').eq('id', id).single(),
      (supabase as any).from('rfq_items').select('*').eq('rfq_id', id).order('created_at'),
      supabase.from('quotes').select('*').eq('rfq_id', id).eq('supplier_id', orgId).maybeSingle(),
    ]).then(([{ data: rfqData }, { data: itemData }, { data: quoteData }]) => {
      setRfq(rfqData ?? null)
      const items: RfqItem[] = itemData ?? []
      setRfqItems(items)
      setExistingQuote(quoteData ?? null)
      if (!quoteData && items.length > 0) {
        setLines(items.map((item) => emptyLine(item)))
      } else if (!quoteData) {
        setLines([emptyLine()])
      }
      setLoading(false)
    })
  }, [id, orgId])

  const addLine = () => setLines((prev) => [...prev, emptyLine()])
  const removeLine = (i: number) => setLines((prev) => prev.filter((_, idx) => idx !== i))
  const updateLine = (i: number, field: keyof QuoteLine, val: string) =>
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, [field]: val } : l)))

  const subtotal = lines.reduce((sum, l) => {
    const price = parseFloat(l.unit_price) || 0
    const qty = parseInt(l.quantity) || 1
    return sum + price * qty
  }, 0)
  const vat = lines.reduce((sum, l) => {
    const price = parseFloat(l.unit_price) || 0
    const qty = parseInt(l.quantity) || 1
    const rate = parseFloat(l.vat_rate) || 15
    return sum + price * qty * (rate / 100)
  }, 0)

  const submitQuote = async () => {
    if (!orgId || !rfq) return
    const validLines = lines.filter((l) => l.description.trim() && l.unit_price)
    if (validLines.length === 0) {
      toast.error('Add at least one priced line item')
      return
    }
    setSubmitting(true)
    try {
      const { data: quote, error: quoteError } = await supabase
        .from('quotes')
        .insert({
          rfq_id: rfq.id,
          supplier_id: orgId,
          status: 'PENDING_ADMIN',
          source: 'MANUAL',
          supplier_notes: supplierNotes.trim() || null,
          review_until: reviewUntil || null,
        })
        .select()
        .single()
      if (quoteError) throw quoteError

      const { error: itemsError } = await (supabase as any).from('quote_items').insert(
        validLines.map((l) => ({
          quote_id: quote.id,
          rfq_item_id: l.rfq_item_id,
          description: l.description.trim(),
          quantity: parseInt(l.quantity) || 1,
          unit: l.unit.trim() || 'pcs',
          unit_price: parseFloat(l.unit_price),
          vat_rate: parseFloat(l.vat_rate) || 15,
          total_price:
            parseFloat(l.unit_price) *
            (parseInt(l.quantity) || 1) *
            (1 + (parseFloat(l.vat_rate) || 15) / 100),
        })),
      )
      if (itemsError) throw itemsError

      toast.success('Quote submitted for admin review')
      setExistingQuote(quote)
      router.push('/supplier/quotes')
    } catch (err: unknown) {
      toast.error((err as Error).message ?? 'Failed to submit quote')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!rfq) {
    return (
      <div className="py-12 text-center text-gray-500">
        RFQ not found.{' '}
        <Link href="/supplier/rfqs" className="text-[#ff6d43] hover:underline">
          Back to RFQs
        </Link>
      </div>
    )
  }

  return (
    <>
      <Link
        href="/supplier/rfqs"
        className="mb-5 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to RFQs
      </Link>

      <PageHeader
        title="RFQ Details"
        description={
          <span className="flex flex-wrap items-center gap-2">
            <RfqStatusBadge status={rfq.status} />
            {rfq.category && <Badge variant="info">{rfq.category}</Badge>}
          </span>
        }
      />

      <div className="grid gap-6 md:grid-cols-2">
        <Panel title="Request Details">
          <dl className="space-y-2 text-sm">
            <Row label="RFQ ID" value={<span className="font-mono text-xs">{rfq.id}</span>} />
            <Row label="Category" value={rfq.category || '—'} />
            <Row label="Required By" value={fmt(rfq.required_by)} />
            <Row label="Quote Deadline" value={fmt(rfq.expiry_date)} />
            <Row label="Delivery Location" value={rfq.delivery_location || '—'} />
            <Row label="Created" value={fmt(rfq.created_at)} />
            {rfq.notes && <Row label="Notes" value={rfq.notes} />}
          </dl>
        </Panel>

        <Panel title={`Line Items Requested (${rfqItems.length})`}>
          {rfqItems.length === 0 ? (
            <EmptyMessage>No specific items listed.</EmptyMessage>
          ) : (
            <div className="space-y-2">
              {rfqItems.map((item, i) => (
                <div key={item.id} className="rounded-lg border border-gray-100 bg-gray-50 p-3 text-sm">
                  <p className="font-medium text-gray-900">
                    {i + 1}. {item.description}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    Qty: {item.quantity} {item.unit || 'pcs'}
                    {item.notes && ` · ${item.notes}`}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      {existingQuote ? (
        <Panel className="mt-6" title="Your Quote">
          <div className="flex items-center gap-3">
            <QuoteStatusBadge status={existingQuote.status} />
            <span className="text-sm text-gray-500">
              Submitted {fmt(existingQuote.created_at)}
            </span>
          </div>
          {existingQuote.supplier_notes && (
            <p className="mt-2 text-sm text-gray-600">{existingQuote.supplier_notes}</p>
          )}
          <p className="mt-3 text-xs text-gray-400">
            Your quote is under review. You'll be notified when it's sent to the client.
          </p>
        </Panel>
      ) : rfq.status !== 'OPEN' ? (
        <Panel className="mt-6" title="Quote Submission Closed">
          <p className="text-sm text-gray-500">
            This RFQ is no longer accepting quotes.
          </p>
        </Panel>
      ) : (
        <Panel
          className="mt-6"
          title="Submit Your Quote"
          description="Price each line item. Your quote will go to admin review before being sent to the client."
          actions={
            <Button type="button" variant="outline" size="sm" onClick={addLine}>
              <Plus className="h-3.5 w-3.5 me-1" />
              Add line
            </Button>
          }
        >
          <div className="space-y-3">
            {lines.map((line, i) => (
              <div
                key={i}
                className="grid gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3 sm:grid-cols-12"
              >
                <div className="sm:col-span-4 space-y-1">
                  <Label className="text-xs text-gray-500">Description *</Label>
                  <Input
                    value={line.description}
                    onChange={(e) => updateLine(i, 'description', e.target.value)}
                    placeholder="Item or service"
                    className="text-sm"
                  />
                </div>
                <div className="sm:col-span-1 space-y-1">
                  <Label className="text-xs text-gray-500">Qty</Label>
                  <Input
                    type="number"
                    min={1}
                    value={line.quantity}
                    onChange={(e) => updateLine(i, 'quantity', e.target.value)}
                    className="text-sm"
                  />
                </div>
                <div className="sm:col-span-1 space-y-1">
                  <Label className="text-xs text-gray-500">Unit</Label>
                  <Input
                    value={line.unit}
                    onChange={(e) => updateLine(i, 'unit', e.target.value)}
                    placeholder="pcs"
                    className="text-sm"
                  />
                </div>
                <div className="sm:col-span-2 space-y-1">
                  <Label className="text-xs text-gray-500">Unit Price (SAR) *</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={line.unit_price}
                    onChange={(e) => updateLine(i, 'unit_price', e.target.value)}
                    placeholder="0.00"
                    className="text-sm"
                  />
                </div>
                <div className="sm:col-span-2 space-y-1">
                  <Label className="text-xs text-gray-500">VAT %</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={line.vat_rate}
                    onChange={(e) => updateLine(i, 'vat_rate', e.target.value)}
                    className="text-sm"
                  />
                </div>
                <div className="sm:col-span-1 space-y-1">
                  <Label className="text-xs text-gray-500">Total</Label>
                  <p className="flex h-9 items-center text-xs font-medium text-gray-700">
                    {sar(
                      (parseFloat(line.unit_price) || 0) *
                        (parseInt(line.quantity) || 1) *
                        (1 + (parseFloat(line.vat_rate) || 15) / 100),
                    )}
                  </p>
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

          {/* Totals */}
          <div className="mt-4 space-y-1 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm">
            <div className="flex justify-between text-gray-500">
              <span>Subtotal</span>
              <span>{sar(subtotal)}</span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>VAT</span>
              <span>{sar(vat)}</span>
            </div>
            <div className="flex justify-between text-base font-semibold text-gray-900">
              <span>Total</span>
              <span>{sar(subtotal + vat)}</span>
            </div>
          </div>

          {/* Notes + review deadline */}
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="supplier-notes">Notes to Client</Label>
              <textarea
                id="supplier-notes"
                value={supplierNotes}
                onChange={(e) => setSupplierNotes(e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-[#ff6d43] focus:outline-none focus:ring-2 focus:ring-[#ff6d43]/20"
                placeholder="Lead time, delivery terms, etc."
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="review-until">Quote Valid Until</Label>
              <Input
                id="review-until"
                type="date"
                value={reviewUntil}
                onChange={(e) => setReviewUntil(e.target.value)}
              />
            </div>
          </div>

          <div className="mt-5">
            <Button onClick={submitQuote} disabled={submitting}>
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin me-1.5" />
              ) : (
                <Send className="h-4 w-4 me-1.5" />
              )}
              Submit Quote for Review
            </Button>
          </div>
        </Panel>
      )}
    </>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <dt className="min-w-[130px] shrink-0 text-gray-500">{label}:</dt>
      <dd className="text-gray-900">{value}</dd>
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, CheckCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { PageHeader, Panel, EmptyMessage } from '@/components/app/AppSurface'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
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

type QuoteItem = {
  id: string
  quote_id: string
  description: string
  quantity: number
  unit: string | null
  unit_price: number
  vat_rate: number | null
  total_price: number | null
}

const fmt = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('en-SA', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'

const sar = (n: number) =>
  new Intl.NumberFormat('en-SA', { style: 'currency', currency: 'SAR' }).format(n)

export default function ClientRfqDetailPage() {
  const { id } = useParams<{ id: string }>()
  const supabase = createClient()
  const { orgId } = useAuth()
  const router = useRouter()

  const [rfq, setRfq] = useState<Rfq | null>(null)
  const [rfqItems, setRfqItems] = useState<RfqItem[]>([])
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [expandedQuote, setExpandedQuote] = useState<string | null>(null)
  const [quoteItems, setQuoteItems] = useState<Record<string, QuoteItem[]>>({})
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState<string | null>(null)

  useEffect(() => {
    if (!id || !orgId) return
    Promise.all([
      supabase.from('rfqs').select('*').eq('id', id).eq('client_id', orgId).single(),
      (supabase as any).from('rfq_items').select('*').eq('rfq_id', id).order('created_at'),
      supabase
        .from('quotes')
        .select('*')
        .eq('rfq_id', id)
        .in('status', ['SENT_TO_CLIENT', 'CLIENT_REVISION_REQUESTED', 'REVISION_SUBMITTED', 'ACCEPTED', 'REJECTED'])
        .order('created_at', { ascending: false }),
    ]).then(([{ data: rfqData }, { data: itemData }, { data: quoteData }]) => {
      setRfq(rfqData ?? null)
      setRfqItems(itemData ?? [])
      setQuotes(quoteData ?? [])
      setLoading(false)
    })
  }, [id, orgId])

  const loadQuoteItems = async (quoteId: string) => {
    if (quoteItems[quoteId]) {
      setExpandedQuote(expandedQuote === quoteId ? null : quoteId)
      return
    }
    const { data } = await (supabase as any)
      .from('quote_items')
      .select('*')
      .eq('quote_id', quoteId)
      .order('created_at')
    setQuoteItems((prev) => ({ ...prev, [quoteId]: data ?? [] }))
    setExpandedQuote(quoteId)
  }

  const acceptQuote = async (quote: Quote) => {
    if (!orgId) return
    setAccepting(quote.id)
    try {
      const { data: items } = await (supabase as any)
        .from('quote_items')
        .select('*')
        .eq('quote_id', quote.id)

      const lineItems: QuoteItem[] = items ?? []
      const totalBeforeVat = lineItems.reduce(
        (sum, i) => sum + (i.unit_price ?? 0) * (i.quantity ?? 1),
        0,
      )
      const vatAmount = lineItems.reduce(
        (sum, i) => sum + (i.unit_price ?? 0) * (i.quantity ?? 1) * ((i.vat_rate ?? 15) / 100),
        0,
      )

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          rfq_id: rfq!.id,
          quote_id: quote.id,
          client_id: orgId,
          supplier_id: quote.supplier_id,
          status: 'PENDING_CONFIRMATION',
          total_before_vat: totalBeforeVat,
          total_with_vat: totalBeforeVat + vatAmount,
          delivery_location: rfq!.delivery_location,
          required_by: rfq!.required_by,
          notes: rfq!.notes,
        })
        .select()
        .single()
      if (orderError) throw orderError

      await Promise.all([
        supabase.from('quotes').update({ status: 'ACCEPTED' }).eq('id', quote.id),
        supabase.from('rfqs').update({ status: 'CLOSED' }).eq('id', rfq!.id),
      ])

      toast.success('Quote accepted — order created!')
      router.push(`/client/orders/${order.id}`)
    } catch (err: unknown) {
      toast.error((err as Error).message ?? 'Failed to accept quote')
    } finally {
      setAccepting(null)
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
        <Link href="/client/rfqs" className="text-[#ff6d43] hover:underline">
          Back to RFQs
        </Link>
      </div>
    )
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
            <Row label="Submitted" value={fmt(rfq.created_at)} />
            {rfq.notes && <Row label="Notes" value={rfq.notes} />}
          </dl>
        </Panel>

        <Panel title={`Line Items (${rfqItems.length})`}>
          {rfqItems.length === 0 ? (
            <EmptyMessage>No line items.</EmptyMessage>
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

      <Panel
        className="mt-6"
        title={`Supplier Quotes (${quotes.length})`}
        description="Quotes received from suppliers. Click a row to see pricing."
      >
        {quotes.length === 0 ? (
          <EmptyMessage>No quotes received yet. Check back soon.</EmptyMessage>
        ) : (
          <div className="space-y-3">
            {quotes.map((q) => (
              <div key={q.id} className="overflow-hidden rounded-xl border border-gray-200">
                <div
                  className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-gray-50"
                  onClick={() => loadQuoteItems(q.id)}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs text-gray-400">{q.id.slice(0, 8)}…</span>
                      <QuoteStatusBadge status={q.status} />
                      {q.review_until && (
                        <span className="text-xs text-gray-400">
                          Review by {fmt(q.review_until)}
                        </span>
                      )}
                    </div>
                    {q.supplier_notes && (
                      <p className="mt-1 text-xs text-gray-500">{q.supplier_notes}</p>
                    )}
                  </div>
                  {(q.status === 'SENT_TO_CLIENT' || q.status === 'REVISION_SUBMITTED') && (
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        acceptQuote(q)
                      }}
                      disabled={accepting === q.id}
                    >
                      {accepting === q.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin me-1.5" />
                      ) : (
                        <CheckCircle className="h-3.5 w-3.5 me-1.5" />
                      )}
                      Accept
                    </Button>
                  )}
                </div>

                {expandedQuote === q.id && quoteItems[q.id] && (
                  <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">
                    {quoteItems[q.id].length === 0 ? (
                      <p className="text-xs text-gray-500">No pricing items available.</p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Description</TableHead>
                            <TableHead className="text-right">Qty</TableHead>
                            <TableHead className="text-right">Unit Price</TableHead>
                            <TableHead className="text-right">VAT %</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {quoteItems[q.id].map((qi) => {
                            const subtotal = (qi.unit_price ?? 0) * (qi.quantity ?? 1)
                            const vat = subtotal * ((qi.vat_rate ?? 15) / 100)
                            return (
                              <TableRow key={qi.id}>
                                <TableCell className="text-sm">{qi.description}</TableCell>
                                <TableCell className="text-right text-sm">{qi.quantity}</TableCell>
                                <TableCell className="text-right text-sm">{sar(qi.unit_price ?? 0)}</TableCell>
                                <TableCell className="text-right text-sm">{qi.vat_rate ?? 15}%</TableCell>
                                <TableCell className="text-right text-sm font-medium">
                                  {sar(subtotal + vat)}
                                </TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    )}
                    {quoteItems[q.id].length > 0 && (() => {
                      const beforeVat = quoteItems[q.id].reduce(
                        (s, i) => s + (i.unit_price ?? 0) * (i.quantity ?? 1),
                        0,
                      )
                      const vat = quoteItems[q.id].reduce(
                        (s, i) => s + (i.unit_price ?? 0) * (i.quantity ?? 1) * ((i.vat_rate ?? 15) / 100),
                        0,
                      )
                      return (
                        <div className="mt-3 space-y-1 border-t border-gray-200 pt-3 text-sm">
                          <div className="flex justify-between text-gray-500">
                            <span>Subtotal</span>
                            <span>{sar(beforeVat)}</span>
                          </div>
                          <div className="flex justify-between text-gray-500">
                            <span>VAT</span>
                            <span>{sar(vat)}</span>
                          </div>
                          <div className="flex justify-between font-semibold text-gray-900">
                            <span>Total</span>
                            <span>{sar(beforeVat + vat)}</span>
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Panel>
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

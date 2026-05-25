'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Panel } from '@/components/app/AppSurface'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { RfqStatusBadge, QuoteStatusBadge } from '@/components/shared/StatusBadge'
import { Badge } from '@/components/ui/badge'
import type { Database } from '@/lib/supabase/types'

type Rfq = Database['public']['Tables']['rfqs']['Row']
type Quote = Database['public']['Tables']['quotes']['Row']

const fmt = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('en-SA', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'

export default function AdminRfqDetailPage() {
  const { id } = useParams<{ id: string }>()
  const supabase = createClient()
  const [rfq, setRfq] = useState<Rfq | null>(null)
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    Promise.all([
      supabase.from('rfqs').select('*').eq('id', id).single(),
      supabase.from('quotes').select('*').eq('rfq_id', id).order('created_at', { ascending: false }),
    ]).then(([{ data: rfqData }, { data: quoteData }]) => {
      setRfq(rfqData ?? null)
      setQuotes(quoteData ?? [])
      setLoading(false)
    })
  }, [id])

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
        <Link href="/admin/rfqs" className="text-[#ff6d43] hover:underline">
          Back to RFQs
        </Link>
      </div>
    )
  }

  return (
    <>
      <Link
        href="/admin/rfqs"
        className="mb-5 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to RFQs
      </Link>

      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-gray-900">RFQ</h1>
            <span className="font-mono text-sm text-gray-400">{rfq.id.slice(0, 8)}…</span>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <RfqStatusBadge status={rfq.status} />
            {rfq.category && <Badge variant="info">{rfq.category}</Badge>}
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Panel title="RFQ Details">
          <dl className="space-y-2 text-sm">
            <Row label="Client" value={<span className="font-mono">{rfq.client_id.slice(0, 16)}…</span>} />
            <Row label="Status" value={<RfqStatusBadge status={rfq.status} />} />
            <Row label="Category" value={rfq.category || '—'} />
            <Row label="Required By" value={fmt(rfq.required_by)} />
            <Row label="Expires" value={fmt(rfq.expiry_date)} />
            <Row label="Delivery Location" value={rfq.delivery_location || '—'} />
            <Row label="Created" value={fmt(rfq.created_at)} />
            {rfq.notes && <Row label="Notes" value={rfq.notes} />}
          </dl>
        </Panel>
      </div>

      {/* Quotes comparison */}
      <Panel className="mt-6" title={`Quotes (${quotes.length})`} description="All quotes received for this RFQ.">
        {quotes.length === 0 ? (
          <p className="text-sm text-gray-500">No quotes received yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Quote ID</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Revisions</TableHead>
                <TableHead>Review Until</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quotes.map((q) => (
                <TableRow key={q.id}>
                  <TableCell className="font-mono text-xs">{q.id.slice(0, 8)}…</TableCell>
                  <TableCell className="font-mono text-xs text-gray-500">{q.supplier_id.slice(0, 8)}…</TableCell>
                  <TableCell><QuoteStatusBadge status={q.status} /></TableCell>
                  <TableCell>
                    <Badge variant={q.source === 'MANUAL' ? 'default' : 'info'}>
                      {q.source ?? 'MANUAL'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">{q.revision_count ?? 0}</TableCell>
                  <TableCell className="text-sm text-gray-500">{fmt(q.review_until)}</TableCell>
                  <TableCell className="text-sm text-gray-500">{fmt(q.created_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Panel>
    </>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <dt className="min-w-[140px] shrink-0 text-gray-500">{label}:</dt>
      <dd className="text-gray-900">{value}</dd>
    </div>
  )
}

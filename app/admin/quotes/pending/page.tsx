'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Send, X } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { PageHeader, Panel, SkeletonLine, EmptyMessage } from '@/components/app/AppSurface'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { QuoteStatusBadge } from '@/components/shared/StatusBadge'
import { Badge } from '@/components/ui/badge'
import type { Database } from '@/lib/supabase/types'

type Quote = Database['public']['Tables']['quotes']['Row']

export default function AdminPendingQuotesPage() {
  const supabase = createClient()
  const router = useRouter()

  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    supabase
      .from('quotes')
      .select('*')
      .eq('status', 'PENDING_ADMIN')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setQuotes(data ?? [])
        setLoading(false)
      })
  }

  useEffect(() => { load() }, [])

  const sendToClient = async (id: string) => {
    setActing(id)
    const { error } = await supabase
      .from('quotes')
      .update({ status: 'SENT_TO_CLIENT' })
      .eq('id', id)
    if (error) {
      toast.error('Failed: ' + error.message)
    } else {
      toast.success('Quote sent to client')
      setQuotes((prev) => prev.filter((q) => q.id !== id))
    }
    setActing(null)
  }

  const reject = async (id: string) => {
    if (!confirm('Reject this quote?')) return
    setActing(id)
    const { error } = await supabase
      .from('quotes')
      .update({ status: 'REJECTED' })
      .eq('id', id)
    if (error) {
      toast.error('Failed: ' + error.message)
    } else {
      toast.success('Quote rejected')
      setQuotes((prev) => prev.filter((q) => q.id !== id))
    }
    setActing(null)
  }

  const fmt = (d: string) =>
    new Date(d).toLocaleDateString('en-SA', { year: 'numeric', month: 'short', day: 'numeric' })

  return (
    <>
      <PageHeader
        title="Quote Review"
        description="Review and send quotes to clients, or reject them back to the supplier."
      />

      <Panel>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => <SkeletonLine key={i} className="h-12 w-full" />)}
          </div>
        ) : quotes.length === 0 ? (
          <EmptyMessage>No quotes pending review. All caught up!</EmptyMessage>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Quote ID</TableHead>
                <TableHead>RFQ</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Review Until</TableHead>
                <TableHead>Revisions</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quotes.map((q) => (
                <TableRow key={q.id}>
                  <TableCell className="font-mono text-xs">{q.id.slice(0, 8)}…</TableCell>
                  <TableCell className="font-mono text-xs text-gray-500">{q.rfq_id.slice(0, 8)}…</TableCell>
                  <TableCell className="font-mono text-xs text-gray-500">{q.supplier_id.slice(0, 8)}…</TableCell>
                  <TableCell>
                    <Badge variant={q.source === 'MANUAL' ? 'default' : 'info'}>
                      {q.source ?? 'MANUAL'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{q.review_until ? fmt(q.review_until) : '—'}</TableCell>
                  <TableCell className="text-center">{q.revision_count ?? 0}</TableCell>
                  <TableCell className="text-gray-500 text-sm">{fmt(q.created_at)}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => sendToClient(q.id)}
                        disabled={acting === q.id}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#ff6d43] px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                        title="Send to client"
                      >
                        <Send className="h-3.5 w-3.5" />
                        Send
                      </button>
                      <button
                        type="button"
                        onClick={() => reject(q.id)}
                        disabled={acting === q.id}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-red-500 transition-colors hover:bg-red-50 disabled:opacity-40"
                        title="Reject"
                      >
                        <X className="h-4 w-4" />
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

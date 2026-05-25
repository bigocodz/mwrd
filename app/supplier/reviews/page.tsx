'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { PageHeader, Panel, EmptyMessage } from '@/components/app/AppSurface'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Select, SelectOption } from '@/components/ui/select'
import { PaginationControls, paginate, totalPages } from '@/components/shared/Pagination'

const PAGE_SIZE = 20

type Review = {
  id: string
  supplier_id: string
  order_id: string
  rating: number
  comment: string | null
  created_at: string
}

type RatingFilter = 'ALL' | '5' | '4' | '3' | '2' | '1'

const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-SA', { year: 'numeric', month: 'short', day: 'numeric' })

export default function SupplierReviewsPage() {
  const supabase = createClient()
  const { orgId } = useAuth()
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<RatingFilter>('ALL')
  const [page, setPage] = useState(1)

  useEffect(() => {
    if (!orgId) return
    setLoading(true)
    const run = async () => {
      let q = (supabase as any).from('reviews').select('*').eq('supplier_id', orgId).order('created_at', { ascending: false })
      if (filter !== 'ALL') {
        q = q.eq('rating', Number(filter))
      }
      const { data, error } = await q
      if (error) {
        toast.error(error.message)
      } else {
        setReviews(data ?? [])
      }
      setLoading(false)
    }
    run()
  }, [orgId, filter])

  useEffect(() => { setPage(1) }, [filter])

  const paged = paginate(reviews, page, PAGE_SIZE)
  const total = reviews.length
  const pages = totalPages(total, PAGE_SIZE)

  return (
    <div className="space-y-6">
      <PageHeader title="Reviews" description="Client feedback on your orders." />
      <Panel
        title="Reviews"
        actions={
          <Select value={filter} onChange={e => setFilter(e.target.value as RatingFilter)}>
            <SelectOption value="ALL">All Ratings</SelectOption>
            <SelectOption value="5">5 Stars</SelectOption>
            <SelectOption value="4">4 Stars</SelectOption>
            <SelectOption value="3">3 Stars</SelectOption>
            <SelectOption value="2">2 Stars</SelectOption>
            <SelectOption value="1">1 Star</SelectOption>
          </Select>
        }
      >
        {loading ? (
          <p className="text-sm text-gray-500">Loading...</p>
        ) : reviews.length === 0 ? (
          <EmptyMessage>No reviews found.</EmptyMessage>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Comment</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.order_id?.slice(0, 8) ?? '—'}</TableCell>
                    <TableCell className="text-amber-500">{'★★★★★'.slice(0, r.rating)}</TableCell>
                    <TableCell className="max-w-xs">
                      {r.comment ? (r.comment.length > 80 ? r.comment.slice(0, 80) + '…' : r.comment) : '—'}
                    </TableCell>
                    <TableCell>{fmtDate(r.created_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <PaginationControls page={page} totalPages={pages} total={total} onPageChange={setPage} className="mt-4" />
          </>
        )}
      </Panel>
    </div>
  )
}

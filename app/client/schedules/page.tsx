'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { PageHeader, Panel, SkeletonLine, EmptyMessage } from '@/components/app/AppSurface'
import { Badge } from '@/components/ui/badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'

type Schedule = {
  id: string
  rfq_id: string | null
  frequency: string | null
  next_run: string | null
  last_run: string | null
  active: boolean | null
  client_id: string
}

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('en-SA', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'

export default function SchedulesPage() {
  const { orgId, loading: authLoading } = useAuth()
  const supabase = createClient()

  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (authLoading || !orgId) return

    const fetch = async () => {
      setLoading(true)
      const { data } = await (supabase as any)
        .from('rfq_schedules')
        .select('*')
        .eq('client_id', orgId)
        .order('created_at', { ascending: false })

      setSchedules(data ?? [])
      setLoading(false)
    }

    fetch()
  }, [orgId, authLoading])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Repeat RFQs"
        description="Scheduled and recurring procurement requests."
      />

      <Panel>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonLine key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : schedules.length === 0 ? (
          <EmptyMessage>No scheduled RFQs found.</EmptyMessage>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>RFQ</TableHead>
                <TableHead>Frequency</TableHead>
                <TableHead>Next Run</TableHead>
                <TableHead>Last Run</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {schedules.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-mono text-sm text-gray-500">
                    {s.id.slice(0, 8)}…
                  </TableCell>
                  <TableCell className="font-mono text-sm text-gray-500">
                    {s.rfq_id ? s.rfq_id.slice(0, 8) + '…' : '—'}
                  </TableCell>
                  <TableCell>
                    {s.frequency ? (
                      <Badge variant="outline">{s.frequency}</Badge>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell>{fmtDate(s.next_run)}</TableCell>
                  <TableCell>{fmtDate(s.last_run)}</TableCell>
                  <TableCell>
                    {s.active ? (
                      <Badge variant="success">Active</Badge>
                    ) : (
                      <Badge variant="default">Paused</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Panel>
    </div>
  )
}

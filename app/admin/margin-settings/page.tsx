'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PageHeader, Panel, SkeletonLine, EmptyMessage } from '@/components/app/AppSurface'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'

export default function AdminMarginSettingsPage() {
  const supabase = createClient()
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    ;(supabase as any)
      .from('margin_settings')
      .select('*')
      .order('category', { ascending: true })
      .then(({ data }: any) => {
        setItems(data ?? [])
        setLoading(false)
      })
  }, [])

  const fmtPct = (n: number | null) => (n != null ? `${n}%` : '—')

  return (
    <>
      <PageHeader
        title="Margin Settings"
        description="Configure minimum, maximum, and default margin rates per category."
      />
      <Panel>
        {loading ? (
          <div className="space-y-3">
            <SkeletonLine className="h-8 w-full" />
            <SkeletonLine className="h-8 w-full" />
            <SkeletonLine className="h-8 w-full" />
          </div>
        ) : items.length === 0 ? (
          <EmptyMessage>No margin settings found.</EmptyMessage>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Min Margin</TableHead>
                <TableHead>Max Margin</TableHead>
                <TableHead>Default Margin</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item: any) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-xs text-gray-500">{item.id?.slice(0, 8)}…</TableCell>
                  <TableCell className="font-medium text-gray-900">{item.category ?? '—'}</TableCell>
                  <TableCell className="text-gray-700">{fmtPct(item.min_margin)}</TableCell>
                  <TableCell className="text-gray-700">{fmtPct(item.max_margin)}</TableCell>
                  <TableCell className="text-gray-700">{fmtPct(item.default_margin)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Panel>
    </>
  )
}

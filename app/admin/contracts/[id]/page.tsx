'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Panel } from '@/components/app/AppSurface'
import { Badge } from '@/components/ui/badge'

type Contract = {
  id: string
  client_id: string
  title: string
  status: string
  start_date: string | null
  end_date: string | null
  total_value: number | null
  notes: string | null
  created_at: string
}

const SAR = (n: number) =>
  new Intl.NumberFormat('en-SA', { style: 'currency', currency: 'SAR', maximumFractionDigits: 0 }).format(n)
const fmt = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('en-SA', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'

export default function AdminContractDetailPage() {
  const { id } = useParams<{ id: string }>()
  const supabase = createClient()
  const [contract, setContract] = useState<Contract | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    ;(supabase as any)
      .from('contracts')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data }: any) => {
        setContract(data ?? null)
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

  if (!contract) {
    return (
      <div className="py-12 text-center text-gray-500">
        Contract not found.{' '}
        <Link href="/admin/contracts" className="text-[#ff6d43] hover:underline">Back to contracts</Link>
      </div>
    )
  }

  return (
    <>
      <Link href="/admin/contracts" className="mb-5 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900">
        <ArrowLeft className="h-4 w-4" />
        Back to Contracts
      </Link>

      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{contract.title}</h1>
          <Badge className="mt-1.5">{contract.status}</Badge>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Panel title="Contract Details">
          <dl className="space-y-2 text-sm">
            <Row label="Client" value={<span className="font-mono">{contract.client_id.slice(0, 16)}…</span>} />
            <Row label="Status" value={contract.status} />
            <Row label="Total Value" value={contract.total_value ? SAR(contract.total_value) : '—'} />
            <Row label="Start Date" value={fmt(contract.start_date)} />
            <Row label="End Date" value={fmt(contract.end_date)} />
            <Row label="Created" value={fmt(contract.created_at)} />
          </dl>
        </Panel>

        {contract.notes && (
          <Panel title="Notes">
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{contract.notes}</p>
          </Panel>
        )}
      </div>
    </>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <dt className="min-w-[120px] shrink-0 text-gray-500">{label}:</dt>
      <dd className="text-gray-900">{value}</dd>
    </div>
  )
}

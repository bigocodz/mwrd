'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { PageHeader, Panel } from '@/components/app/AppSurface'
import { KycBadge } from '@/components/shared/StatusBadge'
import type { Database } from '@/lib/supabase/types'

type Profile = Database['public']['Tables']['profiles']['Row']

const REQUIRED_DOCS = [
  'Commercial Registration (CR)',
  'VAT Certificate',
  'Company Stamp / Seal',
  'Authorized Signatory Letter',
]

export default function SupplierKycPage() {
  const supabase = createClient()
  const { orgId } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!orgId) return
    const run = async () => {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', orgId).single()
      if (error) {
        toast.error(error.message)
      } else {
        setProfile(data)
      }
      setLoading(false)
    }
    run()
  }, [orgId])

  return (
    <div className="space-y-6">
      <PageHeader title="KYC & Documents" description="Your verification status and submitted documents." />
      <Panel title="Verification Status">
        {loading ? (
          <p className="text-sm text-gray-500">Loading...</p>
        ) : profile ? (
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-700">KYC Status:</span>
            <KycBadge status={profile.kyc_status} />
          </div>
        ) : null}
      </Panel>
      <Panel title="Company Information">
        {loading ? (
          <p className="text-sm text-gray-500">Loading...</p>
        ) : profile ? (
          <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
            {[
              { label: 'Company Name', value: profile.company_name },
              { label: 'CR Number', value: profile.cr_number },
              { label: 'VAT Number', value: profile.vat_number },
              { label: 'Legal Name (EN)', value: profile.legal_name_en },
              { label: 'Legal Name (AR)', value: profile.legal_name_ar },
              { label: 'National Address', value: profile.national_address ? JSON.stringify(profile.national_address) : null },
              { label: 'IBAN', value: profile.iban },
              { label: 'Bank Name', value: profile.bank_name },
              { label: 'Phone', value: profile.phone },
            ].map(({ label, value }) => (
              <div key={label} className="min-w-0">
                <dt className="text-xs font-semibold text-gray-400">{label}</dt>
                <dd className="mt-0.5 text-sm text-gray-900">{value ?? '—'}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </Panel>
      <Panel title="Required Documents">
        <ul className="space-y-3">
          {REQUIRED_DOCS.map(doc => (
            <li key={doc} className="flex items-center gap-3 text-sm text-gray-700">
              <span className="text-gray-400">○</span>
              {doc}
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  )
}

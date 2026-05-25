'use client'

import { useAuth } from '@/hooks/useAuth'
import { PageHeader, Panel, SkeletonLine } from '@/components/app/AppSurface'
import { KycBadge } from '@/components/shared/StatusBadge'

type FieldProps = {
  label: string
  value: string | null | undefined
}

function Field({ label, value }: FieldProps) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</dt>
      <dd className="mt-1 text-sm text-gray-900 break-words">{value ?? '—'}</dd>
    </div>
  )
}

export default function OrganizationPage() {
  const { profile, loading } = useAuth()

  const nationalAddressStr =
    profile?.national_address != null
      ? JSON.stringify(profile.national_address)
      : null

  return (
    <div className="space-y-6">
      <PageHeader
        title="Organization"
        description="Your company profile and legal entity details."
      />

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonLine key={i} className="h-8 w-full" />
          ))}
        </div>
      ) : (
        <>
          <Panel title="Company Details">
            <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Company Name" value={profile?.company_name} />
              <Field label="Legal Name (EN)" value={profile?.legal_name_en} />
              <Field label="Legal Name (AR)" value={profile?.legal_name_ar} />
              <Field label="CR Number" value={profile?.cr_number} />
              <Field label="VAT Number" value={profile?.vat_number} />
              <Field label="Phone" value={profile?.phone} />
              <Field label="IBAN" value={profile?.iban} />
              <Field label="Bank Name" value={profile?.bank_name} />
              <div className="sm:col-span-2 lg:col-span-3">
                <Field label="National Address" value={nationalAddressStr} />
              </div>
            </dl>
          </Panel>

          <Panel title="KYC Status">
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">Verification status:</span>
              {profile?.kyc_status ? (
                <KycBadge status={profile.kyc_status} />
              ) : (
                <span className="text-sm text-gray-400">—</span>
              )}
            </div>
          </Panel>

          <Panel title="Wafeq Integration">
            <dl>
              <Field label="Wafeq Contact ID" value={profile?.wafeq_contact_id} />
            </dl>
          </Panel>
        </>
      )}
    </div>
  )
}

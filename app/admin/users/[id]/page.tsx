'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, Save, Snowflake, Sun } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { PageHeader, Panel } from '@/components/app/AppSurface'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectOption } from '@/components/ui/select'
import { ProfileStatusBadge, KycBadge, RoleBadge } from '@/components/shared/StatusBadge'
import type { Database } from '@/lib/supabase/types'

type Profile = Database['public']['Tables']['profiles']['Row']

const fmt = (d: string) =>
  new Date(d).toLocaleString('en-SA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

export default function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()

  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [freezing, setFreezing] = useState(false)
  const [showFreezeForm, setShowFreezeForm] = useState(false)
  const [freezeReason, setFreezeReason] = useState('')

  // Editable fields
  const [status, setStatus] = useState('')
  const [kycStatus, setKycStatus] = useState('')
  const [creditLimit, setCreditLimit] = useState('')

  useEffect(() => {
    if (!id) return
    supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        setProfile(data ?? null)
        if (data) {
          setStatus(data.status)
          setKycStatus(data.kyc_status)
          setCreditLimit(String(data.credit_limit ?? 0))
        }
        setLoading(false)
      })
  }, [id])

  const handleSave = async () => {
    if (!profile) return
    setSaving(true)
    const { error } = await supabase
      .from('profiles')
      .update({
        status: status as Profile['status'],
        kyc_status: kycStatus as Profile['kyc_status'],
        ...(profile.role === 'CLIENT' ? { credit_limit: parseFloat(creditLimit) || 0 } : {}),
        must_change_password: false,
      })
      .eq('id', profile.id)
    if (error) {
      toast.error('Save failed: ' + error.message)
    } else {
      toast.success('Profile updated')
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              status: status as Profile['status'],
              kyc_status: kycStatus as Profile['kyc_status'],
              credit_limit: parseFloat(creditLimit) || 0,
            }
          : null,
      )
    }
    setSaving(false)
  }

  const handleFreeze = async () => {
    if (!profile || !freezeReason.trim()) return
    setFreezing(true)
    const { error } = await supabase
      .from('profiles')
      .update({ status: 'FROZEN', freeze_reason: freezeReason })
      .eq('id', profile.id)
    if (error) {
      toast.error('Failed to freeze: ' + error.message)
    } else {
      toast.success('Account frozen')
      setProfile((prev) => (prev ? { ...prev, status: 'FROZEN', freeze_reason: freezeReason } : null))
      setStatus('FROZEN')
      setShowFreezeForm(false)
      setFreezeReason('')
    }
    setFreezing(false)
  }

  const handleUnfreeze = async () => {
    if (!profile) return
    setSaving(true)
    const { error } = await supabase
      .from('profiles')
      .update({ status: 'ACTIVE', freeze_reason: null })
      .eq('id', profile.id)
    if (error) {
      toast.error('Failed to unfreeze: ' + error.message)
    } else {
      toast.success('Account unfrozen')
      setProfile((prev) => (prev ? { ...prev, status: 'ACTIVE', freeze_reason: null } : null))
      setStatus('ACTIVE')
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="py-12 text-center text-gray-500">
        User not found.{' '}
        <Link href="/admin/users" className="text-[#ff6d43] hover:underline">
          Back to users
        </Link>
      </div>
    )
  }

  const isClient = profile.role === 'CLIENT'

  return (
    <>
      <Link
        href="/admin/users"
        className="mb-5 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Users
      </Link>

      <PageHeader
        title={profile.company_name || profile.full_name || 'Unknown'}
        description={
          <span className="flex items-center gap-2">
            <span className="font-mono text-sm">{profile.public_id}</span>
            <RoleBadge role={profile.role} />
            <ProfileStatusBadge status={profile.status} />
          </span>
        }
        actions={
          profile.status === 'FROZEN' ? (
            <Button variant="outline" onClick={handleUnfreeze} disabled={saving}>
              <Sun className="h-4 w-4 me-1.5" />
              Unfreeze
            </Button>
          ) : (
            <Button variant="destructive" onClick={() => setShowFreezeForm(true)}>
              <Snowflake className="h-4 w-4 me-1.5" />
              Freeze Account
            </Button>
          )
        }
      />

      {/* Freeze form inline */}
      {showFreezeForm && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-5">
          <p className="mb-3 text-sm font-medium text-red-800">
            Freeze {profile.company_name ?? 'this account'}? The user won't be able to access the portal.
          </p>
          <div className="mb-3">
            <Label htmlFor="freeze-reason" className="text-red-800">
              Reason (required)
            </Label>
            <textarea
              id="freeze-reason"
              value={freezeReason}
              onChange={(e) => setFreezeReason(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-red-200 bg-white px-3 py-2 text-sm focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-200"
              rows={3}
              placeholder="Explain why this account is being frozen…"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="destructive"
              onClick={handleFreeze}
              disabled={freezing || !freezeReason.trim()}
            >
              {freezing && <Loader2 className="h-4 w-4 animate-spin me-1.5" />}
              Confirm Freeze
            </Button>
            <Button variant="outline" onClick={() => setShowFreezeForm(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Account settings */}
        <Panel title="Account Settings">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Account Status</Label>
              <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full">
                <SelectOption value="ACTIVE">Active</SelectOption>
                <SelectOption value="PENDING">Pending</SelectOption>
                <SelectOption value="REJECTED">Rejected</SelectOption>
                <SelectOption value="DEACTIVATED">Deactivated</SelectOption>
                <SelectOption value="FROZEN">Frozen</SelectOption>
                <SelectOption value="REQUIRES_ATTENTION">Requires Attention</SelectOption>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>KYC Status</Label>
              <Select value={kycStatus} onChange={(e) => setKycStatus(e.target.value)} className="w-full">
                <SelectOption value="INCOMPLETE">Incomplete</SelectOption>
                <SelectOption value="IN_REVIEW">In Review</SelectOption>
                <SelectOption value="VERIFIED">Verified</SelectOption>
                <SelectOption value="REJECTED">Rejected</SelectOption>
              </Select>
            </div>
            <div className="space-y-0.5 pt-1 text-sm text-gray-500">
              <p>Created: {fmt(profile.created_at)}</p>
              {profile.freeze_reason && (
                <p className="text-red-600">Frozen: {profile.freeze_reason}</p>
              )}
            </div>
          </div>
        </Panel>

        {/* Financial / profile info */}
        {isClient ? (
          <Panel title="Financial Settings">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Credit Limit (SAR)</Label>
                <Input
                  type="number"
                  value={creditLimit}
                  onChange={(e) => setCreditLimit(e.target.value)}
                  min={0}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Current Balance (SAR)</Label>
                <Input
                  type="number"
                  value={profile.current_balance ?? 0}
                  disabled
                  className="bg-gray-50"
                />
              </div>
              {profile.current_balance != null && profile.credit_limit != null && profile.credit_limit > 0 && (
                <p className="text-sm text-gray-600">
                  Utilization:{' '}
                  <strong
                    className={
                      (profile.current_balance / profile.credit_limit) * 100 > 80
                        ? 'text-red-600'
                        : 'text-green-600'
                    }
                  >
                    {((profile.current_balance / profile.credit_limit) * 100).toFixed(0)}%
                  </strong>
                </p>
              )}
            </div>
          </Panel>
        ) : (
          <Panel title="Profile Info">
            <div className="space-y-2 text-sm">
              <InfoRow label="Full Name" value={profile.full_name} />
              <InfoRow label="Company" value={profile.company_name} />
              <InfoRow label="Phone" value={profile.phone} />
              <InfoRow label="VAT Number" value={profile.vat_number} />
              <InfoRow label="CR Number" value={profile.cr_number} />
              <InfoRow label="IBAN" value={profile.iban} />
              <InfoRow label="Bank" value={profile.bank_name} />
              {profile.role === 'SUPPLIER' && (
                <InfoRow label="Preferred Supplier" value={profile.is_preferred ? 'Yes' : 'No'} />
              )}
            </div>
          </Panel>
        )}
      </div>

      <div className="mt-5">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin me-1.5" />
          ) : (
            <Save className="h-4 w-4 me-1.5" />
          )}
          Save Changes
        </Button>
      </div>

      {/* Legal entity info */}
      <Panel className="mt-6" title="Legal Entity">
        <div className="grid gap-3 sm:grid-cols-2 text-sm">
          <InfoRow label="Legal Name (AR)" value={profile.legal_name_ar} />
          <InfoRow label="Legal Name (EN)" value={profile.legal_name_en} />
          <InfoRow label="CR Number" value={profile.cr_number} />
          <InfoRow label="VAT Number" value={profile.vat_number} />
        </div>
      </Panel>
    </>
  )
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex items-start gap-2">
      <span className="min-w-[140px] shrink-0 text-gray-500">{label}:</span>
      <span className="text-gray-900">{value || '—'}</span>
    </div>
  )
}

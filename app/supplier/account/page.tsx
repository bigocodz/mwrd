'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { PageHeader, Panel } from '@/components/app/AppSurface'
import { Button } from '@/components/ui/button'
import type { Database } from '@/lib/supabase/types'

type Profile = Database['public']['Tables']['profiles']['Row']

export default function SupplierAccountPage() {
  const supabase = createClient()
  const { orgId } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [fullName, setFullName] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [phone, setPhone] = useState('')

  useEffect(() => {
    if (!orgId) return
    const run = async () => {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', orgId).single()
      if (error) {
        toast.error(error.message)
      } else if (data) {
        setProfile(data)
        setFullName(data.full_name ?? '')
        setJobTitle(data.job_title ?? '')
        setPhone(data.phone ?? '')
      }
      setLoading(false)
    }
    run()
  }, [orgId])

  const handleSave = async () => {
    if (!orgId) return
    setSaving(true)
    const { error } = await supabase.from('profiles').update({ full_name: fullName, job_title: jobTitle, phone }).eq('id', orgId)
    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Account updated.')
      setProfile(prev => prev ? { ...prev, full_name: fullName, job_title: jobTitle, phone } : prev)
    }
    setSaving(false)
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Account" description="Your profile and preferences." />
      <Panel title="Profile Information">
        {loading ? (
          <p className="text-sm text-gray-500">Loading...</p>
        ) : profile ? (
          <div className="space-y-5">
            <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold text-gray-400">Company Name</dt>
                <dd className="mt-0.5 text-sm text-gray-900">{profile.company_name ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-gray-400">Preferred Language</dt>
                <dd className="mt-0.5 text-sm text-gray-900">
                  {profile.preferred_language === 'ar' ? 'Arabic' : profile.preferred_language === 'en' ? 'English' : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-gray-400">Show Hijri Dates</dt>
                <dd className="mt-0.5 text-sm text-gray-900">{profile.show_hijri ? 'Yes' : 'No'}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-gray-400">User ID</dt>
                <dd className="mt-0.5 font-mono text-xs text-gray-700">{orgId}</dd>
              </div>
            </dl>
            <div className="border-t border-gray-200 pt-5">
              <h3 className="mb-4 text-sm font-semibold text-gray-700">Editable Fields</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-400" htmlFor="full_name">Full Name</label>
                  <input
                    id="full_name"
                    type="text"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    className="block w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm outline-none transition-colors focus:border-[#ff6d43] focus:ring-2 focus:ring-[#ff6d43]/20"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-400" htmlFor="job_title">Job Title</label>
                  <input
                    id="job_title"
                    type="text"
                    value={jobTitle}
                    onChange={e => setJobTitle(e.target.value)}
                    className="block w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm outline-none transition-colors focus:border-[#ff6d43] focus:ring-2 focus:ring-[#ff6d43]/20"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-400" htmlFor="phone">Phone</label>
                  <input
                    id="phone"
                    type="text"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="block w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm outline-none transition-colors focus:border-[#ff6d43] focus:ring-2 focus:ring-[#ff6d43]/20"
                  />
                </div>
              </div>
              <div className="mt-4">
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </Panel>
    </div>
  )
}

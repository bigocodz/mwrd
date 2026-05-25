'use client'

import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { PageHeader, Panel, SkeletonLine } from '@/components/app/AppSurface'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const fmt = (n: number | null | undefined) =>
  n != null
    ? new Intl.NumberFormat('en-SA', { style: 'currency', currency: 'SAR', maximumFractionDigits: 0 }).format(n)
    : '—'

export default function AccountPage() {
  const { profile, loading } = useAuth()

  const creditLimit = profile?.credit_limit ?? 0
  const currentBalance = profile?.current_balance ?? 0
  const utilization = creditLimit > 0 ? (currentBalance / creditLimit) * 100 : 0
  const utilizationHigh = utilization > 80

  const languageLabel =
    profile?.preferred_language === 'ar' ? 'Arabic' : profile?.preferred_language === 'en' ? 'English' : '—'

  return (
    <div className="space-y-6">
      <PageHeader
        title="Account & Billing"
        description="Personal preferences and credit balance."
      />

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonLine key={i} className="h-8 w-full" />
          ))}
        </div>
      ) : (
        <>
          <Panel title="Credit & Balance">
            <dl className="grid gap-5 sm:grid-cols-3">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400">Credit Limit</dt>
                <dd className="mt-1 text-lg font-semibold text-gray-900">{fmt(profile?.credit_limit)}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400">Current Balance</dt>
                <dd className="mt-1 text-lg font-semibold text-gray-900">{fmt(profile?.current_balance)}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400">Utilization</dt>
                <dd
                  className={cn(
                    'mt-1 text-lg font-semibold',
                    utilizationHigh ? 'text-red-600' : 'text-gray-900',
                  )}
                >
                  {creditLimit > 0 ? `${utilization.toFixed(1)}%` : '—'}
                </dd>
              </div>
            </dl>
          </Panel>

          <Panel title="Preferences">
            <dl className="grid gap-5 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400">Preferred Language</dt>
                <dd className="mt-1 text-sm text-gray-900">{languageLabel}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400">Calendar</dt>
                <dd className="mt-1">
                  {profile?.show_hijri != null ? (
                    <Badge variant={profile.show_hijri ? 'info' : 'default'}>
                      {profile.show_hijri ? 'Hijri' : 'Gregorian'}
                    </Badge>
                  ) : (
                    <span className="text-sm text-gray-400">—</span>
                  )}
                </dd>
              </div>
            </dl>
          </Panel>

          <Panel title="Security">
            <Button asChild variant="outline">
              <Link href="/change-password">Change Password</Link>
            </Button>
          </Panel>
        </>
      )}
    </div>
  )
}

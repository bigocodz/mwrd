'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { PageHeader, Panel, SkeletonLine, EmptyMessage } from '@/components/app/AppSurface'
import { Badge } from '@/components/ui/badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { ProfileStatusBadge } from '@/components/shared/StatusBadge'
import type { Database } from '@/lib/supabase/types'

type Profile = Database['public']['Tables']['profiles']['Row']

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('en-SA', { year: 'numeric', month: 'short', day: 'numeric' })

const teamRoleVariant = (role: string): 'brand' | 'info' | 'success' | 'warning' | 'default' => {
  const map: Record<string, 'brand' | 'info' | 'success' | 'warning' | 'default'> = {
    OWNER: 'brand',
    ADMIN: 'info',
    APPROVER: 'success',
    BUYER: 'warning',
    VIEWER: 'default',
  }
  return map[role] ?? 'default'
}

export default function TeamPage() {
  const { orgId, profile, user, loading: authLoading } = useAuth()
  const supabase = createClient()

  const [members, setMembers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (authLoading || !orgId) return

    const fetch = async () => {
      setLoading(true)
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('parent_client_id', orgId)
        .order('created_at', { ascending: false })

      setMembers(data ?? [])
      setLoading(false)
    }

    fetch()
  }, [orgId, authLoading])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team"
        description="Manage team members and their portal access."
      />

      {/* Current user profile info */}
      {profile && (
        <Panel title="Your Profile">
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Company</dt>
              <dd className="mt-1 text-sm font-medium text-gray-900">{profile.company_name ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Role</dt>
              <dd className="mt-1">
                <Badge variant="info">{profile.role}</Badge>
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Team Role</dt>
              <dd className="mt-1">
                {profile.team_role ? (
                  <Badge variant={teamRoleVariant(profile.team_role)}>{profile.team_role}</Badge>
                ) : (
                  <span className="text-sm text-gray-500">—</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Email</dt>
              <dd className="mt-1 text-sm text-gray-900 truncate">{user?.email ?? '—'}</dd>
            </div>
          </dl>
        </Panel>
      )}

      {/* Team members table */}
      <Panel title="Team Members">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonLine key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : members.length === 0 ? (
          <EmptyMessage>No team members found.</EmptyMessage>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Job Title</TableHead>
                <TableHead>Team Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{m.full_name ?? '—'}</TableCell>
                  <TableCell className="text-gray-500">{m.job_title ?? '—'}</TableCell>
                  <TableCell>
                    {m.team_role ? (
                      <Badge variant={teamRoleVariant(m.team_role)}>{m.team_role}</Badge>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell>
                    <ProfileStatusBadge status={m.status} />
                  </TableCell>
                  <TableCell>{fmtDate(m.created_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Panel>
    </div>
  )
}

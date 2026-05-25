'use client'

import { useEffect, useState } from 'react'
import { Eye, EyeOff, Loader2, UserPlus, X } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { PageHeader, Panel, SkeletonLine, EmptyMessage } from '@/components/app/AppSurface'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectOption } from '@/components/ui/select'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { ProfileStatusBadge } from '@/components/shared/StatusBadge'
import type { Database } from '@/lib/supabase/types'

type Profile = Database['public']['Tables']['profiles']['Row']

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('en-SA', { year: 'numeric', month: 'short', day: 'numeric' })

const teamRoleVariant = (role: string): 'brand' | 'info' | 'success' | 'warning' | 'default' => {
  const map: Record<string, 'brand' | 'info' | 'success' | 'warning' | 'default'> = {
    OWNER: 'brand', ADMIN: 'info', APPROVER: 'success', BUYER: 'warning', VIEWER: 'default',
  }
  return map[role] ?? 'default'
}

const CAN_INVITE = ['OWNER', 'ADMIN']

// ── Invite dialog ────────────────────────────────────────────
function InviteDialog({
  open,
  onClose,
  onInvited,
}: {
  open: boolean
  onClose: () => void
  onInvited: () => void
}) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [fullName, setFullName] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [phone, setPhone] = useState('')
  const [teamRole, setTeamRole] = useState('BUYER')
  const [loading, setLoading] = useState(false)

  const reset = () => {
    setEmail(''); setPassword(''); setFullName(''); setJobTitle(''); setPhone('')
    setTeamRole('BUYER'); setShowPw(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/client/invite-member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, full_name: fullName, job_title: jobTitle, phone, team_role: teamRole }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Invite failed')
      toast.success(`${fullName || email} has been added to your team.`)
      onClose()
      reset()
      onInvited()
    } catch (err: unknown) {
      toast.error((err as Error).message ?? 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { onClose(); reset() }} />
      <div className="relative w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Invite Team Member</h2>
          <button type="button" onClick={() => { onClose(); reset() }} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:text-gray-600">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="inv-name">Full Name</Label>
              <Input id="inv-name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Ahmed Ali" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inv-title">Job Title</Label>
              <Input id="inv-title" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="Procurement Officer" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="inv-email">Work Email *</Label>
            <Input id="inv-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ahmed@company.sa" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="inv-phone">Phone</Label>
            <Input id="inv-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+966 5X XXX XXXX" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="inv-pw">Temporary Password *</Label>
            <div className="relative">
              <Input
                id="inv-pw"
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 8 characters"
                required minLength={8}
                className="pr-10"
              />
              <button type="button" onClick={() => setShowPw(p => !p)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" tabIndex={-1}>
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-gray-400">Member must change this on first login.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="inv-role">Team Role *</Label>
            <Select id="inv-role" value={teamRole} onChange={(e) => setTeamRole(e.target.value)} className="w-full">
              <SelectOption value="BUYER">Buyer</SelectOption>
              <SelectOption value="APPROVER">Approver</SelectOption>
              <SelectOption value="ADMIN">Admin</SelectOption>
              <SelectOption value="VIEWER">Viewer</SelectOption>
            </Select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => { onClose(); reset() }}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin me-1.5" />}
              Send Invite
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────
export default function TeamPage() {
  const { orgId, profile, user, loading: authLoading } = useAuth()
  const supabase = createClient()

  const [members, setMembers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteOpen, setInviteOpen] = useState(false)

  const canInvite = profile?.team_role ? CAN_INVITE.includes(profile.team_role) : !profile?.parent_client_id

  const loadMembers = async () => {
    if (!orgId) return
    setLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('parent_client_id', orgId)
      .order('created_at', { ascending: false })
    setMembers(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    if (authLoading || !orgId) return
    loadMembers()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, authLoading])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team"
        description="Manage team members and their portal access."
        actions={
          canInvite ? (
            <Button onClick={() => setInviteOpen(true)}>
              <UserPlus className="h-4 w-4 me-1.5" />
              Invite Member
            </Button>
          ) : undefined
        }
      />

      <InviteDialog
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onInvited={loadMembers}
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
              <dd className="mt-1"><Badge variant="info">{profile.role}</Badge></dd>
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

      <Panel title="Team Members">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonLine key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : members.length === 0 ? (
          <EmptyMessage>
            {canInvite ? 'No team members yet. Use "Invite Member" to add your first.' : 'No team members found.'}
          </EmptyMessage>
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
                    ) : '—'}
                  </TableCell>
                  <TableCell><ProfileStatusBadge status={m.status} /></TableCell>
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

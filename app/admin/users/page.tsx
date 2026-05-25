'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search, Star, Trash2, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { PageHeader, Panel, SkeletonLine, EmptyMessage } from '@/components/app/AppSurface'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Select, SelectOption } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ProfileStatusBadge, KycBadge, RoleBadge } from '@/components/shared/StatusBadge'
import { PaginationControls, paginate, totalPages } from '@/components/shared/Pagination'
import type { Database } from '@/lib/supabase/types'
import CreateUserDialog from './CreateUserDialog'

type Profile = Database['public']['Tables']['profiles']['Row']

const PAGE_SIZE = 20

export default function AdminUsersPage() {
  const supabase = createClient()
  const router = useRouter()

  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [kycFilter, setKycFilter] = useState('ALL')
  const [page, setPage] = useState(1)
  const [createOpen, setCreateOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    let q = supabase.from('profiles').select('*').order('created_at', { ascending: false })
    if (roleFilter !== 'ALL') q = q.eq('role', roleFilter as Profile['role'])
    if (statusFilter !== 'ALL') q = q.eq('status', statusFilter as Profile['status'])
    if (kycFilter !== 'ALL') q = q.eq('kyc_status', kycFilter as Profile['kyc_status'])
    q.then(({ data }) => {
      setUsers(data ?? [])
      setLoading(false)
    })
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load() }, [roleFilter, statusFilter, kycFilter])

  const filtered = users.filter((u) => {
    if (!search) return true
    const s = search.toLowerCase()
    return (
      u.public_id?.toLowerCase().includes(s) ||
      u.company_name?.toLowerCase().includes(s) ||
      u.full_name?.toLowerCase().includes(s)
    )
  })

  const numPages = totalPages(filtered.length, PAGE_SIZE)
  const paged = paginate(filtered, page, PAGE_SIZE)

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete ${name}? This cannot be undone.`)) return
    setDeletingId(id)
    const { error } = await supabase.from('profiles').delete().eq('id', id)
    if (error) {
      toast.error('Failed to delete: ' + error.message)
    } else {
      toast.success('User deleted')
      setUsers((prev) => prev.filter((u) => u.id !== id))
    }
    setDeletingId(null)
  }

  const fmt = (d: string) =>
    new Date(d).toLocaleDateString('en-SA', { year: 'numeric', month: 'short', day: 'numeric' })

  return (
    <>
      <PageHeader
        title="User Management"
        description="Manage all client, supplier, admin, and auditor accounts."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <UserPlus className="h-4 w-4 me-1.5" />
            Create User
          </Button>
        }
      />

      <CreateUserDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={load} />

      <Panel>
        {/* Filter bar */}
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <Input
              placeholder="Search by ID, company, or name…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              className="ps-9"
            />
          </div>
          <Select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(1) }} className="w-[140px]">
            <SelectOption value="ALL">All Roles</SelectOption>
            <SelectOption value="CLIENT">Client</SelectOption>
            <SelectOption value="SUPPLIER">Supplier</SelectOption>
            <SelectOption value="ADMIN">Admin</SelectOption>
            <SelectOption value="AUDITOR">Auditor</SelectOption>
          </Select>
          <Select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }} className="w-[160px]">
            <SelectOption value="ALL">All Statuses</SelectOption>
            <SelectOption value="ACTIVE">Active</SelectOption>
            <SelectOption value="PENDING">Pending</SelectOption>
            <SelectOption value="FROZEN">Frozen</SelectOption>
            <SelectOption value="REJECTED">Rejected</SelectOption>
            <SelectOption value="DEACTIVATED">Deactivated</SelectOption>
            <SelectOption value="REQUIRES_ATTENTION">Needs Attention</SelectOption>
          </Select>
          <Select value={kycFilter} onChange={(e) => { setKycFilter(e.target.value); setPage(1) }} className="w-[140px]">
            <SelectOption value="ALL">All KYC</SelectOption>
            <SelectOption value="INCOMPLETE">Incomplete</SelectOption>
            <SelectOption value="IN_REVIEW">In Review</SelectOption>
            <SelectOption value="VERIFIED">Verified</SelectOption>
            <SelectOption value="REJECTED">Rejected</SelectOption>
          </Select>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonLine key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyMessage>No users found. Try adjusting your filters.</EmptyMessage>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Public ID</TableHead>
                  <TableHead>Company / Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>KYC</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.map((u) => (
                  <TableRow key={u.id} onClick={() => router.push(`/admin/users/${u.id}`)}>
                    <TableCell className="font-mono text-sm">
                      <span className="flex items-center gap-1.5">
                        {u.public_id || '—'}
                        {u.is_preferred && (
                          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
                        )}
                      </span>
                    </TableCell>
                    <TableCell>{u.company_name || u.full_name || '—'}</TableCell>
                    <TableCell><RoleBadge role={u.role} /></TableCell>
                    <TableCell><ProfileStatusBadge status={u.status} /></TableCell>
                    <TableCell><KycBadge status={u.kyc_status} /></TableCell>
                    <TableCell className="text-gray-500 text-sm">{fmt(u.created_at)}</TableCell>
                    <TableCell>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(u.id, u.company_name || u.public_id || 'this user')
                        }}
                        disabled={deletingId === u.id}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-red-500 transition-colors hover:bg-red-50 disabled:opacity-40"
                        aria-label="Delete user"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <PaginationControls
              page={page}
              totalPages={numPages}
              total={filtered.length}
              onPageChange={setPage}
              className="mt-4"
            />
          </>
        )}
      </Panel>
    </>
  )
}

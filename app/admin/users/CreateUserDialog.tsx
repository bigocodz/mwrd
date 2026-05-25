'use client'

import { useState } from 'react'
import { Eye, EyeOff, Loader2, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectOption } from '@/components/ui/select'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void
}

export default function CreateUserDialog({ open, onOpenChange, onCreated }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [role, setRole] = useState('CLIENT')
  const [companyName, setCompanyName] = useState('')
  const [loading, setLoading] = useState(false)

  if (!open) return null

  const reset = () => {
    setEmail('')
    setPassword('')
    setRole('CLIENT')
    setCompanyName('')
    setShowPw(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) return
    setLoading(true)
    try {
      const res = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role, company_name: companyName }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to create user')
      toast.success('User created. They can now log in with the provided credentials.')
      onOpenChange(false)
      reset()
      onCreated()
    } catch (err: unknown) {
      toast.error((err as Error).message ?? 'Failed to create user')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={() => { onOpenChange(false); reset() }}
      />
      <div className="relative w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Create User</h2>
          <button
            type="button"
            onClick={() => { onOpenChange(false); reset() }}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="cu-email">Email</Label>
            <Input
              id="cu-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@company.com"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cu-password">Temporary Password</Label>
            <div className="relative">
              <Input
                id="cu-password"
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 8 characters"
                required
                minLength={8}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPw((p) => !p)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                tabIndex={-1}
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-gray-400">
              User will be required to change this on first login.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cu-role">Role</Label>
            <Select
              id="cu-role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full"
            >
              <SelectOption value="CLIENT">Client</SelectOption>
              <SelectOption value="SUPPLIER">Supplier</SelectOption>
              <SelectOption value="ADMIN">Admin</SelectOption>
              <SelectOption value="AUDITOR">Auditor</SelectOption>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cu-company">Company Name</Label>
            <Input
              id="cu-company"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Optional"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => { onOpenChange(false); reset() }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin me-1.5" />}
              Create User
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

import { Badge } from '@/components/ui/badge'

// Profile status
const profileStatusMap: Record<string, { label: string; variant: 'success' | 'warning' | 'danger' | 'info' | 'default' }> = {
  ACTIVE: { label: 'Active', variant: 'success' },
  PENDING: { label: 'Pending', variant: 'warning' },
  FROZEN: { label: 'Frozen', variant: 'info' },
  REJECTED: { label: 'Rejected', variant: 'danger' },
  DEACTIVATED: { label: 'Deactivated', variant: 'default' },
  REQUIRES_ATTENTION: { label: 'Needs Attention', variant: 'warning' },
}

export function ProfileStatusBadge({ status }: { status: string }) {
  const map = profileStatusMap[status] ?? { label: status, variant: 'default' as const }
  return <Badge variant={map.variant}>{map.label}</Badge>
}

// KYC status
const kycMap: Record<string, { label: string; variant: 'success' | 'warning' | 'danger' | 'default' }> = {
  INCOMPLETE: { label: 'Incomplete', variant: 'default' },
  IN_REVIEW: { label: 'In Review', variant: 'warning' },
  VERIFIED: { label: 'Verified', variant: 'success' },
  REJECTED: { label: 'Rejected', variant: 'danger' },
}

export function KycBadge({ status }: { status: string }) {
  const map = kycMap[status] ?? { label: status, variant: 'default' as const }
  return <Badge variant={map.variant}>{map.label}</Badge>
}

// Order status
const orderStatusMap: Record<string, { label: string; variant: 'success' | 'warning' | 'danger' | 'info' | 'default' }> = {
  PENDING_CONFIRMATION: { label: 'Pending', variant: 'warning' },
  CONFIRMED: { label: 'Confirmed', variant: 'info' },
  PREPARING: { label: 'Preparing', variant: 'info' },
  DISPATCHED: { label: 'Dispatched', variant: 'info' },
  DELIVERED: { label: 'Delivered', variant: 'success' },
  COMPLETED: { label: 'Completed', variant: 'success' },
  CANCELLED: { label: 'Cancelled', variant: 'danger' },
}

export function OrderStatusBadge({ status }: { status: string }) {
  const map = orderStatusMap[status] ?? { label: status, variant: 'default' as const }
  return <Badge variant={map.variant}>{map.label}</Badge>
}

// Quote status
const quoteStatusMap: Record<string, { label: string; variant: 'success' | 'warning' | 'danger' | 'info' | 'default' }> = {
  AUTO_DRAFT: { label: 'Auto Draft', variant: 'default' },
  PENDING_ADMIN: { label: 'Pending Review', variant: 'warning' },
  SENT_TO_CLIENT: { label: 'Sent to Client', variant: 'info' },
  CLIENT_REVISION_REQUESTED: { label: 'Revision Requested', variant: 'warning' },
  SUPPLIER_REVISION_REQUESTED: { label: 'Supplier Revision', variant: 'warning' },
  REVISION_SUBMITTED: { label: 'Revision Submitted', variant: 'info' },
  ACCEPTED: { label: 'Accepted', variant: 'success' },
  REJECTED: { label: 'Rejected', variant: 'danger' },
}

export function QuoteStatusBadge({ status }: { status: string }) {
  const map = quoteStatusMap[status] ?? { label: status, variant: 'default' as const }
  return <Badge variant={map.variant}>{map.label}</Badge>
}

// RFQ status
const rfqStatusMap: Record<string, { label: string; variant: 'success' | 'warning' | 'default' }> = {
  OPEN: { label: 'Open', variant: 'warning' },
  QUOTED: { label: 'Quoted', variant: 'success' },
  CLOSED: { label: 'Closed', variant: 'default' },
}

export function RfqStatusBadge({ status }: { status: string }) {
  const map = rfqStatusMap[status] ?? { label: status, variant: 'default' as const }
  return <Badge variant={map.variant}>{map.label}</Badge>
}

// Invoice status
const invoiceStatusMap: Record<string, { label: string; variant: 'success' | 'warning' | 'danger' | 'default' }> = {
  PENDING_PAYMENT: { label: 'Pending', variant: 'warning' },
  PAID: { label: 'Paid', variant: 'success' },
  OVERDUE: { label: 'Overdue', variant: 'danger' },
  VOID: { label: 'Void', variant: 'default' },
}

export function InvoiceStatusBadge({ status }: { status: string }) {
  const map = invoiceStatusMap[status] ?? { label: status, variant: 'default' as const }
  return <Badge variant={map.variant}>{map.label}</Badge>
}

// Approval status
const approvalStatusMap: Record<string, { label: string; variant: 'success' | 'warning' | 'danger' | 'default' }> = {
  PENDING: { label: 'Pending', variant: 'warning' },
  APPROVED: { label: 'Approved', variant: 'success' },
  REJECTED: { label: 'Rejected', variant: 'danger' },
}

export function ApprovalStatusBadge({ status }: { status: string }) {
  const map = approvalStatusMap[status] ?? { label: status, variant: 'default' as const }
  return <Badge variant={map.variant}>{map.label}</Badge>
}

// Product approval status
const productStatusMap: Record<string, { label: string; variant: 'success' | 'warning' | 'danger' | 'default' }> = {
  PENDING: { label: 'Pending', variant: 'warning' },
  APPROVED: { label: 'Approved', variant: 'success' },
  REJECTED: { label: 'Rejected', variant: 'danger' },
}

export function ProductStatusBadge({ status }: { status: string }) {
  const map = productStatusMap[status] ?? { label: status, variant: 'default' as const }
  return <Badge variant={map.variant}>{map.label}</Badge>
}

// Dispute status
export function DisputeBadge({ status }: { status: string | null }) {
  if (!status) return null
  const map: Record<string, { label: string; variant: 'danger' | 'success' | 'warning' }> = {
    OPEN: { label: 'Disputed', variant: 'danger' },
    RESOLVED: { label: 'Resolved', variant: 'success' },
    REJECTED: { label: 'Dispute Rejected', variant: 'warning' },
  }
  const m = map[status]
  if (!m) return null
  return <Badge variant={m.variant}>{m.label}</Badge>
}

// Generic role badge
export function RoleBadge({ role }: { role: string }) {
  const roleMap: Record<string, 'brand' | 'info' | 'success' | 'default'> = {
    ADMIN: 'brand',
    AUDITOR: 'brand',
    CLIENT: 'info',
    SUPPLIER: 'success',
  }
  return (
    <Badge variant={roleMap[role] ?? 'default'} className="capitalize">
      {role.toLowerCase()}
    </Badge>
  )
}

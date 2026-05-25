'use client'

import type { ReactNode } from 'react'
import {
  AlertCircle,
  BarChart3,
  Banknote,
  CreditCard,
  FileQuestion,
  FileLock2,
  FileSearch,
  FolderTree,
  Inbox,
  LayoutDashboard,
  Package,
  PackageCheck,
  PackageSearch,
  Percent,
  Receipt,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
  Star,
  Users,
} from 'lucide-react'
import AppShell from '@/components/app/AppShell'
import { useAuth } from '@/hooks/useAuth'

const navItems = [
  { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'Lifecycle & SLA', href: '/admin/lifecycle', icon: RefreshCw },
  { label: 'Leads', href: '/admin/leads', icon: Inbox },
  { label: 'Users', href: '/admin/users', icon: Users },
  { label: 'Categories', href: '/admin/categories', icon: FolderTree },
  { label: 'Master Catalog', href: '/admin/master-catalog', icon: Package },
  { label: 'Bundles', href: '/admin/bundles', icon: PackageCheck },
  { label: 'Product Requests', href: '/admin/product-requests', icon: Inbox },
  { label: 'Pending Offers', href: '/admin/products/pending', icon: PackageSearch },
  { label: 'Margins', href: '/admin/margin-settings', icon: Percent },
  { label: 'RFQs', href: '/admin/rfqs', icon: FileQuestion },
  { label: 'Quotes', href: '/admin/quotes/pending', icon: Receipt },
  { label: 'Approvals', href: '/admin/approvals', icon: ShieldCheck },
  { label: 'Orders', href: '/admin/orders', icon: PackageCheck },
  { label: 'Delivery Notes', href: '/admin/delivery-notes', icon: PackageCheck },
  { label: 'Disputes', href: '/admin/disputes', icon: AlertCircle },
  { label: 'Contracts', href: '/admin/contracts', icon: FileLock2 },
  { label: 'Client Invoices', href: '/admin/client-invoices', icon: Receipt },
  { label: 'Supplier Invoices', href: '/admin/supplier-invoices', icon: ReceiptText },
  { label: 'Payments', href: '/admin/payments', icon: CreditCard },
  { label: 'Credit', href: '/admin/credit', icon: BarChart3 },
  { label: 'Payouts', href: '/admin/payouts', icon: Banknote },
  { label: 'Preferred Suppliers', href: '/admin/preferred-suppliers', icon: Star },
  { label: 'Reviews', href: '/admin/reviews', icon: Star },
  { label: 'Audit Log', href: '/admin/audit-log', icon: FileSearch },
  { label: 'Templates', href: '/admin/templates', icon: FileLock2 },
]

export default function AdminShell({ children }: { children: ReactNode }) {
  const { profile } = useAuth()
  const isAuditor = profile?.role === 'AUDITOR'
  const portalLabel = isAuditor ? 'Audit Portal (read-only)' : 'Admin Portal'

  return (
    <AppShell navItems={navItems} portalLabel={portalLabel} portalTone="admin">
      {children}
    </AppShell>
  )
}

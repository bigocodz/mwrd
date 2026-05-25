'use client'

import type { ReactNode } from 'react'
import {
  BarChart3,
  BookOpen,
  ClipboardList,
  FileQuestion,
  Package,
  PackageCheck,
  Receipt,
  Star,
  Wallet,
} from 'lucide-react'
import AppShell from '@/components/app/AppShell'

const navItems = [
  { label: 'My Products', href: '/supplier/products', icon: Package },
  { label: 'Available RFQs', href: '/supplier/rfqs', icon: FileQuestion },
  { label: 'My Quotes', href: '/supplier/quotes', icon: ClipboardList },
  { label: 'Orders', href: '/supplier/orders', icon: PackageCheck },
  { label: 'Invoices', href: '/supplier/invoices', icon: Receipt },
  { label: 'Payouts', href: '/supplier/payouts', icon: Wallet },
  { label: 'Analytics', href: '/supplier/analytics', icon: BarChart3 },
  { label: 'Reviews', href: '/supplier/reviews', icon: Star },
  { label: 'KYC & Documents', href: '/supplier/kyc', icon: BookOpen },
  { label: 'Account', href: '/supplier/account', icon: BookOpen },
]

export default function SupplierShell({ children }: { children: ReactNode }) {
  return (
    <AppShell navItems={navItems} portalLabel="Supplier Portal" portalTone="supplier">
      {children}
    </AppShell>
  )
}

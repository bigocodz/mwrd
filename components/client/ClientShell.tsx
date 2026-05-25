'use client'

import type { ReactNode } from 'react'
import {
  BarChart3,
  Building2,
  FileQuestion,
  PackageCheck,
  Receipt,
  RefreshCcw,
  ShoppingBag,
  ShoppingCart,
  Users,
  Wallet,
} from 'lucide-react'
import AppShell from '@/components/app/AppShell'

const navItems = [
  { label: 'Product Catalog', href: '/client/catalog', icon: ShoppingBag },
  { label: 'Cart', href: '/client/cart', icon: ShoppingCart },
  { label: 'My RFQs', href: '/client/rfqs', icon: FileQuestion },
  { label: 'Repeat RFQs', href: '/client/schedules', icon: RefreshCcw },
  { label: 'Quotes', href: '/client/quotes', icon: Receipt },
  { label: 'Orders', href: '/client/orders', icon: PackageCheck },
  { label: 'Invoices', href: '/client/invoices', icon: Receipt },
  { label: 'Reports', href: '/client/reports', icon: BarChart3 },
  { label: 'Organization', href: '/client/organization', icon: Building2 },
  { label: 'Team', href: '/client/team', icon: Users },
  { label: 'Account & Billing', href: '/client/account', icon: Wallet },
]

export default function ClientShell({ children }: { children: ReactNode }) {
  return (
    <AppShell navItems={navItems} portalLabel="Client Portal" portalTone="client">
      {children}
    </AppShell>
  )
}

import Link from 'next/link'
import {
  BarChart3,
  Banknote,
  ClockAlert,
  CreditCard,
  FileQuestion,
  Inbox,
  PackageSearch,
  Percent,
  Receipt,
  ShieldCheck,
  Star,
  Users,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import {
  EmptyMessage,
  FlowStepCard,
  MetricCard,
  PageHeader,
  Panel,
  SignalCard,
} from '@/components/app/AppSurface'

async function fetchDashboardStats() {
  const supabase = await createClient()

  const [
    { count: activeClients },
    { count: activeSuppliers },
    { count: pendingProducts },
    { count: pendingQuotes },
    { count: pendingApprovals },
    { count: pendingOrders },
    { data: creditClientsRaw },
    { data: monthlyOrdersRaw },
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'CLIENT')
      .eq('status', 'ACTIVE'),
    supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'SUPPLIER')
      .eq('status', 'ACTIVE'),
    supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('approval_status', 'PENDING'),
    supabase
      .from('quotes')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'PENDING_ADMIN'),
    supabase
      .from('approval_requests')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'PENDING'),
    supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'PENDING_CONFIRMATION'),
    supabase
      .from('profiles')
      .select('id, company_name, credit_limit, current_balance')
      .eq('role', 'CLIENT')
      .eq('status', 'ACTIVE')
      .not('credit_limit', 'is', null)
      .gt('current_balance', 0)
      .order('current_balance', { ascending: false })
      .limit(5),
    supabase
      .from('orders')
      .select('total_with_vat')
      .in('status', ['DELIVERED', 'COMPLETED'])
      .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
  ])

  const monthlyRevenue = (monthlyOrdersRaw ?? []).reduce(
    (sum, o) => sum + (o.total_with_vat ?? 0),
    0,
  )

  const creditAlerts = (creditClientsRaw ?? [])
    .map((c) => ({
      ...c,
      utilization: c.credit_limit ? (c.current_balance! / c.credit_limit) * 100 : 0,
    }))
    .filter((c) => c.utilization >= 80)

  return {
    activeClients: activeClients ?? 0,
    activeSuppliers: activeSuppliers ?? 0,
    pendingProducts: pendingProducts ?? 0,
    pendingQuotes: pendingQuotes ?? 0,
    pendingApprovals: pendingApprovals ?? 0,
    pendingOrders: pendingOrders ?? 0,
    monthlyRevenue,
    creditAlerts,
  }
}

export default async function AdminDashboardPage() {
  const stats = await fetchDashboardStats()
  const pendingTotal = stats.pendingProducts + stats.pendingQuotes + stats.pendingApprovals

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-SA', {
      style: 'currency',
      currency: 'SAR',
      maximumFractionDigits: 0,
    }).format(n)

  return (
    <>
      <PageHeader
        title="Admin Dashboard"
        description="Monitor revenue, margin, supplier quality, credit utilization, and the operational queues that need attention."
      />

      {/* Top metrics */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={CreditCard}
          label="GMV This Month"
          value={fmt(stats.monthlyRevenue)}
        />
        <MetricCard
          icon={Users}
          label="Active Clients"
          value={String(stats.activeClients)}
          tone="success"
        />
        <MetricCard
          icon={Users}
          label="Active Suppliers"
          value={String(stats.activeSuppliers)}
          tone="success"
        />
        <MetricCard
          icon={ClockAlert}
          label="Pending Orders"
          value={String(stats.pendingOrders)}
          tone={stats.pendingOrders > 0 ? 'warning' : 'default'}
        />
      </div>

      {/* Control room signals */}
      <Panel
        className="mt-6"
        title="Control Room"
        description="Fast operational signals before you open a queue."
        icon={ShieldCheck}
      >
        <div className="grid gap-3 md:grid-cols-3">
          <SignalCard
            label="Open queue"
            value={String(pendingTotal)}
            helper="Products, quotes, and approvals waiting for admin action."
            icon={ClockAlert}
            tone="brand"
          />
          <SignalCard
            label="Credit watch"
            value={String(stats.creditAlerts.length)}
            helper="Clients above 80% utilization threshold."
            icon={Percent}
            tone="info"
          />
          <SignalCard
            label="Pending quotes"
            value={String(stats.pendingQuotes)}
            helper="Quotes awaiting admin review before client delivery."
            icon={Receipt}
            tone="warning"
          />
        </div>
      </Panel>

      {/* Marketplace loop */}
      <Panel
        className="mt-6"
        title="Managed Marketplace Loop"
        description="The transaction backbone from lead capture to cleared invoice."
      >
        <div className="grid gap-3 md:grid-cols-6">
          {[
            { label: 'Lead', value: 'Qualify account', icon: Inbox },
            { label: 'Catalog', value: 'Approve supply', icon: PackageSearch },
            { label: 'RFQ', value: 'Route demand', icon: FileQuestion },
            { label: 'Margin', value: 'Assemble offer', icon: Percent },
            { label: 'PO', value: 'Dispatch order', icon: Receipt },
            { label: 'Invoice', value: 'Clear in Wafeq', icon: BarChart3 },
          ].map((step, i) => (
            <FlowStepCard
              key={step.label}
              label={step.label}
              value={step.value}
              icon={step.icon}
              index={i}
              tone={i === 0 ? 'brand' : i === 1 ? 'info' : 'neutral'}
            />
          ))}
        </div>
      </Panel>

      {/* Two-column: credit alerts + pending actions */}
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        {/* Credit alerts */}
        <Panel title="Highest Credit Utilization" icon={Percent}>
          {stats.creditAlerts.length === 0 ? (
            <EmptyMessage>No clients above 80% utilization.</EmptyMessage>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px]">
                <thead>
                  <tr>
                    <th className="text-start">Client</th>
                    <th className="text-end">Limit</th>
                    <th className="text-end">Balance</th>
                    <th className="text-end">Utilization</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.creditAlerts.map((client) => (
                    <tr key={client.id}>
                      <td className="font-medium text-gray-900">{client.company_name ?? '—'}</td>
                      <td className="text-end text-gray-600">{fmt(client.credit_limit ?? 0)}</td>
                      <td className="text-end text-gray-600">{fmt(client.current_balance ?? 0)}</td>
                      <td className="text-end">
                        <span
                          className={
                            client.utilization > 90
                              ? 'inline-flex rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700'
                              : 'inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700'
                          }
                        >
                          {client.utilization.toFixed(0)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        {/* Pending action shortcuts */}
        <Panel title="Pending Actions" icon={ClockAlert} description="Queues that block client or supplier progress.">
          <div className="grid gap-3 sm:grid-cols-1">
            <PendingAction
              label="Product Approvals"
              count={stats.pendingProducts}
              href="/admin/products/pending"
              icon={PackageSearch}
            />
            <PendingAction
              label="Quote Reviews"
              count={stats.pendingQuotes}
              href="/admin/quotes/pending"
              icon={Receipt}
            />
            <PendingAction
              label="Approval Requests"
              count={stats.pendingApprovals}
              href="/admin/approvals"
              icon={ShieldCheck}
            />
            <PendingAction
              label="Pending Payouts"
              count={0}
              href="/admin/payouts"
              icon={Banknote}
            />
          </div>
        </Panel>
      </div>

      {/* Supplier overview */}
      <Panel className="mt-6" title="Top Suppliers" icon={Star} description="Active suppliers on the platform.">
        <SupplierPlaceholder activeSuppliers={stats.activeSuppliers} />
      </Panel>
    </>
  )
}

function PendingAction({
  label,
  count,
  href,
  icon: Icon,
}: {
  label: string
  count: number
  href: string
  icon: typeof ShieldCheck
}) {
  return (
    <Link
      href={href}
      className="group flex items-center justify-between gap-4 overflow-hidden rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-[border-color,box-shadow,transform] duration-150 hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md"
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#ff6d43]/10 text-[#c44818] ring-1 ring-[#ff6d43]/16 transition-colors group-hover:bg-[#ff6d43] group-hover:text-white group-hover:ring-[#ff6d43]">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-gray-600">{label}</p>
          <p className="text-xl font-semibold text-gray-900">{count}</p>
        </div>
      </div>
      <Receipt className="h-4 w-4 shrink-0 text-gray-400 transition-colors group-hover:text-[#ff6d43]" />
    </Link>
  )
}

function SupplierPlaceholder({ activeSuppliers }: { activeSuppliers: number }) {
  if (activeSuppliers === 0) {
    return <EmptyMessage>No active suppliers yet. Approve supplier accounts to see them here.</EmptyMessage>
  }
  return (
    <div className="flex items-center gap-3 text-sm text-gray-600">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-50 text-green-600 ring-1 ring-green-200/60">
        <Users className="h-4 w-4" />
      </span>
      <span>
        <strong className="text-gray-900">{activeSuppliers}</strong> active supplier
        {activeSuppliers !== 1 ? 's' : ''} on the platform. Detailed ratings appear once reviews are
        submitted.
      </span>
    </div>
  )
}

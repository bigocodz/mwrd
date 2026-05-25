'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/contexts/LanguageContext'

export type AppIcon = LucideIcon

// ─── PageHeader ────────────────────────────────────────────────────────────────

type PageHeaderProps = {
  title: string
  description?: ReactNode
  actions?: ReactNode
}

export const PageHeader = ({ title, description, actions }: PageHeaderProps) => (
  <div className="relative mb-6 border-b border-gray-200 pb-5 sm:flex sm:items-end sm:justify-between sm:gap-6">
    <div className="flex min-w-0 gap-3">
      <span className="mt-1 hidden h-12 w-1 shrink-0 rounded-full bg-[#ff6d43] shadow-[0_0_0_4px_rgba(255,109,67,0.1)] sm:block" />
      <div className="min-w-0">
        <p className="mb-2 flex items-center gap-2 text-xs font-semibold text-gray-600">
          <span className="h-1.5 w-1.5 rounded-full bg-[#ff6d43]" />
          MWRD Connect
        </p>
        <h1 className="text-[1.65rem] font-semibold leading-tight text-gray-900 sm:text-[2rem]">
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 max-w-3xl text-sm leading-6 text-gray-600">{description}</p>
        )}
      </div>
    </div>
    {actions && (
      <div className="relative mt-4 flex shrink-0 items-center gap-2 sm:mt-0">{actions}</div>
    )}
  </div>
)

// ─── Panel ──────────────────────────────────────────────────────────────────────

type PanelProps = {
  children: ReactNode
  title?: string
  description?: string
  icon?: AppIcon
  className?: string
  actions?: ReactNode
}

export const Panel = ({ children, title, description, icon: Icon, className, actions }: PanelProps) => (
  <section
    className={cn(
      'overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm',
      className,
    )}
  >
    {(title || description || actions) && (
      <div className="relative flex flex-col gap-3 border-b border-gray-200 bg-gray-50/60 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-3">
          {Icon && (
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#ff6d43]/10 text-[#c44818] ring-1 ring-[#ff6d43]/16">
              <Icon className="h-4 w-4" />
            </span>
          )}
          <div className="min-w-0">
            {title && (
              <h2 className="text-base font-semibold leading-tight text-gray-900">{title}</h2>
            )}
            {description && (
              <p className="mt-0.5 text-sm leading-5 text-gray-600">{description}</p>
            )}
          </div>
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
    )}
    <div
      className={cn(
        'p-5',
        '[&_table]:w-full [&_table]:text-sm',
        '[&_thead_tr]:border-b [&_thead_tr]:border-gray-200',
        '[&_tbody_tr]:border-b [&_tbody_tr]:border-gray-200 [&_tbody_tr]:transition-colors [&_tbody_tr:hover]:bg-gray-50',
        '[&_td]:px-3 [&_td]:py-3',
        '[&_th]:h-10 [&_th]:whitespace-nowrap [&_th]:px-3 [&_th]:py-2 [&_th]:text-[11px] [&_th]:font-semibold [&_th]:text-gray-400',
      )}
    >
      {children}
    </div>
  </section>
)

// ─── MetricCard ─────────────────────────────────────────────────────────────────

type Tone = 'default' | 'success' | 'warning' | 'danger'

const metricTone: Record<Tone, { icon: string; rail: string }> = {
  default: { icon: 'bg-blue-50 text-blue-600 ring-blue-200/60', rail: 'bg-blue-500' },
  success: { icon: 'bg-green-50 text-green-600 ring-green-200/60', rail: 'bg-green-500' },
  warning: { icon: 'bg-amber-50 text-amber-600 ring-amber-200/60', rail: 'bg-amber-500' },
  danger: { icon: 'bg-red-50 text-red-600 ring-red-200/60', rail: 'bg-red-500' },
}

type Trend = { delta: ReactNode; direction: 'up' | 'down' | 'neutral' }

type MetricCardProps = {
  label: string
  value: ReactNode
  icon: AppIcon
  helper?: ReactNode
  loading?: boolean
  tone?: Tone
  trend?: Trend
}

export const MetricCard = ({
  label,
  value,
  icon: Icon,
  helper,
  loading,
  tone = 'default',
  trend,
}: MetricCardProps) => (
  <div className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-[box-shadow,transform] duration-150 hover:-translate-y-0.5 hover:shadow-md">
    <span className={cn('absolute inset-x-0 top-0 h-1', metricTone[tone].rail)} />
    <div className="flex items-start justify-between gap-3">
      <p className="text-sm font-medium text-gray-600">{label}</p>
      <span
        className={cn(
          'relative flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ring-1',
          metricTone[tone].icon,
        )}
      >
        <Icon className="h-4 w-4" />
      </span>
    </div>
    {loading ? (
      <SkeletonLine className="mt-4 h-8 w-28" />
    ) : (
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-[1.875rem] font-semibold leading-none text-gray-900">{value}</span>
        {trend && (
          <span
            className={cn(
              'inline-flex items-center rounded-full px-1.5 py-0.5 text-[11px] font-medium',
              trend.direction === 'up' && 'bg-green-50 text-green-600',
              trend.direction === 'down' && 'bg-red-50 text-red-600',
              trend.direction === 'neutral' && 'bg-gray-100 text-gray-600',
            )}
          >
            {trend.delta}
          </span>
        )}
      </div>
    )}
    {helper && !loading && <div className="mt-1.5 text-xs leading-5 text-gray-400">{helper}</div>}
  </div>
)

// ─── SignalCard ──────────────────────────────────────────────────────────────────

type SurfaceTone = 'brand' | 'info' | 'success' | 'warning' | 'danger' | 'neutral'

const surfaceTone: Record<SurfaceTone, { icon: string; rail: string; meta: string }> = {
  brand: {
    icon: 'bg-[#ff6d43]/10 text-[#c44818] ring-[#ff6d43]/16',
    rail: 'bg-[#ff6d43]',
    meta: 'text-[#c44818]',
  },
  info: {
    icon: 'bg-blue-50 text-blue-600 ring-blue-200/70',
    rail: 'bg-blue-500',
    meta: 'text-blue-600',
  },
  success: {
    icon: 'bg-green-50 text-green-600 ring-green-200/70',
    rail: 'bg-green-500',
    meta: 'text-green-600',
  },
  warning: {
    icon: 'bg-amber-50 text-amber-600 ring-amber-200/70',
    rail: 'bg-amber-500',
    meta: 'text-amber-600',
  },
  danger: {
    icon: 'bg-red-50 text-red-600 ring-red-200/70',
    rail: 'bg-red-500',
    meta: 'text-red-600',
  },
  neutral: {
    icon: 'bg-gray-100 text-gray-600 ring-gray-200',
    rail: 'bg-gray-300',
    meta: 'text-gray-600',
  },
}

type SignalCardProps = {
  label: ReactNode
  value: ReactNode
  helper?: ReactNode
  icon?: AppIcon
  loading?: boolean
  tone?: SurfaceTone
}

export const SignalCard = ({
  label,
  value,
  helper,
  icon: Icon,
  loading = false,
  tone = 'brand',
}: SignalCardProps) => (
  <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
    <span className={cn('absolute inset-x-0 top-0 h-1', surfaceTone[tone].rail)} />
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-xs font-semibold text-gray-400">{label}</p>
        {loading ? (
          <SkeletonLine className="mt-2 h-7 w-24" />
        ) : (
          <p className="mt-2 text-xl font-semibold leading-tight text-gray-900">{value}</p>
        )}
      </div>
      {Icon && (
        <span
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1',
            surfaceTone[tone].icon,
          )}
        >
          <Icon className="h-5 w-5" />
        </span>
      )}
    </div>
    {helper && !loading && (
      <div className="mt-2 text-sm leading-6 text-gray-600">{helper}</div>
    )}
  </div>
)

// ─── FlowStepCard ────────────────────────────────────────────────────────────────

type FlowStepCardProps = {
  label: ReactNode
  value: ReactNode
  icon: AppIcon
  index: number
  tone?: SurfaceTone
}

export const FlowStepCard = ({
  label,
  value,
  icon: Icon,
  index,
  tone = 'brand',
}: FlowStepCardProps) => (
  <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
    <span className={cn('absolute inset-x-0 top-0 h-1', surfaceTone[tone].rail)} />
    <div className="mb-3 flex items-center justify-between gap-3">
      <span
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1',
          surfaceTone[tone].icon,
        )}
      >
        <Icon className="h-4 w-4" />
      </span>
      <span className={cn('text-[11px] font-semibold', surfaceTone[tone].meta)}>
        {String(index + 1).padStart(2, '0')}
      </span>
    </div>
    <p className="text-sm font-semibold text-gray-900">{label}</p>
    <p className="mt-0.5 text-xs leading-5 text-gray-600">{value}</p>
  </div>
)

// ─── LinkCard ────────────────────────────────────────────────────────────────────

type LinkCardProps = {
  title: string
  description: string
  href: string
  icon: AppIcon
  meta?: ReactNode
}

export const LinkCard = ({ title, description, href, icon: Icon, meta }: LinkCardProps) => (
  <Link
    href={href}
    className="group relative flex h-full items-start gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-[border-color,box-shadow,transform] duration-150 hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md"
  >
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#ff6d43]/10 text-[#c44818] ring-1 ring-[#ff6d43]/16 transition-colors group-hover:bg-[#ff6d43] group-hover:text-white group-hover:ring-[#ff6d43]">
      <Icon className="h-4 w-4" />
    </span>
    <span className="min-w-0 flex-1">
      <span className="flex items-center justify-between gap-3">
        <span className="text-[15px] font-semibold leading-tight text-gray-900">{title}</span>
        <DirectionalArrow />
      </span>
      <span className="mt-1 block text-sm leading-5 text-gray-600">{description}</span>
      {meta && <span className="mt-2.5 block text-xs font-medium text-gray-900">{meta}</span>}
    </span>
  </Link>
)

// ─── Shared primitives ───────────────────────────────────────────────────────────

const DirectionalArrow = () => {
  const { dir } = useLanguage()
  return (
    <ArrowRight
      className={cn(
        'h-4 w-4 shrink-0 text-gray-400 transition-transform group-hover:text-[#ff6d43]',
        dir === 'rtl'
          ? 'rotate-180 group-hover:-translate-x-0.5'
          : 'group-hover:translate-x-0.5',
      )}
    />
  )
}

export const SkeletonLine = ({ className }: { className?: string }) => (
  <div className={cn('animate-pulse rounded-lg bg-gray-200', className)} />
)

export const EmptyMessage = ({ children }: { children: ReactNode }) => (
  <p className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm leading-5 text-gray-600">
    {children}
  </p>
)

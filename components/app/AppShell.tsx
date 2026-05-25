'use client'

import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { LucideIcon } from 'lucide-react'
import { ChevronDown, Globe, LogOut, PanelLeftClose, PanelLeftOpen, Search } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import NotificationBell from '@/components/NotificationBell'
import { useLanguage } from '@/contexts/LanguageContext'
import { cn } from '@/lib/utils'

export type AppShellNavItem = {
  label: string
  href: string
  icon: LucideIcon
}

type AppShellProps = {
  children: ReactNode
  navItems: AppShellNavItem[]
  portalLabel: string
  portalTone: 'client' | 'supplier' | 'admin'
}

const portalChip: Record<AppShellProps['portalTone'], string> = {
  client: 'bg-blue-50 text-blue-700 ring-blue-200/60',
  supplier: 'bg-green-50 text-green-700 ring-green-200/60',
  admin: 'bg-[#ff6d43]/10 text-[#c44818] ring-[#ff6d43]/16',
}

const buildNavSections = (portalTone: AppShellProps['portalTone'], navItems: AppShellNavItem[]) => {
  if (portalTone === 'admin') {
    return [
      { label: 'Workspace', items: navItems.slice(0, 6) },
      { label: 'Operations', items: navItems.slice(6, 13) },
      { label: 'Finance & Compliance', items: navItems.slice(13, 19) },
      { label: 'Governance', items: navItems.slice(19) },
    ].filter((s) => s.items.length > 0)
  }
  if (portalTone === 'supplier') {
    return [
      { label: 'Supply Desk', items: navItems.slice(0, 5) },
      { label: 'Business', items: navItems.slice(5) },
    ].filter((s) => s.items.length > 0)
  }
  return [
    { label: 'Procurement', items: navItems.slice(0, 6) },
    { label: 'Company', items: navItems.slice(6) },
  ].filter((s) => s.items.length > 0)
}

const SIDEBAR_KEY = 'mwrd_sidebar_collapsed'

export default function AppShell({ children, navItems, portalLabel, portalTone }: AppShellProps) {
  const { profile, signOut } = useAuth()
  const { lang, setLang, tr, dir } = useLanguage()
  const pathname = usePathname()
  const navSections = buildNavSections(portalTone, navItems)

  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(SIDEBAR_KEY) === 'true')
    } catch {}
  }, [])

  useEffect(() => {
    try {
      window.localStorage.setItem(SIDEBAR_KEY, String(collapsed))
    } catch {}
  }, [collapsed])

  const activeLabel =
    navItems.find(
      (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
    )?.label ?? portalLabel

  const initials = (profile?.company_name || profile?.public_id || 'M').slice(0, 1).toUpperCase()

  return (
    <div className="min-h-screen bg-[#f7f8f7] text-gray-900 lg:flex" dir={dir}>
      {/* Sidebar */}
      <aside
        className={cn(
          'relative hidden shrink-0 overflow-hidden border-e border-gray-200 bg-[#f7f8f7] shadow-inner transition-[width] duration-300 ease-out lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col',
          collapsed ? 'w-[5.5rem]' : 'w-[272px]',
        )}
      >
        {/* Logo */}
        <div className={cn('relative px-5 pt-5 pb-4', collapsed && 'px-3')}>
          <div className={cn('flex items-center gap-3', collapsed ? 'justify-center' : 'justify-between')}>
            <Link
              href={navItems[0]?.href ?? '/'}
              className={cn('block min-w-0', collapsed && 'pointer-events-auto')}
            >
              <span
                className={cn(
                  'inline-flex bg-white',
                  collapsed
                    ? 'h-11 w-11 items-center justify-center overflow-hidden rounded-xl p-2 ring-1 ring-gray-200 shadow-sm'
                    : 'rounded-xl px-2 py-1.5 shadow-sm',
                )}
              >
                <img
                  src="/logos/primary-logo-orange.svg"
                  alt="MWRD"
                  className={cn('h-9 w-auto max-w-[138px]', collapsed && 'h-7 max-w-none scale-[1.85]')}
                />
              </span>
            </Link>
            <button
              type="button"
              onClick={() => setCollapsed((v) => !v)}
              className={cn(
                'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-400 transition-colors hover:border-gray-300 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-200',
                collapsed && 'absolute -end-3.5 top-6 z-10 shadow-md',
              )}
              aria-label={tr(collapsed ? 'Expand sidebar' : 'Collapse sidebar')}
            >
              {collapsed ? (
                <PanelLeftOpen className="h-3.5 w-3.5" />
              ) : (
                <PanelLeftClose className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
          {!collapsed && (
            <>
              <p className="mt-3 text-xs leading-5 text-gray-400">{tr('Procurement workspace')}</p>
              <span
                className={cn(
                  'mt-3 inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1',
                  portalChip[portalTone],
                )}
              >
                {tr(portalLabel)}
              </span>
            </>
          )}
        </div>

        {/* Nav */}
        <nav className="relative flex-1 overflow-y-auto pb-5 px-3">
          <div className="flex flex-col gap-5">
            {navSections.map((section) => (
              <div key={section.label}>
                {!collapsed && (
                  <p className="mb-1.5 px-2 text-[11px] font-semibold text-gray-400">
                    {tr(section.label)}
                  </p>
                )}
                <div className="flex flex-col gap-0.5">
                  {section.items.map((item) => {
                    const isActive =
                      pathname === item.href || pathname.startsWith(`${item.href}/`)
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        title={collapsed ? tr(item.label) : undefined}
                        className={cn(
                          'group relative flex items-center rounded-xl text-sm font-medium transition-[background-color,color,box-shadow]',
                          collapsed ? 'h-11 justify-center px-0' : 'gap-3 px-2.5 py-2',
                          isActive
                            ? 'bg-white text-gray-900 shadow-md before:absolute before:inset-y-2 before:start-0 before:w-1 before:rounded-full before:bg-[#ff6d43]'
                            : 'text-gray-600 hover:bg-white hover:text-gray-900',
                        )}
                      >
                        <span
                          className={cn(
                            'flex h-5 w-5 shrink-0 items-center justify-center',
                            isActive ? 'text-[#ff6d43]' : 'text-gray-400 group-hover:text-gray-900',
                          )}
                        >
                          <item.icon className="h-5 w-5" />
                        </span>
                        {!collapsed && <span className="truncate">{tr(item.label)}</span>}
                      </Link>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </nav>

        {/* Bottom account section */}
        <div className={cn('relative border-t border-gray-200 p-3', collapsed && 'px-2')}>
          <Link
            href="/account"
            className={cn(
              'mb-1.5 flex items-center rounded-xl transition-colors hover:bg-white',
              collapsed ? 'justify-center p-1.5' : 'gap-3 p-2',
            )}
            title={collapsed ? tr('My account') : undefined}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gray-900 text-sm font-semibold text-white">
              {initials}
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-gray-900">
                  {profile?.company_name || tr('MWRD account')}
                </p>
                <p className="truncate text-xs text-gray-400">
                  {profile?.public_id || tr(portalLabel)}
                </p>
              </div>
            )}
          </Link>
          <button
            type="button"
            onClick={signOut}
            title={collapsed ? tr('Sign out') : undefined}
            className={cn(
              'flex w-full items-center rounded-xl text-sm font-medium text-gray-600 transition-colors hover:bg-white hover:text-gray-900',
              collapsed ? 'h-10 justify-center' : 'gap-2 px-2.5 py-2',
            )}
          >
            <LogOut className="h-4 w-4" />
            {!collapsed && tr('Sign out')}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <header className="sticky top-0 z-30 border-b border-gray-200 bg-[#f7f8f7]/90 backdrop-blur-xl">
          <div className="mx-auto flex h-16 w-full max-w-[1560px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
            {/* Mobile: logo + portal label */}
            <div className="flex min-w-0 items-center gap-3 lg:hidden">
              <div className="min-w-0">
                <img src="/logos/primary-logo-orange.svg" alt="MWRD" className="h-7 w-auto max-w-[112px]" />
                <p className="truncate text-xs text-gray-400">{tr(portalLabel)}</p>
              </div>
            </div>
            {/* Desktop: search + breadcrumb */}
            <div className="hidden min-w-0 flex-1 items-center gap-4 lg:flex">
              <label className="flex h-10 w-full max-w-[360px] items-center gap-2.5 rounded-xl border border-gray-200 bg-white px-3 text-gray-400 shadow-sm transition-colors focus-within:border-[#ff6d43] focus-within:ring-2 focus-within:ring-[#ff6d43]/20">
                <Search className="h-4 w-4 shrink-0" />
                <input
                  type="search"
                  className="h-full min-w-0 flex-1 border-0 bg-transparent p-0 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:ring-0"
                  placeholder={tr('Search')}
                  aria-label={tr('Search')}
                />
                <span className="inline-flex h-6 min-w-[28px] items-center justify-center rounded-md border border-gray-200 bg-gray-50 px-1.5 text-[11px] font-medium text-gray-400">
                  ⌘ K
                </span>
              </label>
              <div className="min-w-0 border-s border-gray-200 ps-4">
                <p className="text-[11px] font-semibold text-gray-400">{tr(portalLabel)}</p>
                <p className="mt-0.5 truncate text-sm font-semibold text-gray-900">{tr(activeLabel)}</p>
              </div>
            </div>
            {/* Right actions */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 text-sm font-medium text-gray-600 shadow-sm transition-colors hover:bg-gray-50 hover:text-gray-900"
                aria-label={tr('Toggle language')}
              >
                <Globe className="h-4 w-4" />
                {lang === 'en' ? 'عربي' : 'EN'}
              </button>
              <NotificationBell />
              <Link
                href="/account"
                className="hidden items-center gap-3 rounded-xl border border-gray-200 bg-white p-1 pe-2 shadow-sm transition-colors hover:bg-gray-50 sm:flex"
                title={tr('My account')}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#ff6d43] text-sm font-semibold text-white">
                  {initials}
                </div>
                <div className="min-w-0 pe-1">
                  <p className="max-w-36 truncate text-sm font-medium leading-tight text-gray-900">
                    {profile?.company_name || tr('MWRD account')}
                  </p>
                  <p className="max-w-36 truncate text-[11px] text-gray-400">
                    {profile?.public_id || tr(portalLabel)}
                  </p>
                </div>
                <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" />
              </Link>
            </div>
          </div>
          {/* Mobile nav tabs */}
          <nav className="flex gap-2 overflow-x-auto border-t border-gray-200 px-4 py-2 lg:hidden">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex shrink-0 items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-medium',
                    isActive
                      ? 'bg-[#ff6d43] text-white shadow-sm'
                      : 'border border-gray-200 bg-white text-gray-600',
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {tr(item.label)}
                </Link>
              )
            })}
          </nav>
        </header>

        {/* Page content */}
        <main className="mx-auto flex w-full max-w-[1560px] flex-1 px-4 pb-10 pt-6 sm:px-6 lg:px-8">
          <div className="min-w-0 flex-1">{children}</div>
        </main>
      </div>
    </div>
  )
}

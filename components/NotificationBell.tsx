'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, CheckCheck, X } from 'lucide-react'
import { useNotifications } from '@/hooks/useNotifications'

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export default function NotificationBell() {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications()
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleClick = async (n: { id: string; read: boolean; link: string | null }) => {
    if (!n.read) await markRead(n.id)
    setOpen(false)
    if (n.link) router.push(n.link)
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 shadow-sm transition-colors hover:bg-gray-50 hover:text-gray-900"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#ff6d43] px-1 text-[10px] font-semibold leading-none text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute end-0 top-12 z-50 w-[360px] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <span className="text-sm font-semibold text-gray-900">
              Notifications
              {unreadCount > 0 && (
                <span className="ms-2 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#ff6d43] px-1.5 text-[11px] font-semibold text-white">
                  {unreadCount}
                </span>
              )}
            </span>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Mark all read
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-50 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-10 text-center text-sm text-gray-400">No notifications yet</div>
            ) : (
              notifications.slice(0, 20).map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => handleClick(n)}
                  className={`w-full border-b border-gray-50 px-4 py-3 text-start transition-colors last:border-0 hover:bg-gray-50 ${
                    !n.read ? 'bg-[#fff7f5]' : ''
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <div className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${!n.read ? 'bg-[#ff6d43]' : 'bg-transparent'}`} />
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm leading-snug ${!n.read ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                        {n.title}
                      </p>
                      {n.message && (
                        <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-gray-500">
                          {n.message}
                        </p>
                      )}
                      <p className="mt-1 text-[11px] text-gray-400">{timeAgo(n.created_at)}</p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

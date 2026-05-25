import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

const variants = {
  default: 'bg-gray-100 text-gray-700',
  outline: 'border border-gray-200 bg-white text-gray-700',
  success: 'bg-green-50 text-green-700',
  warning: 'bg-amber-50 text-amber-700',
  danger: 'bg-red-50 text-red-700',
  info: 'bg-blue-50 text-blue-700',
  brand: 'bg-[#ff6d43]/10 text-[#c44818]',
}

type BadgeVariant = keyof typeof variants

export function Badge({
  children,
  variant = 'default',
  className,
}: {
  children: ReactNode
  variant?: BadgeVariant
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-medium',
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  )
}

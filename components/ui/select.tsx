'use client'

import type { ReactNode, SelectHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'
import { ChevronDown } from 'lucide-react'

type NativeSelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  children: ReactNode
}

export function Select({ children, className, ...props }: NativeSelectProps) {
  return (
    <div className="relative inline-flex items-center">
      <select
        className={cn(
          'h-10 appearance-none rounded-xl border border-gray-200 bg-white ps-3 pe-8 text-sm font-medium text-gray-700 shadow-sm outline-none transition-colors hover:border-gray-300 focus:border-[#ff6d43] focus:ring-2 focus:ring-[#ff6d43]/20 disabled:opacity-50',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute end-2.5 h-4 w-4 text-gray-400" />
    </div>
  )
}

export function SelectOption({ value, children }: { value: string; children: ReactNode }) {
  return <option value={value}>{children}</option>
}

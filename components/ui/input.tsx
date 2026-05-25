import * as React from "react"
import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-lg border border-[#c8ccc8] bg-white px-3 py-2 text-sm text-[#1a1a1a] shadow-sm transition-[border-color,box-shadow] outline-none",
          "placeholder:text-[#a0a39f]",
          "hover:border-[#8a8a85]",
          "focus:border-[#ff6d43] focus:ring-2 focus:ring-[#ff6d43]/20",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium",
          className,
        )}
        ref={ref}
        {...props}
      />
    )
  },
)
Input.displayName = "Input"

export { Input }

import * as React from "react"
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[#002147] text-white shadow hover:bg-[#00306b]",
        secondary:
          "border-transparent bg-[#6B21A8] text-white hover:bg-[#581C87]",
        destructive:
          "border-transparent bg-[#DC2626] text-white shadow hover:bg-[#B91C1C]",
        outline:
          "border-[#002147] text-[#002147] bg-transparent",
        success:
          "border-transparent bg-[#059669] text-white",
        warning:
          "border-transparent bg-[#D97706] text-white",
        pending:
          "border-transparent bg-[#64748B] text-white",
        info:
          "border-transparent bg-[#2563EB] text-white",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  ...props
}) {
  return (<div className={cn(badgeVariants({ variant }), className)} {...props} />);
}

export { Badge, badgeVariants }

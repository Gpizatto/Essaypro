import * as React from "react"
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[#D66B27] focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[#7C1805] text-white shadow hover:bg-[#A03217]",
        secondary:
          "border-transparent bg-[#36555A] text-white hover:bg-[#2A4045]",
        destructive:
          "border-transparent bg-[#5A1004] text-white shadow hover:bg-[#7C1805]",
        outline:
          "border-[#7C1805] text-[#7C1805] bg-transparent",
        success:
          "border-transparent bg-[#36555A] text-white",
        warning:
          "border-transparent bg-[#DAB257] text-[#2C1A0E]",
        pending:
          "border-transparent bg-[#6B5B4E] text-white",
        info:
          "border-transparent bg-[#D9B2CF] text-[#4A1A3A]",
        accent:
          "border-transparent bg-[#D66B27] text-white",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({ className, variant, ...props }) {
  return (<div className={cn(badgeVariants({ variant }), className)} {...props} />);
}

export { Badge, badgeVariants }

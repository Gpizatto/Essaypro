import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-[#002147] text-white shadow hover:bg-[#00306b]",
        destructive:
          "bg-[#DC2626] text-white shadow-sm hover:bg-[#B91C1C]",
        outline:
          "border-2 border-[#002147] text-[#002147] bg-white shadow-sm hover:bg-[#002147] hover:text-white",
        secondary:
          "bg-[#6B21A8] text-white shadow-sm hover:bg-[#581C87]",
        ghost:
          "text-[#002147] hover:bg-[#002147]/10 hover:text-[#002147]",
        link:
          "text-[#002147] underline-offset-4 hover:underline",
        success:
          "bg-[#059669] text-white shadow-sm hover:bg-[#047857]",
        warning:
          "bg-[#D97706] text-white shadow-sm hover:bg-[#B45309]",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const Button = React.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button"
  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props} />
  );
})
Button.displayName = "Button"

export { Button, buttonVariants }

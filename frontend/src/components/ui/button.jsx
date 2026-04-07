import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D66B27] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-[#7C1805] text-white shadow hover:bg-[#A03217]",
        destructive:
          "bg-[#7C1805] text-white shadow-sm hover:bg-[#5A1004]",
        outline:
          "border-2 border-[#7C1805] text-[#7C1805] bg-transparent shadow-sm hover:bg-[#7C1805] hover:text-white",
        secondary:
          "bg-[#36555A] text-white shadow-sm hover:bg-[#2A4045]",
        ghost:
          "text-[#7C1805] hover:bg-[#7C1805]/10",
        link:
          "text-[#7C1805] underline-offset-4 hover:underline",
        accent:
          "bg-[#D66B27] text-white shadow-sm hover:bg-[#B85A1F]",
        success:
          "bg-[#36555A] text-white shadow-sm hover:bg-[#2A4045]",
        warning:
          "bg-[#DAB257] text-[#2C1A0E] shadow-sm hover:bg-[#C9A048]",
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

import { Toaster as Sonner, toast } from "sonner"

const Toaster = ({ ...props }) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-white group-[.toaster]:text-[#111827] group-[.toaster]:border group-[.toaster]:border-gray-200 group-[.toaster]:shadow-lg",
          description:
            "group-[.toast]:text-[#6B7280]",
          actionButton:
            "group-[.toast]:bg-[#002147] group-[.toast]:text-white",
          cancelButton:
            "group-[.toast]:bg-[#F3F4F6] group-[.toast]:text-[#374151]",
          error:
            "group-[.toaster]:bg-[#FEF2F2] group-[.toaster]:text-[#991B1B] group-[.toaster]:border-[#FECACA]",
          success:
            "group-[.toaster]:bg-[#F0FDF4] group-[.toaster]:text-[#166534] group-[.toaster]:border-[#BBF7D0]",
          warning:
            "group-[.toaster]:bg-[#FFFBEB] group-[.toaster]:text-[#92400E] group-[.toaster]:border-[#FDE68A]",
          info:
            "group-[.toaster]:bg-[#EFF6FF] group-[.toaster]:text-[#1E40AF] group-[.toaster]:border-[#BFDBFE]",
        },
      }}
      {...props}
    />
  );
}

export { Toaster, toast }

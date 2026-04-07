import { Toaster as Sonner, toast } from "sonner"

const Toaster = ({ ...props }) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-white group-[.toaster]:text-[#2C1A0E] group-[.toaster]:border group-[.toaster]:border-[#E8DDD0] group-[.toaster]:shadow-lg group-[.toaster]:font-[Bricolage_Grotesque,sans-serif]",
          description:
            "group-[.toast]:text-[#6B5B4E]",
          actionButton:
            "group-[.toast]:bg-[#7C1805] group-[.toast]:text-white",
          cancelButton:
            "group-[.toast]:bg-[#FDF3E8] group-[.toast]:text-[#6B5B4E]",
          error:
            "group-[.toaster]:bg-[#FEF2F2] group-[.toaster]:text-[#7C1805] group-[.toaster]:border-[#7C1805]/30",
          success:
            "group-[.toaster]:bg-[#F0F5F5] group-[.toaster]:text-[#36555A] group-[.toaster]:border-[#36555A]/30",
          warning:
            "group-[.toaster]:bg-[#FFFBEB] group-[.toaster]:text-[#2C1A0E] group-[.toaster]:border-[#DAB257]/50",
          info:
            "group-[.toaster]:bg-[#FDF0F8] group-[.toaster]:text-[#4A1A3A] group-[.toaster]:border-[#D9B2CF]/50",
        },
      }}
      {...props}
    />
  );
}

export { Toaster, toast }

"use client"

import { Toaster as Sonner } from "sonner"

const Toaster = ({ ...props }: React.ComponentProps<typeof Sonner>) => {
  return (
    <Sonner
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-white group-[.toaster]:text-zinc-950 group-[.toaster]:border-zinc-200 group-[.toaster]:shadow-lg group-[.toaster]:rounded-xl",
          description: "group-[.toast]:text-zinc-500",
          actionButton:
            "group-[.toast]:bg-zinc-900 group-[.toast]:text-zinc-50",
          cancelButton:
            "group-[.toast]:bg-zinc-100 group-[.toast]:text-zinc-500",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }

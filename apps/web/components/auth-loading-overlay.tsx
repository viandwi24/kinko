'use client'

import { useAuth } from '@/contexts/auth-context'
import { LoaderIcon, ShieldIcon } from 'lucide-react'

export function AuthLoadingOverlay() {
  const { isLoggingIn } = useAuth()

  if (!isLoggingIn) return null

  return (
    <div className="fixed inset-0 z-[999] flex flex-col items-center justify-center gap-4 bg-background/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-3">
        <div className="relative flex size-16 items-center justify-center">
          <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
          <LoaderIcon className="size-7 animate-spin text-primary" />
        </div>
        <div className="flex flex-col items-center gap-1 text-center">
          <p className="text-sm font-semibold">Waiting for signature</p>
          <p className="text-xs text-muted-foreground">Approve the sign-in request in your wallet</p>
        </div>
        <div className="flex items-center gap-1.5 rounded-full border border-primary/15 bg-primary/5 px-3 py-1">
          <ShieldIcon className="size-3 text-primary" />
          <span className="text-xs text-primary">No gas · No transaction</span>
        </div>
      </div>
    </div>
  )
}

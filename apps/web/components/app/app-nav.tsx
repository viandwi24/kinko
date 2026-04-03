'use client'

import Link from 'next/link'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import { usePathname } from 'next/navigation'
import { ThemeToggle } from '@/components/theme-toggle'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/auth-context'
import { Badge } from '@/components/ui/badge'
import { LoaderIcon, ShieldCheckIcon } from 'lucide-react'

const WalletButton = dynamic(() => import('@/components/wallet-button').then(m => m.WalletButton), { ssr: false })

const NAV_LINKS = [
  { href: '/app/dashboard', label: 'Dashboard' },
  { href: '/app/chat', label: 'Chat' },
  { href: '/app/settings', label: 'Settings' },
]

export function AppNav() {
  const pathname = usePathname()
  const { isAuthenticated, isLoggingIn, logout } = useAuth()

  return (
    <header className="sticky top-0 z-50 border-b border-primary/10 bg-background/60 backdrop-blur-xl">
      <div className="mx-auto grid h-14 max-w-6xl grid-cols-3 items-center px-6">
        {/* Left */}
        <Link href="/" className="flex items-center gap-2.5">
          <Image src="/logo.svg" alt="Kinko" width={22} height={22} />
          <span className="text-sm font-semibold tracking-tight">Kinko.sol</span>
        </Link>

        {/* Center */}
        <nav className="flex items-center justify-center rounded-2xl">
          <div className="flex items-center rounded-2xl border border-primary/10 bg-primary/5 p-1 gap-0.5">
            {NAV_LINKS.map((link) => {
              const active = pathname === link.href
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'rounded-xl px-4 py-1.5 text-sm font-medium transition-all duration-200',
                    active
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-primary/10'
                  )}
                >
                  {link.label}
                </Link>
              )
            })}
          </div>
        </nav>

        {/* Right */}
        <div className="flex items-center justify-end gap-2">
          <ThemeToggle />

          {isLoggingIn && (
            <Badge variant="secondary" className="gap-1.5 rounded-full border-primary/20 bg-primary/10 text-xs text-primary">
              <LoaderIcon className="size-3 animate-spin" />
              Signing in…
            </Badge>
          )}
          {isAuthenticated && !isLoggingIn && (
            <Badge variant="secondary" className="gap-1.5 rounded-full border-green-500/20 bg-green-500/10 text-xs text-green-400">
              <ShieldCheckIcon className="size-3" />
              Verified
            </Badge>
          )}

          <WalletButton />
        </div>
      </div>
    </header>
  )
}

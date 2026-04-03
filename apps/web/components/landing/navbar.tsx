'use client'

import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-toggle'
import Link from 'next/link'
import Image from 'next/image'

export function Navbar() {
  return (
    <motion.header
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
      className="fixed top-0 inset-x-0 z-50 border-b border-primary/10 bg-background/60 backdrop-blur-xl"
    >
      <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <Image src="/logo.svg" alt="Kinko" width={26} height={26} />
          <span className="text-base tracking-tight text-foreground font-black">Kinko<span className="text-primary text-xs font-semibold">.sol</span></span>
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
          <Link href="#how-it-works" className="hover:text-primary transition-colors duration-200">How it works</Link>
          <Link href="#features" className="hover:text-primary transition-colors duration-200">Features</Link>
        </nav>

        <div className="flex items-center gap-2">
          <Button variant="ghost" className="text-muted-foreground hover:text-foreground" asChild>
            <Link href="/app/dashboard">Dashboard</Link>
          </Button>
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_16px_var(--primary)/35]" asChild>
            <Link href="/app/dashboard">Launch App</Link>
          </Button>
          <div className="w-px h-5 bg-border mx-1" />
          <ThemeToggle />
        </div>
      </div>
    </motion.header>
  )
}

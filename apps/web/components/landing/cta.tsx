'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export function CTA() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section className="py-32 px-6" ref={ref}>
      <div className="mx-auto max-w-2xl text-center">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="relative flex flex-col items-center gap-6 rounded-3xl border border-primary/15 bg-primary/5 px-10 py-16 backdrop-blur-sm overflow-hidden"
        >
          {/* Glow behind CTA card */}
          <div
            className="pointer-events-none absolute inset-0 rounded-3xl"
            style={{
              background: 'radial-gradient(ellipse 80% 60% at 50% 100%, oklch(0.73 0.14 295 / 0.15) 0%, transparent 70%)',
            }}
          />

          <h2 className="relative text-3xl font-bold tracking-tight sm:text-4xl">
            Stake once.<br />
            <span className="bg-linear-to-br from-primary/70 via-primary to-primary/50 bg-clip-text text-transparent">
              Use forever.
            </span>
          </h2>
          <p className="relative text-muted-foreground max-w-sm text-sm leading-relaxed">
            Your SOL keeps working. Your AI keeps running. No manual top-ups, no subscriptions — just yield doing its job.
          </p>
          <Button
            className="relative bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_40px_color-mix(in_oklch,var(--primary)_45%,transparent)] h-12 px-10 text-base"
            asChild
          >
            <Link href="/app/dashboard">Get started</Link>
          </Button>
        </motion.div>
      </div>

      <div className="mx-auto max-w-6xl mt-24">
        <div className="border-t border-primary/10" />
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">Kinko</span>
          <span>Built on Solana · Powered by Metaplex · Marinade Finance</span>
        </div>
      </div>
    </section>
  )
}

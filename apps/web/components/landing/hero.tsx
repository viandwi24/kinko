'use client'

import { motion, type Variants } from 'framer-motion'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, delay: i * 0.1, ease: [0.25, 0.1, 0.25, 1] },
  }),
}

const float: Variants = {
  animate: {
    y: [0, -18, 0],
    transition: { duration: 6, repeat: Infinity, ease: 'easeInOut' },
  },
}

const floatSlow: Variants = {
  animate: {
    y: [0, 12, 0],
    transition: { duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 2 },
  },
}

export function Hero() {
  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden pt-16">
      {/* Floating orbs — playful Phantom-style */}
      <motion.div
        variants={float}
        animate="animate"
        className="pointer-events-none absolute left-[8%] top-[20%] size-72 rounded-full opacity-30 blur-3xl"
        style={{ background: 'color-mix(in oklch, var(--primary) 60%, transparent)' }}
      />
      <motion.div
        variants={floatSlow}
        animate="animate"
        className="pointer-events-none absolute right-[6%] top-[35%] size-56 rounded-full opacity-20 blur-3xl"
        style={{ background: 'color-mix(in oklch, oklch(0.75 0.12 240) 60%, transparent)' }}
      />
      <motion.div
        variants={float}
        animate="animate"
        className="pointer-events-none absolute bottom-[15%] left-[20%] size-48 rounded-full opacity-20 blur-3xl"
        style={{ background: 'color-mix(in oklch, oklch(0.78 0.1 320) 60%, transparent)' }}
      />

      {/* Dot grid */}
      <div
        className="pointer-events-none absolute inset-0 text-primary opacity-[0.12]"
        style={{
          backgroundImage: 'radial-gradient(currentColor 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <div className="relative z-10 mx-auto max-w-4xl px-6 text-center">
        <motion.div custom={0} variants={fadeUp} initial="hidden" animate="visible">
          <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary backdrop-blur-sm">
            <span className="size-1.5 animate-pulse rounded-full bg-primary" />
            Built on Solana · Metaplex Agents
          </span>
        </motion.div>

        <motion.h1
          custom={1}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="mt-4 text-5xl font-extrabold tracking-tight sm:text-7xl lg:text-8xl"
        >
          Your AI agent,
          <br />
          <span className="inline-block bg-linear-to-br from-primary/80 via-primary to-primary/60 bg-clip-text text-transparent">
            funded by yield.
          </span>
        </motion.h1>

        <motion.p
          custom={2}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="mx-auto mt-6 max-w-lg text-lg text-muted-foreground leading-relaxed"
        >
          Deposit SOL once. Staking yield pays for your AI — automatically, forever.
          No subscriptions. No top-ups. Principal stays locked.
        </motion.p>

        <motion.div
          custom={3}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center"
        >
          <Button
            className="h-12 rounded-2xl bg-primary px-8 text-base font-semibold text-primary-foreground shadow-[0_8px_32px_color-mix(in_oklch,var(--primary)_45%,transparent)] transition-transform hover:scale-[1.03] hover:bg-primary/95"
            asChild
          >
            <Link href="/app/dashboard">Start staking</Link>
          </Button>
          <Button
            variant="outline"
            className="h-12 rounded-2xl border-primary/20 bg-primary/5 px-8 text-base font-medium hover:border-primary/35 hover:bg-primary/10"
            asChild
          >
            <Link href="#how-it-works">How it works</Link>
          </Button>
        </motion.div>

        {/* Stats pills */}
        <motion.div
          custom={4}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="mt-16 flex flex-wrap items-center justify-center gap-3"
        >
          {[
            { label: 'Staking APY', value: '~8%', color: 'var(--primary)' },
            { label: 'Principal', value: 'Locked onchain', color: 'oklch(0.72 0.12 240)' },
            { label: 'Settlement', value: '400ms', color: 'oklch(0.72 0.1 165)' },
            { label: 'Agent identity', value: 'Metaplex Core', color: 'oklch(0.75 0.1 320)' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/5 px-5 py-3 backdrop-blur-sm dark:border-white/5 dark:bg-white/5"
            >
              <div
                className="size-2 rounded-full"
                style={{ background: stat.color }}
              />
              <div>
                <div className="text-sm font-semibold leading-none text-foreground">{stat.value}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">{stat.label}</div>
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

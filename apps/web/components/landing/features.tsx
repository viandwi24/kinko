'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'

const features = [
  {
    title: 'Per-user treasury',
    description: 'Every user gets their own onchain treasury PDA. Your yield is yours alone — isolated, verifiable, principal-locked.',
    accent: 'var(--primary)',
  },
  {
    title: 'Onchain agent identity',
    description: 'Kinko Agent is registered as a Metaplex Core Asset with a built-in wallet (Asset Signer PDA). No private keys. Cannot be stolen.',
    accent: 'oklch(0.72 0.12 240)',
  },
  {
    title: 'Agent-to-Agent payments',
    description: 'The agent autonomously discovers and hires specialist agents via A2A protocol, paying them directly using x402.',
    accent: 'oklch(0.72 0.1 165)',
  },
  {
    title: 'Marinade Finance yield',
    description: 'Your SOL earns ~8% APY through Marinade liquid staking. The yield accumulates automatically every second.',
    accent: 'oklch(0.75 0.1 320)',
  },
  {
    title: 'Zero subscriptions',
    description: 'No monthly fees. No per-request billing. Staking yield is the payment — it runs as long as you are staked.',
    accent: 'oklch(0.73 0.13 50)',
  },
  {
    title: 'Fully verifiable',
    description: 'Every yield deduction, every agent payment — all onchain. Query treasury state or agent metrics via DAS API.',
    accent: 'oklch(0.72 0.12 200)',
  },
]

export function Features() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section id="features" className="relative py-32 px-6 overflow-hidden" ref={ref}>
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse 60% 40% at 50% 50%, color-mix(in oklch, var(--primary) 8%, transparent) 0%, transparent 70%)',
        }}
      />

      <div className="relative mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-primary/60 mb-3">Features</p>
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Built different.</h2>
        </motion.div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 16 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="group relative flex flex-col gap-3 rounded-3xl border border-white/5 bg-card/60 p-6 backdrop-blur-sm transition-all duration-300 hover:border-white/10 hover:-translate-y-1"
            >
              {/* Accent dot */}
              <div
                className="size-8 rounded-2xl"
                style={{ background: `color-mix(in oklch, ${feature.accent} 20%, transparent)` }}
              >
                <div
                  className="m-2 size-4 rounded-xl"
                  style={{ background: feature.accent }}
                />
              </div>
              <h3 className="text-sm font-bold text-foreground">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

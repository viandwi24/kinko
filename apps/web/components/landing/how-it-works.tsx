'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'

const steps = [
  {
    number: '01',
    title: 'Deposit SOL',
    description: 'Deposit SOL into your personal treasury. The principal is locked forever — untouchable by anyone, including the agent.',
    color: 'var(--primary)',
  },
  {
    number: '02',
    title: 'Yield flows in',
    description: 'Your staked SOL earns ~8% APY. Yield accumulates continuously onchain — your AI budget, no top-ups required.',
    color: 'oklch(0.72 0.12 240)',
  },
  {
    number: '03',
    title: 'The agent awakens',
    description: 'Every conversation deducts a tiny amount of yield. Principal stays locked. The agent runs as long as you are staked.',
    color: 'oklch(0.72 0.1 165)',
  },
]

export function HowItWorks() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section id="how-it-works" className="py-32 px-6" ref={ref}>
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-primary/60 mb-3">How it works</p>
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Three steps. That&apos;s it.</h2>
        </motion.div>

        <div className="grid gap-4 sm:grid-cols-3">
          {steps.map((step, i) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 24 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: i * 0.15 }}
              className="relative flex flex-col gap-4 rounded-3xl border border-white/5 bg-card/60 p-8 backdrop-blur-sm overflow-hidden"
            >
              {/* Soft per-step glow */}
              <div
                className="pointer-events-none absolute -top-8 -right-8 size-36 rounded-full opacity-25 blur-2xl"
                style={{ background: step.color }}
              />
              <span className="font-mono text-5xl font-black" style={{ color: `color-mix(in oklch, ${step.color} 35%, transparent)` }}>
                {step.number}
              </span>
              <div
                className="size-1 rounded-full"
                style={{ background: step.color }}
              />
              <h3 className="text-base font-bold text-foreground">{step.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

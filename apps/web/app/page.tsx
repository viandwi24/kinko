import { Navbar } from '@/components/landing/navbar'
import { Hero } from '@/components/landing/hero'
import { HowItWorks } from '@/components/landing/how-it-works'
import { Features } from '@/components/landing/features'
import { CTA } from '@/components/landing/cta'

export default function Home() {
  return (
    <main className="relative flex flex-col flex-1 overflow-hidden">
      {/* Single ambient glow that persists across all sections */}
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(ellipse 100% 50% at 50% 0%, color-mix(in oklch, var(--primary) 10%, transparent) 0%, transparent 60%),' +
            'radial-gradient(ellipse 80% 40% at 50% 55%, color-mix(in oklch, var(--primary) 6%, transparent) 0%, transparent 55%)',
        }}
      />
      <Navbar />
      <Hero />
      <HowItWorks />
      <Features />
      <CTA />
    </main>
  )
}

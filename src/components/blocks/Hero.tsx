'use client'
import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import type { HeroProps } from '@/lib/blocks/registry'

export function HeroBlock({ props }: { props: HeroProps }) {
  const { title, subtitle, ctaText, ctaHref, hue } = props
  return (
    <section
      className="relative overflow-hidden rounded-2xl"
      style={{
        background: `linear-gradient(135deg, hsl(${hue},70%,55%) 0%, hsl(${(hue + 40) % 360},65%,40%) 100%)`,
      }}
    >
      {/* decorative blobs */}
      <div className="pointer-events-none absolute -right-12 -top-12 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-16 -left-10 h-56 w-56 rounded-full bg-black/10 blur-2xl" />
      <div className="relative px-6 py-16 text-center sm:px-12 sm:py-20">
        <h1 className="mx-auto max-w-3xl text-3xl font-extrabold leading-tight text-white drop-shadow-sm sm:text-5xl">
          {title}
        </h1>
        {subtitle ? (
          <p className="mx-auto mt-4 max-w-xl text-sm text-white/90 sm:text-lg">{subtitle}</p>
        ) : null}
        {ctaText ? (
          <Link
            href={ctaHref}
            className="mt-7 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-ink-900 shadow-lg transition hover:scale-105"
          >
            {ctaText} <ArrowRight size={16} />
          </Link>
        ) : null}
      </div>
    </section>
  )
}

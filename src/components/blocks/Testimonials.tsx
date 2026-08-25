'use client'
import { Star, Quote } from 'lucide-react'
import type { TestimonialsProps } from '@/lib/blocks/registry'

export function TestimonialsBlock({ props }: { props: TestimonialsProps }) {
  if (!props.items?.length) return null
  return (
    <section className="py-6">
      <h2 className="mb-5 text-center text-xl font-bold text-ink-900">What Our Customers Say</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {props.items.map((t, i) => (
          <div
            key={i}
            className="relative rounded-xl border border-ink-100 bg-white p-5 shadow-sm"
          >
            <Quote className="absolute right-4 top-4 text-brand-100" size={32} />
            <div className="mb-2 flex gap-0.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} size={14} className="fill-amber-400 text-amber-400" />
              ))}
            </div>
            <p className="text-sm leading-relaxed text-ink-700">“{t.text}”</p>
            <div className="mt-4 flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
                {t.name.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-semibold text-ink-900">{t.name}</p>
                {t.role ? <p className="text-xs text-ink-400">{t.role}</p> : null}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

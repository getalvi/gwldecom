'use client'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { HelpCircle } from 'lucide-react'
import type { FaqProps } from '@/lib/blocks/registry'

export function FaqBlock({ props }: { props: FaqProps }) {
  if (!props.items?.length) return null
  return (
    <section className="mx-auto max-w-3xl py-6">
      <div className="mb-4 flex items-center gap-2">
        <HelpCircle className="text-brand-500" size={20} />
        <h2 className="text-xl font-bold text-ink-900">Frequently Asked Questions</h2>
      </div>
      <Accordion type="single" collapsible className="rounded-xl border border-ink-100 bg-white">
        {props.items.map((item, i) => (
          <AccordionItem key={i} value={`item-${i}`} className={i === props.items.length - 1 ? 'border-b-0' : ''}>
            <AccordionTrigger className="px-4 text-left text-sm font-medium hover:no-underline">
              {item.q}
            </AccordionTrigger>
            <AccordionContent className="px-4 text-sm text-ink-600">{item.a}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  )
}

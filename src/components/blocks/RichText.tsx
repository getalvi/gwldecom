'use client'
import ReactMarkdown from 'react-markdown'
import type { RichTextProps } from '@/lib/blocks/registry'

export function RichTextBlock({ props }: { props: RichTextProps }) {
  return (
    <div className="mx-auto max-w-3xl px-1 py-6">
      <div className="prose prose-sm max-w-none text-ink-700 sm:prose-base prose-headings:text-ink-900 prose-a:text-brand-600 prose-strong:text-ink-900 prose-li:my-1">
        <ReactMarkdown>{props.content}</ReactMarkdown>
      </div>
    </div>
  )
}

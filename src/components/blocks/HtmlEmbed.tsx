'use client'
import { useMemo } from 'react'
import DOMPurify from 'isomorphic-dompurify'
import type { HtmlEmbedProps } from '@/lib/blocks/registry'

// Renders raw HTML provided by staff/admin via the Page Builder. The HTML is
// sanitized with DOMPurify to strip scripts, event handlers, and other
// XSS vectors before being inserted — the closest safe equivalent to a
// WordPress shortcode embed.
export function HtmlEmbedBlock({ props }: { props: HtmlEmbedProps }) {
  const clean = useMemo(
    () => DOMPurify.sanitize(props.html || '', { USE_PROFILES: { html: true } }),
    [props.html]
  )
   
  return <div className="html-embed" dangerouslySetInnerHTML={{ __html: clean }} />
}

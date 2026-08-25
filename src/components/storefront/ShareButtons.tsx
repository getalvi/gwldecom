'use client'

import { useState } from 'react'
import { Share2, MessageCircle, Facebook, Link2, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useToast } from '@/hooks/use-toast'

export function ShareButtons({ title, slug }: { title: string; slug: string }) {
  const [copied, setCopied] = useState(false)
  const { toast } = useToast()

  // Build a shareable URL. Since routes are hash-based, the full URL includes #/.
  const url =
    typeof window !== 'undefined'
      ? `${window.location.origin}/#/product/${slug}`
      : `/#/product/${slug}`
  const encodedUrl = encodeURIComponent(url)
  const encodedTitle = encodeURIComponent(title)

  function shareWhatsApp() {
    window.open(
      `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
      '_blank',
      'noopener,noreferrer'
    )
  }
  function shareFacebook() {
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      '_blank',
      'noopener,noreferrer'
    )
  }
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      toast({ title: 'Link copied!' })
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast({ title: 'Failed to copy', variant: 'destructive' })
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Share2 size={14} /> Share
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-52 p-2">
        <p className="mb-1.5 px-1 text-[11px] font-semibold uppercase tracking-wide text-ink-400">
          Share this product
        </p>
        <div className="flex flex-col gap-0.5">
          <button
            onClick={shareWhatsApp}
            className="flex items-center gap-2.5 rounded-md px-2 py-2 text-sm text-ink-700 transition hover:bg-emerald-50 hover:text-emerald-700"
          >
            <MessageCircle size={16} className="text-emerald-600" /> WhatsApp
          </button>
          <button
            onClick={shareFacebook}
            className="flex items-center gap-2.5 rounded-md px-2 py-2 text-sm text-ink-700 transition hover:bg-blue-50 hover:text-blue-700"
          >
            <Facebook size={16} className="text-blue-600" /> Facebook
          </button>
          <button
            onClick={copyLink}
            className="flex items-center gap-2.5 rounded-md px-2 py-2 text-sm text-ink-700 transition hover:bg-ink-50"
          >
            {copied ? (
              <>
                <Check size={16} className="text-emerald-600" /> Copied!
              </>
            ) : (
              <>
                <Link2 size={16} className="text-ink-500" /> Copy link
              </>
            )}
          </button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

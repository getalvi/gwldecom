'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { BannerCarouselProps } from '@/lib/blocks/registry'
import type { BannerT } from '@/lib/types'
import { api } from '@/lib/api'

export function BannerCarouselBlock({ props }: { props: BannerCarouselProps }) {
  const [banners, setBanners] = useState<BannerT[]>([])
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    api<BannerT[]>('/api/banners').then(setBanners).catch(() => {})
  }, [])

  useEffect(() => {
    if (!props.autoplay || banners.length <= 1) return
    const t = setInterval(() => setIdx((i) => (i + 1) % banners.length), 4500)
    return () => clearInterval(t)
  }, [props.autoplay, banners.length])

  if (!banners.length) return null
  const current = banners[idx]
  if (!current) return null

  return (
    <div className="relative overflow-hidden rounded-2xl">
      <Link
        href={current.linkUrl || '#/'}
        className="block aspect-[16/7] w-full sm:aspect-[21/9]"
      >
        { }
        <img
          src={current.imageUrl}
          alt={current.title}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
        <div className="absolute bottom-0 left-0 p-6 text-white sm:p-10">
          <h2 className="text-xl font-bold drop-shadow sm:text-3xl">{current.title}</h2>
        </div>
      </Link>
      {banners.length > 1 ? (
        <>
          <button
            onClick={(e) => {
              e.preventDefault()
              setIdx((i) => (i - 1 + banners.length) % banners.length)
            }}
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/70 p-2 text-ink-700 hover:bg-white"
            aria-label="Previous"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={(e) => {
              e.preventDefault()
              setIdx((i) => (i + 1) % banners.length)
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/70 p-2 text-ink-700 hover:bg-white"
            aria-label="Next"
          >
            <ChevronRight size={18} />
          </button>
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
            {banners.map((_, i) => (
              <button
                key={i}
                onClick={(e) => {
                  e.preventDefault()
                  setIdx(i)
                }}
                className={`h-1.5 rounded-full transition-all ${
                  i === idx ? 'w-6 bg-brand-500' : 'w-1.5 bg-white/70'
                }`}
                aria-label={`Slide ${i + 1}`}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  )
}

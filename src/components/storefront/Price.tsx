'use client'
import { formatBDT } from '@/lib/api'

export function Price({
  price,
  compareAt,
  className = '',
  size = 'md',
}: {
  price: number
  compareAt?: number | null
  className?: string
  size?: 'sm' | 'md' | 'lg'
}) {
  const sz =
    size === 'lg' ? 'text-2xl' : size === 'sm' ? 'text-sm' : 'text-lg'
  return (
    <div className={`flex items-baseline gap-2 ${className}`}>
      <span className={`font-bold text-brand-600 ${sz}`}>{formatBDT(price)}</span>
      {compareAt && compareAt > price ? (
        <span className="text-xs text-ink-400 line-through">{formatBDT(compareAt)}</span>
      ) : null}
      {compareAt && compareAt > price ? (
        <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
          -{Math.round(((compareAt - price) / compareAt) * 100)}%
        </span>
      ) : null}
    </div>
  )
}

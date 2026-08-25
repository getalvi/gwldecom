'use client'
import { Star } from 'lucide-react'

export function StarRating({
  value,
  size = 14,
  showValue = false,
  count,
}: {
  value: number
  size?: number
  showValue?: boolean
  count?: number
}) {
  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((i) => {
          const fill = Math.max(0, Math.min(1, value - (i - 1)))
          return (
            <span key={i} className="relative inline-block" style={{ width: size, height: size }}>
              <Star size={size} className="absolute inset-0 text-ink-200" strokeWidth={1.5} />
              <span
                className="absolute inset-0 overflow-hidden"
                style={{ width: `${fill * 100}%` }}
              >
                <Star size={size} className="text-amber-400 fill-amber-400" strokeWidth={1.5} />
              </span>
            </span>
          )
        })}
      </div>
      {showValue ? (
        <span className="text-xs font-medium text-ink-600">{value.toFixed(1)}</span>
      ) : null}
      {typeof count === 'number' ? (
        <span className="text-xs text-ink-400">({count})</span>
      ) : null}
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { Trash2, Star, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { api } from '@/lib/api'
import { useToast } from '@/hooks/use-toast'

interface AdminReviewT {
  id: string
  productId: string
  userId: string
  rating: number
  title: string | null
  body: string | null
  createdAt: string
  user?: { id: string; fullName: string | null } | null
  product?: { id: string; title: string; slug: string } | null
}

export function ReviewsView() {
  const { toast } = useToast()
  const [reviews, setReviews] = useState<AdminReviewT[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api<AdminReviewT[]>('/api/reviews')
      .then(setReviews)
      .finally(() => setLoading(false))
  }, [])

  async function remove(id: string) {
    if (!confirm('Delete this review?')) return
    try {
      await api(`/api/reviews/${id}`, { method: 'DELETE' })
      setReviews((prev) => prev.filter((r) => r.id !== id))
      toast({ title: 'Review deleted' })
    } catch (e: any) {
      toast({ title: e.message || 'Failed', variant: 'destructive' })
    }
  }
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-ink-900 sm:text-2xl">Reviews</h1>
        <p className="text-sm text-ink-400">{reviews.length} reviews</p>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-ink-100 bg-ink-50 text-left text-xs uppercase tracking-wide text-ink-500">
              <tr>
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">Reviewer</th>
                <th className="px-4 py-3 font-medium">Rating</th>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Body</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-ink-400">Loading...</td>
                </tr>
              ) : reviews.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <MessageSquare size={36} className="mx-auto mb-2 text-ink-200" />
                    <p className="text-sm text-ink-400">No reviews yet.</p>
                  </td>
                </tr>
              ) : (
                reviews.map((r) => (
                  <tr key={r.id} className="hover:bg-ink-50/50 align-top">
                    <td className="px-4 py-3">
                      <p className="line-clamp-2 text-ink-900">{r.product?.title || '—'}</p>
                    </td>
                    <td className="px-4 py-3 text-ink-600">
                      {r.user?.fullName || 'Anonymous'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Star size={14} className="fill-amber-400 text-amber-400" />
                        <span className="font-medium text-ink-900">{r.rating}/5</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="line-clamp-1 font-medium text-ink-900">
                        {r.title || <span className="text-ink-400">—</span>}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="line-clamp-2 max-w-xs text-xs text-ink-500">
                        {r.body || <span className="text-ink-400">—</span>}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-xs text-ink-400">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:text-red-600"
                          onClick={() => remove(r.id)}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

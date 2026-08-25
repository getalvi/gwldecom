'use client'

import { useEffect, useState } from 'react'
import { MessageCircleQuestion, Send, Loader2, CheckCircle2, HelpCircle } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useSession } from '@/lib/session-store'
import { api } from '@/lib/api'
import { navigate } from '@/lib/router'
import { useToast } from '@/hooks/use-toast'

type Question = {
  id: string
  question: string
  answer: string | null
  createdAt: string
  answeredAt: string | null
  user?: { id: string; fullName: string | null } | null
}

export function ProductQAndA({ productId, slug }: { productId: string; slug: string }) {
  const { user } = useSession()
  const { toast } = useToast()
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [question, setQuestion] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    setLoading(true)
    api<{ items: Question[]; answered: number; pending: number }>(
      `/api/products/${slug}/questions`
    )
      .then((r) => setQuestions(r.items))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [slug])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) {
      toast({ title: 'Please sign in to ask a question', variant: 'destructive' })
      navigate('/login')
      return
    }
    if (question.trim().length < 5) {
      toast({ title: 'Question must be at least 5 characters', variant: 'destructive' })
      return
    }
    setSubmitting(true)
    try {
      const q = await api<Question>(`/api/products/${slug}/questions`, {
        method: 'POST',
        body: JSON.stringify({ question }),
      })
      setQuestions((prev) => [...prev, q])
      setQuestion('')
      toast({ title: 'Question submitted!', description: 'We’ll notify you when it’s answered.' })
    } catch (e: any) {
      toast({ title: e.message || 'Failed', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  const answered = questions.filter((q) => q.answer)
  const pending = questions.filter((q) => !q.answer)

  return (
    <Card className="p-5">
      <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-ink-900">
        <MessageCircleQuestion size={16} className="text-brand-500" />
        Questions &amp; Answers
        {questions.length > 0 && (
          <span className="text-xs font-normal text-ink-400">({questions.length})</span>
        )}
      </h3>

      {/* Ask form */}
      <form onSubmit={submit} className="mb-5">
        <Textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={user ? 'Ask a question about this product...' : 'Sign in to ask a question'}
          rows={2}
          disabled={!user}
          className="resize-none text-sm"
        />
        <div className="mt-2 flex justify-end">
          <Button type="submit" size="sm" disabled={submitting || !user} className="bg-brand-500 hover:bg-brand-600">
            {submitting ? <Loader2 size={14} className="mr-1 animate-spin" /> : <Send size={14} className="mr-1" />}
            {submitting ? 'Submitting...' : 'Ask Question'}
          </Button>
        </div>
      </form>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="animate-pulse space-y-2">
              <div className="h-3 w-3/4 rounded bg-ink-100" />
              <div className="h-2 w-1/2 rounded bg-ink-50" />
            </div>
          ))}
        </div>
      ) : questions.length === 0 ? (
        <div className="py-6 text-center">
          <HelpCircle size={28} className="mx-auto mb-2 text-ink-200" />
          <p className="text-sm text-ink-400">No questions yet. Be the first to ask!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Answered first */}
          {answered.length > 0 && (
            <div className="space-y-3">
              {answered.map((q) => (
                <div key={q.id} className="rounded-lg border border-ink-100 p-3">
                  <div className="flex gap-2">
                    <span className="mt-0.5 text-xs font-bold text-brand-600">Q:</span>
                    <p className="flex-1 text-sm font-medium text-ink-900">{q.question}</p>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <span className="mt-0.5 text-xs font-bold text-emerald-600">A:</span>
                    <div className="flex-1">
                      <p className="text-sm text-ink-700">{q.answer}</p>
                      <p className="mt-1 text-[11px] text-ink-400">
                        Answered {q.answeredAt ? new Date(q.answeredAt).toLocaleDateString() : ''}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {/* Pending questions */}
          {pending.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-400">
                Awaiting answer ({pending.length})
              </p>
              <div className="space-y-2">
                {pending.map((q) => (
                  <div key={q.id} className="flex items-center gap-2 rounded-lg bg-ink-50/60 p-2.5">
                    <HelpCircle size={13} className="shrink-0 text-ink-400" />
                    <p className="flex-1 text-sm text-ink-600">{q.question}</p>
                    <span className="shrink-0 text-[10px] text-ink-400">Pending</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}

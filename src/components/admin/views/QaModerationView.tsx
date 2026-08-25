'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { MessageCircleQuestion, Check, X, Loader2, Inbox, CheckCircle2, Send } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { api } from '@/lib/api'
import { navigate } from '@/lib/router'
import { useToast } from '@/hooks/use-toast'

type Question = {
  id: string
  question: string
  answer: string | null
  createdAt: string
  product: { id: string; title: string; slug: string; images?: { url: string }[] }
  user?: { id: string; fullName: string | null; email: string } | null
}

export function QaModerationView() {
  const { toast } = useToast()
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'pending' | 'answered' | 'all'>('pending')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [answerText, setAnswerText] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setLoading(true)
    api<{ items: Question[] }>(`/api/questions/pending?status=${filter}`)
      .then((r) => setQuestions(r.items))
      .finally(() => setLoading(false))
  }, [filter])

  function startAnswer(q: Question) {
    setEditingId(q.id)
    setAnswerText(q.answer || '')
  }
  function cancelAnswer() {
    setEditingId(null)
    setAnswerText('')
  }
  async function saveAnswer(id: string) {
    if (answerText.trim().length < 2) {
      toast({ title: 'Answer is too short', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      await api(`/api/questions/${id}/answer`, {
        method: 'PATCH',
        body: JSON.stringify({ answer: answerText.trim() }),
      })
      setQuestions((prev) =>
        prev.map((q) => (q.id === id ? { ...q, answer: answerText.trim() } : q))
      )
      toast({ title: 'Answer posted' })
      setEditingId(null)
      setAnswerText('')
    } catch (e: any) {
      toast({ title: e.message || 'Failed', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const tabs: { id: 'pending' | 'answered' | 'all'; label: string; icon: any }[] = [
    { id: 'pending', label: 'Pending', icon: Inbox },
    { id: 'answered', label: 'Answered', icon: CheckCircle2 },
    { id: 'all', label: 'All', icon: MessageCircleQuestion },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-ink-900 sm:text-2xl">Q&amp;A Moderation</h1>
          <p className="text-sm text-ink-400">Answer customer questions about products.</p>
        </div>
        {/* filter tabs */}
        <div className="flex items-center rounded-lg border border-ink-200 bg-ink-50 p-0.5">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setFilter(t.id)}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                filter === t.id ? 'bg-white text-brand-600 shadow-sm' : 'text-ink-500 hover:text-ink-700'
              }`}
            >
              <t.icon size={13} /> {t.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center text-sm text-ink-400">Loading questions...</div>
      ) : questions.length === 0 ? (
        <Card className="p-12 text-center">
          <Inbox size={40} className="mx-auto mb-3 text-ink-200" />
          <p className="text-sm text-ink-400">
            {filter === 'pending' ? 'No pending questions. You’re all caught up!' : `No ${filter} questions.`}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {questions.map((q) => (
            <Card key={q.id} className="p-4">
              <div className="flex gap-3">
                {/* product thumbnail */}
                <Link
                  href={`#/product/${q.product.slug}`}
                  className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-ink-100 bg-ink-50"
                >
                  {q.product.images?.[0]?.url ? (
                    <img src={q.product.images[0].url} alt={q.product.title} className="h-full w-full object-cover" />
                  ) : null}
                </Link>
                <div className="min-w-0 flex-1">
                  {/* product + asker */}
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-ink-400">
                    <Link
                      href={`#/product/${q.product.slug}`}
                      className="font-medium text-brand-600 hover:underline"
                    >
                      {q.product.title}
                    </Link>
                    <span>·</span>
                    <span>by {q.user?.fullName || q.user?.email || 'Anonymous'}</span>
                    <span>·</span>
                    <span>{new Date(q.createdAt).toLocaleDateString()}</span>
                    {q.answer ? (
                      <Badge className="bg-emerald-50 text-emerald-700 text-[10px]">Answered</Badge>
                    ) : (
                      <Badge className="bg-amber-50 text-amber-700 text-[10px]">Pending</Badge>
                    )}
                  </div>
                  {/* question */}
                  <p className="mt-1.5 text-sm font-medium text-ink-900">{q.question}</p>

                  {/* answer (existing) or inline editor */}
                  {editingId === q.id ? (
                    <div className="mt-2 space-y-2">
                      <Textarea
                        value={answerText}
                        onChange={(e) => setAnswerText(e.target.value)}
                        placeholder="Type your answer..."
                        rows={2}
                        className="resize-none text-sm"
                        autoFocus
                      />
                      <div className="flex justify-end gap-1.5">
                        <Button size="sm" variant="ghost" onClick={cancelAnswer} disabled={saving}>
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => saveAnswer(q.id)}
                          disabled={saving}
                          className="bg-brand-500 hover:bg-brand-600"
                        >
                          {saving ? <Loader2 size={14} className="mr-1 animate-spin" /> : <Send size={13} className="mr-1" />}
                          Post Answer
                        </Button>
                      </div>
                    </div>
                  ) : q.answer ? (
                    <div className="mt-2 rounded-lg bg-emerald-50/50 p-2.5">
                      <p className="text-xs text-emerald-700">
                        <span className="font-semibold">A:</span> {q.answer}
                      </p>
                      <button
                        onClick={() => startAnswer(q)}
                        className="mt-1 text-[11px] text-ink-400 hover:text-brand-600"
                      >
                        Edit answer
                      </button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-2 h-7 gap-1 px-2 text-xs"
                      onClick={() => startAnswer(q)}
                    >
                      <MessageCircleQuestion size={12} /> Answer
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

'use client'
import { useState } from 'react'
import { Mail, Phone, MapPin, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import type { ContactFormProps } from '@/lib/blocks/registry'

export function ContactFormBlock({ props }: { props: ContactFormProps }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const { toast } = useToast()

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name || !email || !message) {
      toast({ title: 'Please fill all fields', variant: 'destructive' })
      return
    }
    setSending(true)
    // No backend endpoint for contact — simulate success.
    setTimeout(() => {
      setSending(false)
      setName('')
      setEmail('')
      setMessage('')
      toast({ title: 'Message sent!', description: 'We’ll get back to you soon.' })
    }, 700)
  }

  return (
    <section className="mx-auto max-w-3xl py-6">
      <h2 className="mb-1 text-center text-xl font-bold text-ink-900">{props.title}</h2>
      <p className="mb-6 text-center text-sm text-ink-500">
        Have a question? Reach out and we’ll respond within 24 hours.
      </p>
      <div className="grid gap-6 sm:grid-cols-3">
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-brand-50 text-brand-600">
              <Phone size={16} />
            </div>
            <div>
              <p className="text-xs text-ink-400">Call us</p>
              <p className="text-sm font-medium text-ink-900">16263</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-brand-50 text-brand-600">
              <Mail size={16} />
            </div>
            <div>
              <p className="text-xs text-ink-400">Email</p>
              <p className="text-sm font-medium text-ink-900 break-all">{props.email}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-brand-50 text-brand-600">
              <MapPin size={16} />
            </div>
            <div>
              <p className="text-xs text-ink-400">Visit</p>
              <p className="text-sm font-medium text-ink-900">Gulshan, Dhaka</p>
            </div>
          </div>
        </div>
        <form onSubmit={submit} className="space-y-3 sm:col-span-2">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="cf-name" className="text-xs">Name</Label>
              <Input id="cf-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
            </div>
            <div>
              <Label htmlFor="cf-email" className="text-xs">Email</Label>
              <Input id="cf-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" />
            </div>
          </div>
          <div>
            <Label htmlFor="cf-msg" className="text-xs">Message</Label>
            <Textarea id="cf-msg" value={message} onChange={(e) => setMessage(e.target.value)} rows={4} placeholder="How can we help?" />
          </div>
          <Button type="submit" disabled={sending} className="bg-brand-500 hover:bg-brand-600">
            <Send size={14} className="mr-1" /> {sending ? 'Sending...' : 'Send Message'}
          </Button>
        </form>
      </div>
    </section>
  )
}

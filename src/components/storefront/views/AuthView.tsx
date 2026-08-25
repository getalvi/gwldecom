'use client'
import { useEffect, useState } from 'react'
import { Store, Mail, Lock, User, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useSession } from '@/lib/session-store'
import { navigate } from '@/lib/router'
import { useToast } from '@/hooks/use-toast'

export function AuthView({ mode }: { mode: 'login' | 'register' }) {
  const { login, register, user } = useSession()
  const { toast } = useToast()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user) navigate('/')
  }, [user])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      if (mode === 'login') {
        await login(email, password)
        toast({ title: 'Welcome back!' })
      } else {
        await register(email, password, fullName)
        toast({ title: 'Account created!' })
      }
      navigate('/')
    } catch (e: any) {
      toast({ title: e.message || 'Authentication failed', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  function fillDemo(role: 'admin' | 'customer') {
    if (role === 'admin') {
      setEmail('admin@bdshop.com')
      setPassword('admin123')
    } else {
      setEmail('customer@bdshop.com')
      setPassword('customer123')
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md items-center px-4 py-10">
      <div className="w-full rounded-2xl border border-ink-100 bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-xl bg-brand-500 text-white">
            <Store size={26} />
          </div>
          <h1 className="text-xl font-bold text-ink-900">
            {mode === 'login' ? 'Welcome Back' : 'Create Account'}
          </h1>
          <p className="mt-1 text-sm text-ink-400">
            {mode === 'login' ? 'Sign in to your BDShop account' : 'Join BDShop today'}
          </p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {mode === 'register' ? (
            <div>
              <Label htmlFor="name" className="text-xs">Full Name</Label>
              <div className="relative mt-1">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                <Input
                  id="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your full name"
                  className="pl-9"
                />
              </div>
            </div>
          ) : null}
          <div>
            <Label htmlFor="email" className="text-xs">Email</Label>
            <div className="relative mt-1">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                className="pl-9"
                required
              />
            </div>
          </div>
          <div>
            <Label htmlFor="password" className="text-xs">Password</Label>
            <div className="relative mt-1">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="pl-9"
                required
                minLength={6}
              />
            </div>
          </div>

          <Button type="submit" disabled={loading} className="w-full bg-brand-500 hover:bg-brand-600">
            {loading ? <Loader2 size={16} className="mr-1 animate-spin" /> : null}
            {mode === 'login' ? 'Sign In' : 'Create Account'}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-ink-500">
          {mode === 'login' ? (
            <>Don’t have an account? <button onClick={() => navigate('/register')} className="font-semibold text-brand-600 hover:underline">Register</button></>
          ) : (
            <>Already have an account? <button onClick={() => navigate('/login')} className="font-semibold text-brand-600 hover:underline">Login</button></>
          )}
        </p>

        {mode === 'login' ? (
          <div className="mt-6 rounded-lg bg-ink-50 p-3 text-center">
            <p className="mb-2 text-xs font-medium text-ink-500">Demo accounts (click to fill):</p>
            <div className="flex justify-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => fillDemo('admin')}>
                Admin
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => fillDemo('customer')}>
                Customer
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

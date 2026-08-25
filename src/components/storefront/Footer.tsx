'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Store, Phone, Mail, MapPin, Facebook, Instagram, Youtube, Send, Loader2, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'

export function Footer() {
  const [email, setEmail] = useState('')
  const [subscribing, setSubscribing] = useState(false)
  const [subscribed, setSubscribed] = useState(false)
  const { toast } = useToast()

  function subscribe(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !email.includes('@')) {
      toast({ title: 'Enter a valid email', variant: 'destructive' })
      return
    }
    setSubscribing(true)
    // simulate — no backend endpoint for newsletter in this demo
    setTimeout(() => {
      setSubscribing(false)
      setSubscribed(true)
      setEmail('')
      toast({ title: 'Subscribed!', description: 'You’ll receive our best deals by email.' })
    }, 600)
  }

  return (
    <footer className="mt-16 border-t border-ink-100 bg-ink-50">
      {/* Newsletter strip */}
      <div className="border-b border-ink-100 bg-gradient-to-r from-brand-500 to-brand-700">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-4 py-7 text-center sm:flex-row sm:text-left md:py-8">
          <div className="flex-1">
            <h3 className="text-lg font-bold text-white sm:text-xl">Get exclusive deals in your inbox</h3>
            <p className="mt-1 text-sm text-white/85">
              Subscribe for new arrivals, flash sales, and member-only coupons.
            </p>
          </div>
          {subscribed ? (
            <div className="flex items-center gap-2 rounded-lg bg-white/15 px-4 py-3 text-white">
              <CheckCircle2 size={18} />
              <span className="text-sm font-medium">You’re subscribed!</span>
            </div>
          ) : (
            <form onSubmit={subscribe} className="flex w-full max-w-md gap-2">
              <div className="relative flex-1">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  className="border-0 bg-white pl-9 text-sm shadow-sm"
                />
              </div>
              <Button
                type="submit"
                disabled={subscribing}
                className="bg-ink-900 text-white shadow-sm hover:bg-ink-800"
              >
                {subscribing ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} className="mr-1" />}
                {subscribing ? '' : 'Subscribe'}
              </Button>
            </form>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4 lg:grid-cols-5">
          <div className="col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-brand-500 text-white">
                <Store size={20} />
              </div>
              <span className="text-lg font-extrabold text-ink-900">
                BD<span className="text-brand-500">Shop</span>
              </span>
            </div>
            <p className="mt-3 text-sm text-ink-500">
              Bangladesh’s trusted online marketplace. Genuine products, fast
              delivery, and cash on delivery across all 64 districts.
            </p>
            <div className="mt-4 flex gap-2">
              <a href="#" className="grid h-8 w-8 place-items-center rounded-full bg-white text-ink-500 hover:text-brand-600 hover:shadow-sm" aria-label="Facebook">
                <Facebook size={16} />
              </a>
              <a href="#" className="grid h-8 w-8 place-items-center rounded-full bg-white text-ink-500 hover:text-brand-600 hover:shadow-sm" aria-label="Instagram">
                <Instagram size={16} />
              </a>
              <a href="#" className="grid h-8 w-8 place-items-center rounded-full bg-white text-ink-500 hover:text-brand-600 hover:shadow-sm" aria-label="YouTube">
                <Youtube size={16} />
              </a>
            </div>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-semibold text-ink-900">Shop</h4>
            <ul className="space-y-2 text-sm text-ink-500">
              <li><Link href="#/category/electronics" className="hover:text-brand-600">Electronics</Link></li>
              <li><Link href="#/category/fashion" className="hover:text-brand-600">Fashion</Link></li>
              <li><Link href="#/category/home-kitchen" className="hover:text-brand-600">Home & Kitchen</Link></li>
              <li><Link href="#/category/beauty" className="hover:text-brand-600">Beauty</Link></li>
              <li><Link href="#/deals" className="hover:text-brand-600">Today’s Deals</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-semibold text-ink-900">Help</h4>
            <ul className="space-y-2 text-sm text-ink-500">
              <li><Link href="#/about-us" className="hover:text-brand-600">About Us</Link></li>
              <li><a href="#" className="hover:text-brand-600">Track Order</a></li>
              <li><a href="#" className="hover:text-brand-600">Returns & Refunds</a></li>
              <li><a href="#" className="hover:text-brand-600">Shipping Policy</a></li>
              <li><a href="#" className="hover:text-brand-600">FAQ</a></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-semibold text-ink-900">Account</h4>
            <ul className="space-y-2 text-sm text-ink-500">
              <li><Link href="#/login" className="hover:text-brand-600">Login</Link></li>
              <li><Link href="#/register" className="hover:text-brand-600">Register</Link></li>
              <li><Link href="#/account/orders" className="hover:text-brand-600">My Orders</Link></li>
              <li><Link href="#/account/wishlist" className="hover:text-brand-600">Wishlist</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-semibold text-ink-900">Contact</h4>
            <ul className="space-y-2 text-sm text-ink-500">
              <li className="flex items-center gap-2"><Phone size={14} /> 16263</li>
              <li className="flex items-center gap-2"><Mail size={14} /> support@bdshop.com</li>
              <li className="flex items-center gap-2"><MapPin size={14} /> Gulshan, Dhaka 1212</li>
            </ul>
            <div className="mt-4 flex flex-wrap gap-1">
              {['bKash', 'Nagad', 'Rocket', 'VISA', 'Mastercard', 'COD'].map((m) => (
                <span key={m} className="rounded bg-white px-2 py-1 text-[10px] font-semibold text-ink-500 shadow-sm">
                  {m}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-2 border-t border-ink-200 pt-6 text-xs text-ink-400 sm:flex-row">
          <p>© {new Date().getFullYear()} BDShop. All rights reserved.</p>
          <p className="flex items-center gap-3">
            <a href="#" className="hover:text-brand-600">Privacy Policy</a>
            <a href="#" className="hover:text-brand-600">Terms of Service</a>
          </p>
        </div>
      </div>
    </footer>
  )
}

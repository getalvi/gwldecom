"use client"
import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Mail, Lock, User, Phone, Eye, EyeOff } from "lucide-react"
import { toast } from "sonner"

export default function RegisterPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [show, setShow] = useState(false)
  const [form, setForm] = useState({ fullName: "", email: "", phone: "", password: "" })
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true)
    try {
      const res = await fetch("/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || "Registration failed"); setLoading(false); return }
      const r = await signIn("credentials", { email: form.email, password: form.password, redirect: false })
      setLoading(false)
      if (r?.error) { toast.error("Account created — please sign in"); router.push("/login") }
      else { toast.success("Welcome to ShopHaat!"); router.push("/"); router.refresh() }
    } catch { toast.error("Network error"); setLoading(false) }
  }
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-10">
      <Card className="border-2 shadow-sm">
        <CardHeader className="text-center">
          <Link href="/" className="mx-auto mb-2 flex items-center gap-2"><span className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-lg font-extrabold text-primary-foreground">S</span><span className="text-2xl font-extrabold">Shop<span className="text-primary">Haat</span></span></Link>
          <CardTitle className="text-xl">Create your account</CardTitle><CardDescription>Join ShopHaat for faster checkout &amp; order tracking</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2"><Label htmlFor="fullName">Full Name</Label><div className="relative"><User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input id="fullName" required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} placeholder="Your name" className="pl-9" /></div></div>
            <div className="space-y-2"><Label htmlFor="email">Email</Label><div className="relative"><Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input id="email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" className="pl-9" /></div></div>
            <div className="space-y-2"><Label htmlFor="phone">Phone (optional)</Label><div className="relative"><Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+8801XXXXXXXXX" className="pl-9" /></div></div>
            <div className="space-y-2"><Label htmlFor="password">Password</Label><div className="relative"><Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input id="password" type={show ? "text" : "password"} required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Min 6 characters" className="pl-9 pr-9" /><button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label="Toggle password">{show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></div>
            <Button type="submit" className="w-full" disabled={loading}>{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Create Account</Button>
          </form>
        </CardContent>
        <CardFooter className="justify-center text-sm text-muted-foreground">Already have an account? <Link href="/login" className="ml-1 font-medium text-primary hover:underline">Sign in</Link></CardFooter>
      </Card>
    </div>
  )
}

"use client"
import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Mail, Lock, Eye, EyeOff } from "lucide-react"
import { toast } from "sonner"

export default function LoginPage() {
  const router = useRouter()
  const params = useSearchParams()
  const error = params.get("error")
  const callbackUrl = params.get("callbackUrl") || "/"
  const [loading, setLoading] = useState(false)
  const [show, setShow] = useState(false)
  const [form, setForm] = useState({ email: "", password: "" })
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true)
    const res = await signIn("credentials", { ...form, redirect: false })
    setLoading(false)
    if (res?.error) toast.error("Invalid email or password")
    else { toast.success("Welcome back!"); router.push(callbackUrl); router.refresh() }
  }
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-10">
      <Card className="border-2 shadow-sm">
        <CardHeader className="text-center">
          <Link href="/" className="mx-auto mb-2 flex items-center gap-2"><span className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-lg font-extrabold text-primary-foreground">S</span><span className="text-2xl font-extrabold">Shop<span className="text-primary">Haat</span></span></Link>
          <CardTitle className="text-xl">Welcome back</CardTitle><CardDescription>Sign in to continue shopping</CardDescription>
        </CardHeader>
        <CardContent>
          {error === "AccessDenied" && <Alert variant="destructive" className="mb-4"><AlertDescription>Access denied. Admin/staff accounts only for that area.</AlertDescription></Alert>}
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2"><Label htmlFor="email">Email</Label><div className="relative"><Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input id="email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" className="pl-9" /></div></div>
            <div className="space-y-2"><div className="flex items-center justify-between"><Label htmlFor="password">Password</Label></div><div className="relative"><Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input id="password" type={show ? "text" : "password"} required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••" className="pl-9 pr-9" /><button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label="Toggle password">{show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></div>
            <Button type="submit" className="w-full" disabled={loading}>{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Sign In</Button>
          </form>
          <div className="mt-4 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground"><p className="font-semibold text-foreground">Demo accounts</p><p>Admin: admin@shophaat.com / admin123</p><p>Customer: customer@shophaat.com / customer123</p></div>
        </CardContent>
        <CardFooter className="justify-center text-sm text-muted-foreground">Don&apos;t have an account? <Link href="/register" className="ml-1 font-medium text-primary hover:underline">Sign up</Link></CardFooter>
      </Card>
    </div>
  )
}

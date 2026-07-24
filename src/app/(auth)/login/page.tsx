"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  return <Suspense fallback={null}><LoginForm /></Suspense>;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) { setError(error.message); return; }
    router.push(searchParams.get("redirect") || "/");
    router.refresh();
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: fullName }, emailRedirectTo: `${window.location.origin}/api/auth/callback` },
    });
    setLoading(false);
    if (error) { setError(error.message); return; }
    setSuccess("Account created! Check your email to confirm.");
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-secondary/20 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="text-3xl font-extrabold"><span className="text-primary">Shop</span>BD</Link>
          <p className="text-sm text-muted-foreground mt-1">Bangladesh&apos;s trusted marketplace</p>
        </div>

        <div className="rounded-xl border border-border bg-background p-6 shadow-sm">
          {/* Tabs */}
          <div className="flex rounded-lg bg-secondary p-1 mb-6">
            <button onClick={() => setTab("login")} className={`flex-1 rounded-md py-2 text-sm font-medium transition-all ${tab === "login" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
              Sign In
            </button>
            <button onClick={() => setTab("signup")} className={`flex-1 rounded-md py-2 text-sm font-medium transition-all ${tab === "signup" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
              Create Account
            </button>
          </div>

          {success ? (
            <div className="rounded-lg bg-success/10 border border-success/20 p-4 text-sm text-success text-center">{success}</div>
          ) : (
            <form onSubmit={tab === "login" ? handleLogin : handleSignup} className="space-y-4">
              {tab === "signup" && (
                <Input label="Full Name" type="text" value={fullName} onChange={e => setFullName(e.target.value)} required placeholder="Your full name" />
              )}
              <Input label="Email Address" type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@example.com" />
              <Input label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder={tab === "signup" ? "At least 6 characters" : "Your password"} minLength={tab === "signup" ? 6 : undefined} />
              {error && <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">{error}</div>}
              <Button type="submit" className="w-full" size="lg" loading={loading}>
                {tab === "login" ? "Sign In" : "Create Account"}
              </Button>
            </form>
          )}
        </div>
        <p className="text-center text-xs text-muted-foreground mt-4">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </main>
  );
}

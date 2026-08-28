"use client"
import { SessionProvider } from "next-auth/react"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import { ReactNode } from "react"
export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <NextThemesProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange={false}>
        {children}
      </NextThemesProvider>
    </SessionProvider>
  )
}

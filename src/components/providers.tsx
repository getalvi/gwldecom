'use client'

import { ThemeProvider } from 'next-themes'
import { ReactNode, useEffect } from 'react'
import { useSession } from '@/lib/session-store'

export function Providers({ children }: { children: ReactNode }) {
  const fetch = useSession((s) => s.fetch)
  useEffect(() => {
    fetch()
  }, [fetch])
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      disableTransitionOnChange
    >
      {children}
    </ThemeProvider>
  )
}

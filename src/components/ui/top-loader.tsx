"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname, useSearchParams } from "next/navigation"

/**
 * A thin progress bar fixed to the very top of the viewport that appears
 * the instant the user clicks any internal link or triggers a
 * `router.push`/`router.replace`, and fills in until the destination route
 * has actually rendered. This exists because Next.js App Router pages can
 * take a moment to fetch/render server-side, and with no visual feedback
 * that delay reads as "the site is broken" rather than "the site is
 * loading" — this makes the wait feel intentional.
 *
 * Mounted once in the root layout, so it covers every route including
 * /admin/*. No extra dependency: link clicks are caught with a capturing
 * document click listener, and router.push/replace calls (used e.g. after
 * saving a product) are caught by patching history.pushState/replaceState,
 * the same technique libraries like nprogress-router use under the hood.
 */
export function TopLoader() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [progress, setProgress] = useState(0)
  const [visible, setVisible] = useState(false)
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const hideRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const startedAtRef = useRef(0)

  function start() {
    if (tickRef.current) return // already in progress, don't restart
    if (hideRef.current) {
      clearTimeout(hideRef.current)
      hideRef.current = null
    }
    startedAtRef.current = Date.now()
    setVisible(true)
    setProgress(8)
    // Eases toward 90% and holds — the real completion happens in the
    // effect below once the destination route has actually rendered, so
    // the bar never lies about being "done" while still loading.
    tickRef.current = setInterval(() => {
      setProgress((p) => (p >= 90 ? p : p + Math.max(0.5, (90 - p) / 12)))
    }, 120)
  }

  function finish() {
    if (tickRef.current) {
      clearInterval(tickRef.current)
      tickRef.current = null
    }
    // Guarantees the bar is visible for a minimum stretch so a very fast
    // navigation still reads as "something happened" instead of a flicker.
    const elapsed = Date.now() - startedAtRef.current
    const remaining = Math.max(0, 250 - elapsed)
    window.setTimeout(() => {
      setProgress(100)
      hideRef.current = setTimeout(() => {
        setVisible(false)
        setProgress(0)
      }, 200)
    }, remaining)
  }

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const anchor = (e.target as HTMLElement | null)?.closest?.("a[href]") as HTMLAnchorElement | null
      if (!anchor || (anchor.target && anchor.target !== "_self") || anchor.hasAttribute("download")) return
      const href = anchor.getAttribute("href") || ""
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return
      let url: URL
      try {
        url = new URL(href, window.location.href)
      } catch {
        return
      }
      if (url.origin !== window.location.origin) return
      const isSamePage = url.pathname + url.search === window.location.pathname + window.location.search
      if (isSamePage) return
      start()
    }
    document.addEventListener("click", onClick, true)
    return () => document.removeEventListener("click", onClick, true)
  }, [])

  // Patch history methods once globally so router.push()/router.replace()
  // (e.g. after the admin product form saves) also trigger the bar, not
  // just <Link> clicks.
  useEffect(() => {
    const w = window as typeof window & { __topLoaderPatched?: boolean }
    if (w.__topLoaderPatched) return
    w.__topLoaderPatched = true
    const originalPush = window.history.pushState.bind(window.history)
    const originalReplace = window.history.replaceState.bind(window.history)
    window.history.pushState = (...args) => {
      window.dispatchEvent(new Event("toploader:start"))
      return originalPush(...args)
    }
    window.history.replaceState = (...args) => {
      window.dispatchEvent(new Event("toploader:start"))
      return originalReplace(...args)
    }
  }, [])

  useEffect(() => {
    window.addEventListener("toploader:start", start)
    return () => window.removeEventListener("toploader:start", start)
  }, [])

  // The route actually finished changing — pathname/searchParams only
  // update once the new page has rendered, so this is the true "done".
  useEffect(() => {
    if (visible) finish()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams])

  useEffect(() => {
    return () => {
      if (tickRef.current) clearInterval(tickRef.current)
      if (hideRef.current) clearTimeout(hideRef.current)
    }
  }, [])

  if (!visible) return null

  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[3px] bg-transparent">
      <div
        className="h-full bg-primary shadow-[0_0_8px_var(--primary)] transition-[width,opacity] duration-200 ease-out"
        style={{ width: `${progress}%`, opacity: progress >= 100 ? 0 : 1 }}
      />
    </div>
  )
}

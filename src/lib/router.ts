// Lightweight hash-based router so the entire storefront + admin lives behind
// the single `/` route required by this sandbox. Supports params and query.
'use client'

import { useSyncExternalStore } from 'react'

export interface RouteMatch {
  // e.g. ["product", "some-slug"]
  segments: string[]
  // query string parsed
  query: Record<string, string>
  // raw hash without leading #
  raw: string
}

function getHash(): string {
  if (typeof window === 'undefined') return ''
  return window.location.hash.replace(/^#\/?/, '')
}

function parseRoute(hash: string): RouteMatch {
  const [path, qs] = hash.split('?')
  const segments = path.split('/').filter(Boolean)
  const query: Record<string, string> = {}
  if (qs) {
    for (const pair of qs.split('&')) {
      const [k, v] = pair.split('=')
      if (k) query[decodeURIComponent(k)] = decodeURIComponent(v || '')
    }
  }
  return { segments, query, raw: hash }
}

const subscribers = new Set<() => void>()
let currentHash = ''

function notify() {
  currentHash = getHash()
  for (const cb of subscribers) cb()
}

if (typeof window !== 'undefined') {
  currentHash = getHash()
  window.addEventListener('hashchange', notify)
}

function subscribe(cb: () => void) {
  subscribers.add(cb)
  return () => subscribers.delete(cb)
}

function getSnapshot() {
  return currentHash
}

export function navigate(path: string) {
  if (typeof window === 'undefined') return
  const target = path.startsWith('#') ? path : '#' + (path.startsWith('/') ? path : '/' + path)
  if (window.location.hash === target) {
    notify()
  } else {
    window.location.hash = target
  }
  window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
}

export function useRoute(): RouteMatch {
  // useSyncExternalStore keeps it SSR-safe + concurrent-safe
  const hash = useSyncExternalStore(
    subscribe,
    getSnapshot,
    () => ''
  )
  return parseRoute(hash)
}

/** Helper to build a link href that works with the hash router */
export function href(path: string): string {
  return path.startsWith('#') ? path : '#' + (path.startsWith('/') ? path : '/' + path)
}



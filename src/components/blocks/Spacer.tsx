'use client'
import type { SpacerProps } from '@/lib/blocks/registry'

export function SpacerBlock({ props }: { props: SpacerProps }) {
  return <div style={{ height: props.height || 32 }} aria-hidden />
}

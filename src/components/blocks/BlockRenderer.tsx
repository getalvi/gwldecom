'use client'
import { ensureBlocksRegistered } from '@/lib/blocks/register'
import { getBlock } from '@/lib/blocks/registry'
import type { BlockT } from '@/lib/types'

ensureBlocksRegistered()

export function BlockRenderer({ blocks }: { blocks: BlockT[] | null | undefined }) {
  if (!blocks || !blocks.length) {
    return (
      <div className="py-12 text-center text-sm text-ink-400">
        This page has no content yet.
      </div>
    )
  }
  return (
    <div className="space-y-2">
      {blocks.map((block) => {
        const def = getBlock(block.type)
        if (!def) {
          return (
            <div
              key={block.id}
              className="rounded-md border border-dashed border-red-200 bg-red-50 p-3 text-xs text-red-600"
            >
              Unknown block type: <code>{block.type}</code>
            </div>
          )
        }
        const Comp = def.component
        return <Comp key={block.id} props={block.props || {}} />
      })}
    </div>
  )
}

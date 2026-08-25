// Re-export so consumers don't import from register.ts (which has side effects).
export { ensureBlocksRegistered } from '@/lib/blocks/register'
export { getBlock } from '@/lib/blocks/registry'

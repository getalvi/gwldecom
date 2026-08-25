'use client'

// Ensure every block type is registered so listBlocks() returns the full set.
import { ensureBlocksRegistered } from '@/lib/blocks/register'
ensureBlocksRegistered()

import { useEffect, useState } from 'react'
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  arrayMove,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  ArrowLeft,
  GripVertical,
  Plus,
  Pencil,
  Trash2,
  Save,
  Loader2,
  Eye,
  X,
} from 'lucide-react'
import * as LucideIcons from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { BlockRenderer } from '@/components/blocks/BlockRenderer'
import { listBlocks, getBlock, type BlockDefinition } from '@/lib/blocks/registry'
import { api } from '@/lib/api'
import { navigate } from '@/lib/router'
import { useToast } from '@/hooks/use-toast'
import type { BlockT, PageT, PageStatus } from '@/lib/types'

type AnyIcon = LucideIcons.LucideIcon

function uid() {
  return Math.random().toString(36).slice(2, 10)
}

export function PageBuilderView({ slug }: { slug: string }) {
  const { toast } = useToast()
  const [page, setPage] = useState<PageT | null>(null)
  const [blocks, setBlocks] = useState<BlockT[]>([])
  const [title, setTitle] = useState('')
  const [status, setStatus] = useState<PageStatus>('draft')
  const [seoTitle, setSeoTitle] = useState('')
  const [seoDescription, setSeoDescription] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [editing, setEditing] = useState<BlockT | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  useEffect(() => {
    setLoading(true)
    api<PageT>(`/api/pages/${slug}?status=all`)
      .then((p) => {
        setPage(p)
        setBlocks((p.blocks as BlockT[]) || [])
        setTitle(p.title)
        setStatus(p.status)
        setSeoTitle(p.seoTitle || '')
        setSeoDescription(p.seoDescription || '')
      })
      .catch((e: any) => {
        toast({ title: e.message || 'Failed to load page', variant: 'destructive' })
      })
      .finally(() => setLoading(false))
  }, [slug, toast])

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (!over || active.id === over.id) return
    setBlocks((prev) => {
      const oldIdx = prev.findIndex((b) => b.id === active.id)
      const newIdx = prev.findIndex((b) => b.id === over.id)
      if (oldIdx === -1 || newIdx === -1) return prev
      return arrayMove(prev, oldIdx, newIdx)
    })
  }

  function addBlock(type: string) {
    const def = getBlock(type)
    if (!def) return
    const block: BlockT = {
      id: uid(),
      type,
      props: structuredClone(def.defaultProps) as Record<string, unknown>,
    }
    setBlocks((prev) => [...prev, block])
    setPickerOpen(false)
    toast({ title: `Added "${def.label}" block` })
  }

  function updateBlockProps(id: string, props: Record<string, unknown>) {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, props } : b)))
  }

  function removeBlock(id: string) {
    setBlocks((prev) => prev.filter((b) => b.id !== id))
    if (editing?.id === id) setEditing(null)
  }

  async function save() {
    if (!title) {
      toast({ title: 'Title is required', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      await api(`/api/pages/${slug}`, {
        method: 'PUT',
        body: JSON.stringify({
          title,
          status,
          blocks,
          seoTitle: seoTitle || null,
          seoDescription: seoDescription || null,
        }),
      })
      toast({ title: 'Page saved' })
    } catch (e: any) {
      toast({ title: e.message || 'Failed', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="py-12 text-center text-sm text-ink-400">Loading page...</div>
  }
  if (!page) {
    return <div className="py-12 text-center text-sm text-ink-400">Page not found.</div>
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/pages')}>
          <ArrowLeft size={18} />
        </Button>
        <h1 className="text-lg font-bold text-ink-900 sm:text-xl">Page Builder</h1>
        <code className="rounded bg-ink-50 px-1.5 py-0.5 text-xs text-ink-500">/{slug}</code>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate('/admin/pages')}>
            Back to pages
          </Button>
          <Button className="bg-brand-500 hover:bg-brand-600" size="sm" disabled={saving} onClick={save}>
            {saving ? <Loader2 size={14} className="mr-1 animate-spin" /> : <Save size={14} className="mr-1" />}
            Save
          </Button>
        </div>
      </div>

      {/* Settings */}
      <Card className="space-y-3 p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label className="text-xs">Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Status</Label>
            <Select value={status} onValueChange={(v: PageStatus) => setStatus(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label className="text-xs">SEO Title</Label>
            <Input value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} placeholder="Optional" />
          </div>
          <div>
            <Label className="text-xs">SEO Description</Label>
            <Input value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} placeholder="Optional" />
          </div>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Block editor */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink-900">Blocks ({blocks.length})</h2>
            <Button size="sm" className="bg-brand-500 hover:bg-brand-600" onClick={() => setPickerOpen(true)}>
              <Plus size={14} className="mr-1" /> Add Block
            </Button>
          </div>

          {blocks.length === 0 ? (
            <Card className="flex flex-col items-center justify-center gap-2 py-12 text-center">
              <Plus size={28} className="text-ink-300" />
              <p className="text-sm text-ink-400">No blocks yet. Add your first block.</p>
              <Button size="sm" variant="outline" onClick={() => setPickerOpen(true)}>
                Choose a block
              </Button>
            </Card>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={onDragEnd}
            >
              <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {blocks.map((b) => (
                    <SortableBlock
                      key={b.id}
                      block={b}
                      onEdit={() => setEditing(b)}
                      onDelete={() => removeBlock(b.id)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>

        {/* Live preview */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Eye size={16} className="text-ink-400" />
            <h2 className="text-sm font-semibold text-ink-900">Live Preview</h2>
          </div>
          <Card className="overflow-hidden p-2">
            <div className="rounded-md border border-ink-100 bg-white p-3">
              <BlockRenderer blocks={blocks} />
            </div>
          </Card>
        </div>
      </div>

      {/* Block picker */}
      <BlockPicker open={pickerOpen} onOpenChange={setPickerOpen} onPick={addBlock} />

      {/* Block prop editor */}
      <BlockEditorDialog
        block={editing}
        onClose={() => setEditing(null)}
        onChange={(props) => editing && updateBlockProps(editing.id, props)}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sortable block row
// ---------------------------------------------------------------------------
function SortableBlock({
  block,
  onEdit,
  onDelete,
}: {
  block: BlockT
  onEdit: () => void
  onDelete: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
  })
  const def = getBlock(block.type)
  const Icon: AnyIcon = def
    ? ((LucideIcons as Record<string, LucideIcons.LucideIcon>)[def.icon] || LucideIcons.Square)
    : LucideIcons.Square

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 rounded-lg border border-ink-100 bg-white p-2 shadow-sm hover:border-brand-200"
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none text-ink-300 hover:text-ink-500 active:cursor-grabbing"
        aria-label="Drag to reorder"
      >
        <GripVertical size={16} />
      </button>
      <div className="grid h-8 w-8 place-items-center rounded bg-brand-50 text-brand-600">
        <Icon size={15} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-1 text-sm font-medium text-ink-900">{def?.label || block.type}</p>
        <p className="text-xs text-ink-400">{block.type}</p>
      </div>
      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit} title="Edit props">
        <Pencil size={13} />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-red-500 hover:text-red-600"
        onClick={onDelete}
        title="Delete block"
      >
        <Trash2 size={13} />
      </Button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Block picker dialog
// ---------------------------------------------------------------------------
function BlockPicker({
  open,
  onOpenChange,
  onPick,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onPick: (type: string) => void
}) {
  const blocks = listBlocks()
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add a block</DialogTitle>
        </DialogHeader>
        <div className="grid max-h-[60vh] gap-2 overflow-y-auto sm:grid-cols-2">
          {blocks.map((b: BlockDefinition<any>) => {
            const Icon: AnyIcon =
              (LucideIcons as Record<string, LucideIcons.LucideIcon>)[b.icon] || LucideIcons.Square
            return (
              <button
                key={b.type}
                onClick={() => onPick(b.type)}
                className="flex items-start gap-3 rounded-lg border border-ink-100 p-3 text-left transition hover:border-brand-300 hover:bg-brand-50/30"
              >
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded bg-brand-50 text-brand-600">
                  <Icon size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink-900">{b.label}</p>
                  <p className="line-clamp-2 text-xs text-ink-400">{b.description}</p>
                </div>
              </button>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Generic block prop editor dialog
// ---------------------------------------------------------------------------
const MARKDOWN_KEYS = new Set(['content', 'body'])
const STRING_INPUT_KEYS = new Set([
  'title',
  'subtitle',
  'ctaText',
  'ctaHref',
  'email',
  'code',
  'html',
  'tag',
  'category',
  'name',
  'role',
  'text',
  'q',
  'a',
])
const NUMBER_KEYS = new Set(['hue', 'height', 'limit'])
const BOOL_KEYS = new Set(['autoplay'])

function BlockEditorDialog({
  block,
  onClose,
  onChange,
}: {
  block: BlockT | null
  onClose: () => void
  onChange: (props: Record<string, unknown>) => void
}) {
  const def = block ? getBlock(block.type) : null
  const [draft, setDraft] = useState<Record<string, unknown>>({})

  useEffect(() => {
    if (block) {
      // Sync external block prop into local editable draft. This is the canonical
      // "adjust state when prop changes" pattern; the rule's warning is benign here.
       
      setDraft(structuredClone(block.props || {}))
    }
  }, [block])

  if (!block || !def) return null

  function setField(key: string, value: unknown) {
    setDraft((prev) => ({ ...prev, [key]: value }))
  }

  function commit() {
    onChange(draft)
    onClose()
  }

  const keys = Object.keys(def.defaultProps || {})
  const Icon: AnyIcon =
    (LucideIcons as Record<string, LucideIcons.LucideIcon>)[def.icon] || LucideIcons.Square

  return (
    <Dialog open={!!block} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon size={18} className="text-brand-600" />
            Edit: {def.label}
          </DialogTitle>
        </DialogHeader>

        <div className="max-h-[60vh] space-y-3 overflow-y-auto">
          {keys.length === 0 ? (
            <p className="py-4 text-center text-sm text-ink-400">This block has no editable props.</p>
          ) : (
            keys.map((key) => {
              const value = draft[key]
              // Arrays of objects → repeatable editor (faq / testimonials)
              if (Array.isArray(value)) {
                return (
                  <RepeatableEditor
                    key={key}
                    fieldKey={key}
                    items={value as Array<Record<string, unknown>>}
                    onChange={(items) => setField(key, items)}
                  />
                )
              }
              if (typeof value === 'boolean' || BOOL_KEYS.has(key)) {
                return (
                  <div key={key} className="flex items-center justify-between rounded-lg border border-ink-100 p-3">
                    <Label className="text-xs capitalize">{key}</Label>
                    <Switch
                      checked={!!value}
                      onCheckedChange={(v) => setField(key, v)}
                    />
                  </div>
                )
              }
              if (typeof value === 'number' || NUMBER_KEYS.has(key)) {
                return (
                  <div key={key}>
                    <Label className="text-xs capitalize">{key}</Label>
                    <Input
                      type="number"
                      value={typeof value === 'number' ? value : 0}
                      onChange={(e) => setField(key, Number(e.target.value))}
                    />
                  </div>
                )
              }
              // strings
              if (MARKDOWN_KEYS.has(key)) {
                return (
                  <div key={key}>
                    <Label className="text-xs capitalize">{key} (markdown)</Label>
                    <Textarea
                      value={String(value ?? '')}
                      onChange={(e) => setField(key, e.target.value)}
                      rows={6}
                    />
                  </div>
                )
              }
              if (key === 'html') {
                return (
                  <div key={key}>
                    <Label className="text-xs capitalize">{key}</Label>
                    <Textarea
                      value={String(value ?? '')}
                      onChange={(e) => setField(key, e.target.value)}
                      rows={6}
                      className="font-mono text-xs"
                    />
                  </div>
                )
              }
              if (STRING_INPUT_KEYS.has(key) || typeof value === 'string') {
                return (
                  <div key={key}>
                    <Label className="text-xs capitalize">{key}</Label>
                    <Input
                      value={String(value ?? '')}
                      onChange={(e) => setField(key, e.target.value)}
                    />
                  </div>
                )
              }
              // fallback for unknown types
              return (
                <div key={key}>
                  <Label className="text-xs capitalize">{key}</Label>
                  <Textarea
                    value={JSON.stringify(value, null, 2)}
                    onChange={(e) => {
                      try {
                        setField(key, JSON.parse(e.target.value))
                      } catch {
                        // ignore
                      }
                    }}
                    rows={4}
                    className="font-mono text-xs"
                  />
                </div>
              )
            })
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button className="bg-brand-500 hover:bg-brand-600" onClick={commit}>Apply</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Repeatable editor (faq items, testimonials items)
// ---------------------------------------------------------------------------
function RepeatableEditor({
  fieldKey,
  items,
  onChange,
}: {
  fieldKey: string
  items: Array<Record<string, unknown>>
  onChange: (items: Array<Record<string, unknown>>) => void
}) {
  const subKeys = items[0] ? Object.keys(items[0]) : ['q', 'a']

  function update(idx: number, key: string, val: unknown) {
    const next = items.map((it, i) => (i === idx ? { ...it, [key]: val } : it))
    onChange(next)
  }
  function remove(idx: number) {
    onChange(items.filter((_, i) => i !== idx))
  }
  function add() {
    const blank: Record<string, unknown> = {}
    subKeys.forEach((k) => (blank[k] = ''))
    onChange([...items, blank])
  }

  return (
    <div className="space-y-2 rounded-lg border border-ink-100 p-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs capitalize">{fieldKey} ({items.length})</Label>
        <Button size="sm" variant="outline" onClick={add}>
          <Plus size={12} className="mr-1" /> Add
        </Button>
      </div>
      <div className="space-y-2">
        {items.length === 0 ? (
          <p className="text-xs text-ink-400">No items.</p>
        ) : (
          items.map((item, idx) => (
            <div key={idx} className="space-y-2 rounded-lg border border-ink-100 bg-ink-50/40 p-2">
              <div className="flex items-center justify-between">
                <Badge className="bg-ink-100 text-ink-600">#{idx + 1}</Badge>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 text-red-500"
                  onClick={() => remove(idx)}
                >
                  <X size={12} />
                </Button>
              </div>
              {Object.keys(item).map((k) => {
                const v = item[k]
                if (typeof v === 'string' && v.length > 50) {
                  return (
                    <div key={k}>
                      <Label className="text-[10px] uppercase text-ink-400">{k}</Label>
                      <Textarea
                        value={v}
                        onChange={(e) => update(idx, k, e.target.value)}
                        rows={3}
                        className="bg-white text-sm"
                      />
                    </div>
                  )
                }
                return (
                  <div key={k}>
                    <Label className="text-[10px] uppercase text-ink-400">{k}</Label>
                    <Input
                      value={String(v ?? '')}
                      onChange={(e) => update(idx, k, e.target.value)}
                      className="bg-white text-sm"
                    />
                  </div>
                )
              })}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

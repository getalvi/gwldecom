"use client";

import { useState } from "react";
import { Settings2, ChevronDown, ChevronUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { ImportConfig } from "@/lib/importer/interfaces";

interface Props {
  config: ImportConfig;
  onChange: (c: ImportConfig) => void;
}

export function ConfigPanel({ config, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const set = <K extends keyof ImportConfig>(k: K, v: ImportConfig[K]) => onChange({ ...config, [k]: v });

  return (
    <div className="rounded-xl border border-border bg-background overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium hover:bg-secondary/50 transition-colors"
      >
        <span className="flex items-center gap-2"><Settings2 size={15} /> Import Configuration</span>
        {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
      </button>

      {open && (
        <div className="px-4 pb-4 border-t border-border grid gap-4 sm:grid-cols-2 pt-4">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Price Rules</p>
            <div className="space-y-2">
              <Input label="Markup %" type="number" placeholder="0" value={config.markupPercent ?? ""} onChange={e => set("markupPercent", e.target.value ? Number(e.target.value) : undefined)} />
              <Input label="Fixed Increase (৳)" type="number" placeholder="0" value={config.fixedIncrease ?? ""} onChange={e => set("fixedIncrease", e.target.value ? Number(e.target.value) : undefined)} />
              <Input label="Minimum Price (৳)" type="number" placeholder="0" value={config.minimumPrice ?? ""} onChange={e => set("minimumPrice", e.target.value ? Number(e.target.value) : undefined)} />
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={!!config.autoRound} onChange={e => set("autoRound", e.target.checked)} className="rounded" />
                Auto-round price (nearest ৳5)
              </label>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">AI Options</p>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={!!config.aiRewrite} onChange={e => set("aiRewrite", e.target.checked)} className="rounded" />
                AI SEO Rewrite (title + description)
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={!!config.aiTranslate} onChange={e => set("aiTranslate", e.target.checked)} className="rounded" />
                AI Translate
              </label>
              {config.aiTranslate && (
                <select value={config.translateTo ?? "English"} onChange={e => set("translateTo", e.target.value)}
                  className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm">
                  {["English", "Bangla", "Arabic", "Hindi"].map(l => <option key={l}>{l}</option>)}
                </select>
              )}
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={!!config.autoPublish} onChange={e => set("autoPublish", e.target.checked)} className="rounded" />
                Auto-publish imported products
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

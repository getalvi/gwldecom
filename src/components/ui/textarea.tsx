import * as React from "react";
import { cn } from "@/lib/utils";
export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> { label?: string; error?: string; }
export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, label, error, id, ...props }, ref) => {
  const tid = id ?? label?.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="w-full">
      {label && <label htmlFor={tid} className="mb-1.5 block text-sm font-medium">{label}</label>}
      <textarea ref={ref} id={tid} className={cn("flex min-h-[80px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm resize-y focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50", error && "border-destructive", className)} {...props} />
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
});
Textarea.displayName = "Textarea";

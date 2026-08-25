import * as React from "react";
import { cn } from "@/lib/utils";
export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> { label?: string; error?: string; }
export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(({ className, label, error, id, children, ...props }, ref) => {
  const sid = id ?? label?.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="w-full">
      {label && <label htmlFor={sid} className="mb-1.5 block text-sm font-medium">{label}</label>}
      <select ref={ref} id={sid} className={cn("flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary", error && "border-destructive", className)} {...props}>{children}</select>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
});
Select.displayName = "Select";

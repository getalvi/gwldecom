import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) { return <div className={cn("rounded-xl border border-border bg-background shadow-sm", className)} {...props} />; }
export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) { return <div className={cn("p-6 pb-4", className)} {...props} />; }
export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) { return <div className={cn("p-6 pt-0", className)} {...props} />; }

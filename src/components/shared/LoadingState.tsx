'use client';

import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface LoadingStateProps {
  type: 'product-card' | 'table' | 'list' | 'detail' | 'dashboard';
  count?: number;
}

export default function LoadingState({ type, count = 4 }: LoadingStateProps) {
  switch (type) {
    case 'product-card':
      return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="rounded-xl border bg-white overflow-hidden">
              <Skeleton className="aspect-square w-full rounded-none" />
              <div className="p-3 space-y-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-3 w-3 rounded-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      );

    case 'table':
      return (
        <div className="rounded-xl border bg-white overflow-hidden">
          <div className="p-4 border-b">
            <Skeleton className="h-4 w-48" />
          </div>
          <div className="divide-y">
            {Array.from({ length: count }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4">
                <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-8 rounded" />
              </div>
            ))}
          </div>
        </div>
      );

    case 'list':
      return (
        <div className="space-y-4">
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="rounded-xl border bg-white p-4 flex gap-4">
              <Skeleton className="h-20 w-20 rounded-lg shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-4 w-24" />
              </div>
              <Skeleton className="h-8 w-8 rounded self-center" />
            </div>
          ))}
        </div>
      );

    case 'detail':
      return (
        <div className="grid md:grid-cols-2 gap-8">
          <Skeleton className="aspect-square w-full rounded-xl" />
          <div className="space-y-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-px w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
            <div className="pt-4 space-y-3">
              <Skeleton className="h-10 w-full rounded-lg" />
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>
          </div>
        </div>
      );

    case 'dashboard':
      return (
        <div className="space-y-6">
          {/* Stat Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl border bg-white p-4">
                <Skeleton className="h-3 w-24 mb-2" />
                <Skeleton className="h-7 w-16" />
              </div>
            ))}
          </div>
          {/* Chart placeholder */}
          <div className="rounded-xl border bg-white p-6">
            <Skeleton className="h-4 w-32 mb-4" />
            <Skeleton className="h-64 w-full rounded-lg" />
          </div>
        </div>
      );

    default:
      return null;
  }
}

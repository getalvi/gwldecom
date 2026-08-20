'use client';

import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigationStore } from '@/lib/store';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  actionView?: string;
  actionParams?: Record<string, string>;
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionView,
  actionParams,
}: EmptyStateProps) {
  const navigate = useNavigationStore((s) => s.navigate);

  const handleAction = () => {
    if (actionView) {
      navigate(actionView, actionParams);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
        <Icon className="h-8 w-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      <p className="text-sm text-gray-500 mt-1.5 max-w-sm">{description}</p>
      {actionLabel && actionView && (
        <Button className="mt-6" onClick={handleAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

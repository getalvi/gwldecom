'use client';

import React from 'react';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { useNavigationStore } from '@/lib/store';

interface BreadcrumbItemData {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  breadcrumbs?: BreadcrumbItemData[];
}

export default function PageHeader({ title, breadcrumbs }: PageHeaderProps) {
  const navigate = useNavigationStore((s) => s.navigate);

  const handleBreadcrumbClick = (href: string) => {
    const hash = href.startsWith('#') ? href.slice(1) : href;
    const [path, qs] = hash.split('?');
    const params: Record<string, string> = {};
    if (qs) {
      qs.split('&').forEach((pair) => {
        const [k, v] = pair.split('=');
        if (k && v) params[k] = v;
      });
    }
    navigate(path, params);
  };

  return (
    <div className="mb-6">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumb className="mb-3">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink
                asChild
              >
                <button
                  onClick={() => navigate('home')}
                  className="hover:text-primary transition-colors"
                >
                  Home
                </button>
              </BreadcrumbLink>
            </BreadcrumbItem>
            {breadcrumbs.map((crumb, index) => {
              const isLast = index === breadcrumbs.length - 1;
              return (
                <React.Fragment key={crumb.label}>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    {isLast || !crumb.href ? (
                      <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink asChild>
                        <button
                          onClick={() => handleBreadcrumbClick(crumb.href!)}
                          className="hover:text-primary transition-colors"
                        >
                          {crumb.label}
                        </button>
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                </React.Fragment>
              );
            })}
          </BreadcrumbList>
        </Breadcrumb>
      )}
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{title}</h1>
    </div>
  );
}

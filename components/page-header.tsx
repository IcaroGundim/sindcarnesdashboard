"use client";

import * as React from "react";

import { useSetPageHeader } from "@/components/layout/page-header-context";

export function PageHeader({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  // Publica título/subtítulo no header do topo (desktop). O bloco abaixo só
  // aparece no mobile, onde o header não tem espaço para o texto da página.
  useSetPageHeader(title, subtitle);

  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between lg:hidden">
      <div>
        <h2 className="text-xl font-bold tracking-tight">{title}</h2>
        {subtitle && (
          <p className="text-muted-foreground mt-1 inline max-w-2xl text-sm">
            {subtitle}
          </p>
        )}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}

export function ChartCard({
  title,
  description,
  children,
  footer,
  action,
  brandHeader = true,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  action?: React.ReactNode;
  brandHeader?: boolean;
}) {
  return (
    <div className="bg-card text-card-foreground flex h-full max-w-[1536px] flex-col rounded-xl border shadow-sm">
      {brandHeader ? (
        <>
          <div className="bg-brand text-brand-foreground flex items-center justify-between gap-4 rounded-t-xl px-5 py-2.5">
            <h3 className="font-semibold uppercase leading-none tracking-wide">
              {title}
            </h3>
            {action && (
              <div className="flex shrink-0 items-center">{action}</div>
            )}
          </div>
          {description && (
            <div className="border-b px-5 py-3">
              <p className="text-muted-foreground text-sm">{description}</p>
            </div>
          )}
        </>
      ) : (
        <div className="flex items-start justify-between gap-4 border-b px-5 py-4">
          <div className="min-w-0">
            <h3 className="font-semibold uppercase leading-none tracking-wide">
              {title}
            </h3>
            {description && (
              <p className="text-muted-foreground mt-1.5 text-sm">
                {description}
              </p>
            )}
          </div>
          {action && <div className="flex shrink-0 items-center">{action}</div>}
        </div>
      )}
      <div className="min-h-0 flex-1 p-2 sm:p-3">{children}</div>
      {footer && (
        <div className="text-muted-foreground border-t px-5 py-3 text-[10px]">
          {footer}
        </div>
      )}
    </div>
  );
}

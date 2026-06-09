import * as React from "react";

export function PageHeader({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
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
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="bg-card text-card-foreground flex h-full max-w-[1536px] flex-col rounded-xl border shadow-sm">
      <div className="border-b px-5 py-4">
        <h3 className="font-semibold leading-none tracking-tight">{title}</h3>
        {description && (
          <p className="text-muted-foreground mt-1.5 text-sm">{description}</p>
        )}
      </div>
      <div className="min-h-0 flex-1 p-2 sm:p-3">{children}</div>
      {footer && (
        <div className="text-muted-foreground border-t px-5 py-3 text-xs">
          {footer}
        </div>
      )}
    </div>
  );
}

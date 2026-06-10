"use client";

import * as React from "react";

export interface PageHeaderData {
  title: string;
  subtitle?: string;
}

// Setter publicado pelo AppShell. As páginas, via <PageHeader>, registram seu
// título/subtítulo aqui para que sejam exibidos no header do topo.
export const PageHeaderSetterContext = React.createContext<
  (data: PageHeaderData | null) => void
>(() => {});

// Registra o título/subtítulo da página no header do topo enquanto montado.
export function useSetPageHeader(title: string, subtitle?: string) {
  const setHeader = React.useContext(PageHeaderSetterContext);
  React.useEffect(() => {
    setHeader({ title, subtitle });
    return () => setHeader(null);
  }, [setHeader, title, subtitle]);
}

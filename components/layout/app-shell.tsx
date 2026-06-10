"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { Menu, X, ChevronLeft, ChevronRight } from "lucide-react";

import { ALL_ITEMS, normalizePath } from "@/components/layout/nav";
import { SidebarNav } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  PageHeaderSetterContext,
  type PageHeaderData,
} from "@/components/layout/page-header-context";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  // Sidebar do desktop retraível (faixa de ícones). Começa expandida; sem
  // persistência entre recarregamentos.
  const [collapsed, setCollapsed] = React.useState(false);

  // Título/subtítulo da página atual, publicado por <PageHeader>. Exibido no
  // header do topo; cai para os metadados do menu se a página não registrar.
  const [pageHeader, setPageHeader] = React.useState<PageHeaderData | null>(
    null,
  );

  const current = ALL_ITEMS.find((i) => i.href === normalizePath(pathname));
  const headerTitle = pageHeader?.title ?? current?.title ?? "SINDICARNES Acre";

  // Fecha o menu mobile ao trocar de rota.
  React.useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header unificado (largura total, vermelho/branco) */}
      <header className="bg-brand text-brand-foreground sticky top-0 z-50 flex h-16 items-center border-b border-black/10 shadow-sm">
        {/* Marca — alinhada à largura da sidebar (desktop). O texto fica sempre
            montado e é "varrido" pelo overflow + animação de largura; o padding
            constante mantém o selo "SC" centralizado quando recolhido. */}
        <div
          className={cn(
            "hidden h-full shrink-0 items-center gap-2.5 overflow-hidden px-4 transition-[width] duration-200 lg:flex",
            collapsed ? "w-16" : "w-64",
          )}
        >
          <span className="text-[var(--brand)] flex size-8 shrink-0 items-center justify-center rounded-md bg-white text-xs font-bold tracking-tight">
            SC
          </span>
          <div
            className={cn(
              "flex min-w-0 flex-col whitespace-nowrap leading-tight transition-opacity duration-200",
              collapsed ? "opacity-0" : "opacity-100",
            )}
          >
            <span className="text-sm font-semibold">SINDICARNES Acre</span>
            <span className="truncate text-[11px] text-white/75">
              Sind. das Indústrias de Frigoríficos e Matadouros
            </span>
          </div>
        </div>

        {/* Área direita: menu mobile / título */}
        <div className="flex min-w-0 flex-1 items-center gap-3 px-4 lg:px-6">
          <Button
            variant="outline"
            size="icon"
            className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Abrir menu"
          >
            <Menu className="size-5" />
          </Button>

          {/* Marca compacta (mobile) */}
          <div className="flex items-center gap-2 lg:hidden">
            <span className="text-[var(--brand)] flex size-8 shrink-0 items-center justify-center rounded-md bg-white text-xs font-bold tracking-tight">
              SC
            </span>
            <span className="text-sm font-semibold">SINDICARNES Acre</span>
          </div>

          {/* Título da página (desktop) — vindo do <PageHeader> da página. */}
          <div className="hidden min-w-0 flex-1 items-center lg:flex">
            <h1 className="truncate text-2xl font-semibold">{headerTitle}</h1>
          </div>

          <div className="flex-1 lg:hidden" />
        </div>
      </header>

      {/* Corpo: sidebar + conteúdo */}
      <div className="flex flex-1">
        {/* Sidebar desktop (sem marca; o header já a exibe) */}
        <aside
          className={cn(
            "hidden shrink-0 border-r transition-[width] duration-200 lg:block",
            collapsed ? "w-16" : "w-64",
          )}
        >
          <div className="sticky top-16 relative h-[calc(100vh-4rem)]">
            {/* Botão de retrair na borda direita da sidebar */}
            <button
              type="button"
              onClick={() => setCollapsed((v) => !v)}
              aria-expanded={!collapsed}
              aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
              className="bg-background text-muted-foreground hover:text-foreground hover:bg-accent absolute -right-11 top-4 z-20 flex size-7 items-center justify-center rounded-full border shadow-sm transition-colors"
            >
              {collapsed ? (
                <ChevronRight className="size-4" />
              ) : (
                <ChevronLeft className="size-4" />
              )}
            </button>
            <SidebarNav showBrand={false} collapsed={collapsed} />
          </div>
        </aside>

        {/* Sidebar mobile (overlay) */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setMobileOpen(false)}
            />
            <div className="bg-sidebar absolute left-0 top-0 h-full w-64 border-r shadow-xl">
              <SidebarNav onNavigate={() => setMobileOpen(false)} />
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-3 text-white hover:bg-white/20 hover:text-white"
                onClick={() => setMobileOpen(false)}
                aria-label="Fechar menu"
              >
                <X className="size-5" />
              </Button>
            </div>
          </div>
        )}

        {/* Conteúdo */}
        <div className="flex min-w-0 flex-1 flex-col">
          <main
            id="main-content"
            className="w-full flex-1 px-4 py-6 sm:px-6 lg:px-8 2xl:px-10"
          >
            <PageHeaderSetterContext.Provider value={setPageHeader}>
              {children}
            </PageHeaderSetterContext.Provider>
          </main>

          <footer className="text-muted-foreground border-t px-4 py-4 text-center text-xs lg:px-6">
            Fontes: IDAF, IBGE/SIDRA, COMEX Stat, CEPEA/ESALQ, RAIS/MTE, ANP ·
            SINDICARNES Acre — Diagnóstico da Indústria de Abate Bovina
          </footer>
        </div>
      </div>
    </div>
  );
}

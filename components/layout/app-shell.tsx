"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

import { ALL_ITEMS, normalizePath } from "@/components/layout/nav";
import { SidebarNav } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const current = ALL_ITEMS.find((i) => i.href === normalizePath(pathname));

  // Fecha o menu mobile ao trocar de rota.
  React.useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header unificado (largura total, vermelho/branco) */}
      <header className="bg-brand text-brand-foreground sticky top-0 z-50 flex h-16 items-center border-b border-black/10 shadow-sm">
        {/* Marca — alinhada à largura da sidebar (desktop) */}
        <div className="hidden h-full w-64 shrink-0 items-center gap-2.5 px-5 lg:flex">
          <span className="text-[var(--brand)] flex size-8 shrink-0 items-center justify-center rounded-md bg-white text-xs font-bold tracking-tight">
            SC
          </span>
          <div className="flex min-w-0 flex-col leading-tight">
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

          {/* Título da página (desktop) */}
          <div className="hidden min-w-0 flex-1 lg:block">
            <h1 className="truncate text-base font-semibold">
              {current?.title ?? "SINDICARNES Acre"}
            </h1>
            {current?.description && (
              <p className="truncate text-xs text-white/80">
                {current.description}
              </p>
            )}
          </div>

          <div className="flex-1 lg:hidden" />
        </div>
      </header>

      {/* Corpo: sidebar + conteúdo */}
      <div className="flex flex-1">
        {/* Sidebar desktop (sem marca; o header já a exibe) */}
        <aside className="hidden w-64 shrink-0 border-r lg:block">
          <div className="sticky top-16 h-[calc(100vh-4rem)]">
            <SidebarNav showBrand={false} />
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
            {children}
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

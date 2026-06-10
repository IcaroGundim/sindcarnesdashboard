"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import { NAV, normalizePath } from "@/components/layout/nav";

// useLayoutEffect no cliente, useEffect no servidor (evita warning no prerender).
const useIsoLayoutEffect =
  typeof window !== "undefined" ? React.useLayoutEffect : React.useEffect;

export function SidebarNav({
  onNavigate,
  showBrand = true,
  collapsed = false,
}: {
  onNavigate?: () => void;
  showBrand?: boolean;
  collapsed?: boolean;
}) {
  const current = normalizePath(usePathname());

  const navRef = React.useRef<HTMLElement>(null);
  const itemRefs = React.useRef<Map<string, HTMLAnchorElement>>(new Map());
  const [ind, setInd] = React.useState({ top: 0, height: 0, ready: false });
  const [animate, setAnimate] = React.useState(false);

  // Mede a posição do item ativo para posicionar o indicador deslizante.
  const measure = React.useCallback(() => {
    const nav = navRef.current;
    const el = itemRefs.current.get(current);
    if (!nav || !el) {
      setInd((s) => ({ ...s, ready: false }));
      return;
    }
    const navRect = nav.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    setInd({
      top: elRect.top - navRect.top + nav.scrollTop,
      height: elRect.height,
      ready: true,
    });
  }, [current]);

  useIsoLayoutEffect(() => {
    measure();
    // Re-mede ao recolher/expandir: esconder os rótulos de grupo muda as
    // posições verticais dos itens, então o indicador precisa reposicionar.
  }, [measure, collapsed]);

  // Habilita a transição só após o primeiro posicionamento (evita o "slide"
  // inicial vindo do topo no carregamento da página).
  React.useEffect(() => {
    const id = requestAnimationFrame(() => setAnimate(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Reposiciona em mudanças de tamanho da janela.
  React.useEffect(() => {
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure]);

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      {/* Marca (oculta no desktop, pois o header unificado já a exibe) */}
      {showBrand && (
        <div className="bg-brand text-brand-foreground flex h-16 items-center gap-2.5 px-5">
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
      )}

      {/* Navegação */}
      <nav
        ref={navRef}
        className="relative flex-1 space-y-5 overflow-y-auto px-3 py-4"
      >
        {/* Indicador deslizante (fundo do item ativo) */}
        <span
          aria-hidden
          className={cn(
            "bg-sidebar-primary pointer-events-none absolute left-3 right-3 z-0 rounded-md shadow-sm",
            ind.ready ? "opacity-100" : "opacity-0",
          )}
          style={{
            top: ind.top,
            height: ind.height,
            transitionProperty: animate ? "top, height, opacity" : "opacity",
            transitionDuration: "160ms",
            transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
            willChange: "top, height",
          }}
        />

        {NAV.map((group) => (
          <div key={group.label}>
            {!collapsed && (
              <p className="text-muted-foreground px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-wider">
                {group.label}
              </p>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = current === item.href;
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      ref={(el) => {
                        if (el) itemRefs.current.set(item.href, el);
                        else itemRefs.current.delete(item.href);
                      }}
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      title={collapsed ? item.title : undefined}
                      className={cn(
                        "relative z-10 flex items-center rounded-md px-2.5 py-2 text-sm font-medium transition-colors duration-150",
                        collapsed ? "justify-center" : "gap-3",
                        active
                          ? "text-sidebar-primary-foreground"
                          : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                      )}
                    >
                      <Icon className="size-4 shrink-0 transition-transform duration-200" />
                      {!collapsed && (
                        <span className="truncate">{item.title}</span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Rodapé */}
      {!collapsed && (
        <div className="border-t px-4 py-3">
          <p className="text-muted-foreground text-[11px] leading-relaxed">
            Diagnóstico da indústria de abate bovino do Acre
            <br />
            Dados 2013–2026
          </p>
        </div>
      )}
    </div>
  );
}

import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Scale,
  Beef,
  MapPin,
  Layers,
  DollarSign,
  Users,
  TrendingUp,
  LineChart,
} from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  description: string;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV: NavGroup[] = [
  {
    label: "Diagnóstico",
    items: [
      {
        title: "Visão Geral",
        href: "/",
        icon: LayoutDashboard,
        description: "Indicadores executivos da sustentabilidade do abate",
      },
      {
        title: "Abates × Evasão",
        href: "/abates-exportacoes",
        icon: Scale,
        description: "Desfrute local versus drenagem interestadual",
      },
      {
        title: "Rebanho & Desfrute",
        href: "/rebanho-desfrute",
        icon: Beef,
        description: "Evolução do rebanho e intensidade de utilização",
      },
    ],
  },
  {
    label: "Drenagem",
    items: [
      {
        title: "Destinos",
        href: "/destinos",
        icon: MapPin,
        description: "Concentração de destinos da evasão de bovinos",
      },
      {
        title: "Composição Etária",
        href: "/composicao-etaria",
        icon: Layers,
        description: "Machos jovens e fêmeas que deixam o estado",
      },
      {
        title: "Preços",
        href: "/precos",
        icon: DollarSign,
        description: "Boi gordo, bezerro e arbitragem de reposição",
      },
    ],
  },
  {
    label: "Impacto & Futuro",
    items: [
      {
        title: "Emprego (RAIS)",
        href: "/emprego",
        icon: Users,
        description: "Trabalhadores e salários em frigorífico e pecuária",
      },
      {
        title: "Previsão de curto prazo",
        href: "/previsao",
        icon: LineChart,
        description: "Previsão estatística de 3 a 24 meses, validada por backtesting",
      },
      {
        title: "Cenários 2030",
        href: "/cenarios",
        icon: TrendingUp,
        description: "Modelo estrutural e simulação probabilística (Monte Carlo)",
      },
    ],
  },
];

export const ALL_ITEMS: NavItem[] = NAV.flatMap((g) => g.items);

// Normaliza o pathname removendo a(s) barra(s) final(is). Necessário porque o
// next.config usa `trailingSlash: true` (o navegador usa "/destinos/", mas os
// hrefs do menu são "/destinos").
export function normalizePath(p: string | null | undefined): string {
  if (!p) return "/";
  return p !== "/" ? p.replace(/\/+$/, "") : p;
}

import * as React from "react";
import type { Icon } from "@phosphor-icons/react";
import { ArrowDownRight, ArrowUpRight } from "@phosphor-icons/react";

import { cn } from "@/lib/utils";
import { fmtBRL, fmtInt, fmtPct } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Sparkline } from "@/components/charts/charts";

export type Trend = "up" | "down" | "neutral";
export type Tone = "default" | "danger" | "success" | "warning";

const toneRing: Record<Tone, string> = {
  default: "",
  danger: "border-destructive/30",
  success: "border-[var(--success)]/30",
  warning: "border-[var(--warning)]/40",
};

const toneWatermark: Record<Tone, string> = {
  default: "text-muted-foreground",
  danger: "text-destructive",
  success: "text-[var(--success)]",
  warning: "text-[var(--warning)]",
};

// Cor (hex) da mini-linha por tom — Recharts não resolve var(--css) em SVG.
const toneSpark: Record<Tone, string> = {
  default: "#3b82f6",
  danger: "#ef4444",
  success: "#10b981",
  warning: "#f59e0b",
};

export function KpiCard({
  label,
  value,
  hint,
  delta,
  trend = "neutral",
  tone = "default",
  icon: Icon,
  spark,
  sparkColor,
  sparkFmt: sparkFmtProp,
  deltaClassName,
}: {
  label: string;
  value: string;
  hint?: string;
  delta?: string;
  trend?: Trend;
  tone?: Tone;
  icon?: Icon;
  spark?: (number | null)[];
  sparkColor?: string;
  // Formatador da sparkline. Por padrão é deduzido do `value`, mas isso falha
  // quando a unidade do `value` difere da série (ex.: KPI de crescimento em %
  // cuja mini-série mostra valores absolutos). Passe explicitamente nesses casos.
  sparkFmt?: (v: number) => string;
  deltaClassName?: string;
}) {
  const hasSpark = !!spark && spark.filter((v) => v != null).length > 1;
  const sparkFmt = React.useMemo(() => {
    if (sparkFmtProp) return sparkFmtProp;
    if (value.includes("%")) return fmtPct;
    if (value.includes("R$")) return fmtBRL;
    return fmtInt;
  }, [value, sparkFmtProp]);

  return (
    <Card
      className={cn(
        "relative flex flex-row items-stretch gap-2 overflow-hidden py-5",
        toneRing[tone],
      )}
    >
      {/* SVG de fundo (marca-d'água) */}
      {Icon && (
        <Icon
          weight="duotone"
          className={cn(
            "pointer-events-none absolute -left-3 -top-2 size-28 opacity-[0.10]",
            toneWatermark[tone],
          )}
        />
      )}

      {/* Esquerda: dados */}
      <div className="relative z-10 flex min-w-0 flex-1 flex-col justify-center px-5">
        <p className="text-muted-foreground text-sm font-medium">{label}</p>
        <p className="mt-2 text-2xl font-bold tracking-tight tabular-nums">
          {value}
        </p>
        <div className="mt-1 flex items-center gap-2">
          {delta && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 text-xs font-medium tabular-nums",
                deltaClassName,
                trend === "up" && "text-[var(--success)]",
                trend === "down" && "text-destructive",
                trend === "neutral" && "text-muted-foreground",
              )}
            >
              {trend === "up" && <ArrowUpRight className="size-3" />}
              {trend === "down" && <ArrowDownRight className="size-3" />}
              {delta}
            </span>
          )}
          {hint && (
            <span className="text-muted-foreground text-xs">{hint}</span>
          )}
        </div>
      </div>

      {/* Direita: sparkline por cima do SVG de fundo (apenas séries temporais) */}
      {hasSpark && (
        <div className="relative z-10 flex w-[42%] shrink-0 items-center justify-center pr-4">
          <Sparkline
            data={spark!}
            color={sparkColor ?? toneSpark[tone]}
            height={60}
            fmt={sparkFmt}
          />
        </div>
      )}
    </Card>
  );
}

"use client";

import { anual, kpi, CHART } from "@/lib/data";
import { fmtInt, fmtCompact, fmtPct } from "@/lib/format";
import { PageHeader, ChartCard } from "@/components/page-header";
import { ComposedTrend } from "@/components/charts/charts";
import { KpiCard } from "@/components/kpi-card";
import { Cow, Pulse, TrendUp } from "@phosphor-icons/react";

export default function RebanhoDesfrutePage() {
  const serie = anual.map((r) => ({
    ano: r.ano,
    Rebanho: r.rebanho,
    Desfrute: r.desfrute,
  }));

  const desfrute2025 = anual[anual.length - 1].desfrute;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rebanho & Desfrute"
        subtitle="O rebanho bovino do Acre quase dobrou desde 2015, mas a taxa de desfrute aparente — quanto do rebanho é abatido ou exportado a cada ano — permanece baixa, sinalizando um rebanho em formação e ainda subutilizado industrialmente."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard
          label="Rebanho (2024)"
          value={fmtCompact(kpi.rebanho_2024)}
          hint="cabeças"
          tone="success"
          icon={Cow}
          spark={anual.map((r) => r.rebanho)}
        />
        <KpiCard
          label="Crescimento do rebanho"
          value={`+${fmtPct(kpi.crescimento_rebanho_2015_2024)}`}
          delta="2015 → 2024"
          trend="up"
          tone="success"
          icon={TrendUp}
          spark={anual.map((r) => r.rebanho)}
        />
        <KpiCard
          label="Taxa de desfrute (2025)"
          value={fmtPct(desfrute2025)}
          hint="(abates + export) ÷ rebanho"
          icon={Pulse}
          spark={anual.map((r) => r.desfrute)}
        />
      </div>

      <ChartCard
        title="Rebanho e taxa de desfrute aparente"
        description="Barras: rebanho total do Acre (eixo esquerdo). Linha: taxa de desfrute em % (eixo direito)."
        footer="Fonte: IDAF/IBGE — rebanho; desfrute = (abates + exportação) ÷ rebanho."
      >
        <ComposedTrend
          data={serie}
          xKey="ano"
          height={380}
          rightAxis
          bars={[{ key: "Rebanho", name: "Rebanho", color: CHART.azul }]}
          lines={[
            {
              key: "Desfrute",
              name: "Taxa de desfrute (%)",
              color: CHART.ambar,
              yAxisId: "right",
            },
          ]}
          leftFmt={(v) => fmtCompact(v)}
          rightFmt={(v) => `${v}%`}
          tooltipFmt={(v) => fmtInt(v)}
        />
      </ChartCard>
    </div>
  );
}

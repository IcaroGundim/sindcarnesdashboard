"use client";

import { precos, kpi, CHART } from "@/lib/data";
import { fmtBRL, fmtMesAno, fmtInt } from "@/lib/format";
import { PageHeader, ChartCard } from "@/components/page-header";
import { ComposedTrend } from "@/components/charts/charts";
import { KpiCard } from "@/components/kpi-card";
import { Money, Cow, Scales } from "@phosphor-icons/react";

export default function PrecosPage() {
  const serie = precos
    .filter((p) => p.boi !== null || p.bezerro !== null)
    .map((p) => ({
      data: fmtMesAno(p.data),
      "Boi gordo": p.boi,
      Bezerro: p.bezerro,
      // razão de arbitragem: preço do bezerro em arrobas de boi gordo
      Arbitragem: p.boi && p.bezerro ? p.bezerro / p.boi : null,
    }));

  const ult = [...serie].reverse().find((s) => s["Boi gordo"]);
  const arb = ult?.Arbitragem ?? null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Preços & Arbitragem"
        subtitle="Os preços do boi gordo (R$/arroba) e do bezerro (R$/cabeça) determinam o incentivo econômico. Quando a reposição (bezerro) fica cara frente ao boi gordo, cria-se um incentivo perverso para vender o animal vivo a outro estado em vez de abatê-lo localmente."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard
          label="Boi gordo (2025)"
          value={fmtBRL(kpi.preco_boi_2025)}
          hint="por arroba"
          icon={Cow}
          spark={precos.map((p) => p.boi)}
          sparkColor={CHART.vermelho}
        />
        <KpiCard
          label="Bezerro (2025)"
          value={fmtBRL(kpi.preco_bezerro_2025)}
          hint="por cabeça"
          icon={Money}
          spark={precos.map((p) => p.bezerro)}
          sparkColor={CHART.ambar}
        />
        <KpiCard
          label="Arbitragem (bezerro ÷ boi)"
          value={arb ? `${fmtInt(arb)} @` : "—"}
          hint="arrobas de boi para repor 1 bezerro"
          tone="warning"
          icon={Scales}
          spark={serie.map((s) => s.Arbitragem)}
        />
      </div>

      <ChartCard
        title="Boi gordo × bezerro"
        description="Boi gordo em R$/arroba (eixo esquerdo) e bezerro em R$/cabeça (eixo direito), série mensal."
        footer="Fonte: CEPEA/ESALQ — indicadores do boi gordo e do bezerro."
      >
        <ComposedTrend
          data={serie}
          xKey="data"
          height={360}
          rightAxis
          lines={[
            { key: "Boi gordo", name: "Boi gordo (R$/@)", color: CHART.azul },
            {
              key: "Bezerro",
              name: "Bezerro (R$/cab)",
              color: CHART.ambar,
              yAxisId: "right",
            },
          ]}
          leftFmt={(v) => `R$ ${fmtInt(v)}`}
          rightFmt={(v) => fmtInt(v)}
          tooltipFmt={(v) => fmtBRL(v)}
        />
      </ChartCard>

      <ChartCard
        title="Razão de arbitragem (bezerro ÷ boi gordo)"
        description="Número de arrobas de boi gordo necessárias para repor um bezerro. Valores altos encarecem a reposição e estimulam a venda do animal vivo."
        footer="Fonte: CEPEA/ESALQ. Cálculo: preço do bezerro ÷ preço da arroba do boi gordo."
      >
        <ComposedTrend
          data={serie}
          xKey="data"
          height={300}
          areas={[
            { key: "Arbitragem", name: "Arrobas por bezerro", color: CHART.verde },
          ]}
          leftFmt={(v) => `${fmtInt(v)} @`}
          tooltipFmt={(v) => `${fmtInt(v)} @`}
        />
      </ChartCard>
    </div>
  );
}

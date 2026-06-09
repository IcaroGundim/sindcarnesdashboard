"use client";

import { painelMensal, executive, CHART } from "@/lib/data";
import { fmtInt, fmtCompact, fmtPct } from "@/lib/format";
import { PageHeader, ChartCard } from "@/components/page-header";
import { ComposedTrend } from "@/components/charts/charts";
import { KpiCard } from "@/components/kpi-card";
import { Stack, GenderMale, GenderFemale } from "@phosphor-icons/react";

type Acc = Record<string, number>;

export default function ComposicaoEtariaPage() {
  // Agrega o painel mensal por ano (apenas anos completos / com dados).
  const porAno = new Map<number, Acc>();
  for (const r of painelMensal) {
    if (!r.export_total) continue;
    const a = porAno.get(r.ano) ?? {
      m0: 0, m13: 0, m25: 0, m36: 0, f: 0, total: 0,
    };
    a.m0 += r.export_m_0a12 ?? 0;
    a.m13 += r.export_m_13a24 ?? 0;
    a.m25 += r.export_m_25a36 ?? 0;
    a.m36 += r.export_m_36plus ?? 0;
    a.f += r.export_femeas ?? 0;
    a.total += r.export_total ?? 0;
    porAno.set(r.ano, a);
  }

  const serie = [...porAno.entries()]
    .sort((x, y) => x[0] - y[0])
    .map(([ano, a]) => ({
      ano,
      "M 0–12": a.m0,
      "M 13–24": a.m13,
      "M 25–36": a.m25,
      "M 36+": a.m36,
      Fêmeas: a.f,
      jovens: a.total ? ((a.m0 + a.m13) / a.total) * 100 : 0,
      femeasPct: a.total ? (a.f / a.total) * 100 : 0,
    }));

  const km = executive.key_metrics;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Composição Etária da Exportação"
        subtitle="O perfil dos animais que deixam o estado revela o mecanismo da drenagem: a maior parte são machos jovens (0–24 meses), que seriam abatidos localmente nos anos seguintes. Cada macho jovem exportado hoje é um abate perdido em 2–3 anos."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard
          label="Machos jovens no export (2025)"
          value={fmtPct(km.young_male_export_share_pct)}
          hint="0–24 meses"
          tone="danger"
          icon={GenderMale}
          spark={serie.map((s) => s.jovens)}
        />
        <KpiCard
          label="Fêmeas no export (2025)"
          value={fmtPct(serie[serie.length - 1]?.femeasPct ?? null)}
          hint="reduz a base reprodutiva"
          tone="warning"
          icon={GenderFemale}
          spark={serie.map((s) => s.femeasPct)}
        />
        <KpiCard
          label="Machos jovens exportados (2025)"
          value={fmtInt(km.export_2025 * (km.young_male_export_share_pct / 100))}
          hint="cabeças (estimativa)"
          tone="danger"
          icon={Stack}
          spark={serie.map((s) => s["M 0–12"] + s["M 13–24"])}
        />
      </div>

      <ChartCard
        title="Exportação por classe etária e sexo"
        description="Barras empilhadas: composição do volume exportado por ano. Linha: percentual de machos jovens (0–24 meses) sobre o total (eixo direito)."
        footer="Fonte: IDAF — painel mensal agregado por ano."
      >
        <ComposedTrend
          data={serie}
          xKey="ano"
          height={400}
          rightAxis
          bars={[
            { key: "M 0–12", name: "Machos 0–12m", color: CHART.vermelho, stackId: "s" },
            { key: "M 13–24", name: "Machos 13–24m", color: CHART.ambar, stackId: "s" },
            { key: "M 25–36", name: "Machos 25–36m", color: CHART.azul, stackId: "s" },
            { key: "M 36+", name: "Machos 36m+", color: CHART.ciano, stackId: "s" },
            { key: "Fêmeas", name: "Fêmeas", color: CHART.violeta, stackId: "s" },
          ]}
          lines={[
            {
              key: "jovens",
              name: "% machos jovens",
              color: CHART.rosa,
              yAxisId: "right",
            },
          ]}
          leftFmt={(v) => fmtCompact(v)}
          rightFmt={(v) => `${Math.round(v)}%`}
          tooltipFmt={(v) => fmtInt(v)}
          refLines={[
            { y: 70, label: "alerta 70%", color: CHART.vermelho, axis: "right" },
          ]}
        />
      </ChartCard>
    </div>
  );
}

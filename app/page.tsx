"use client";

import { Scales, UsersThree, Percent, TrendUp } from "@phosphor-icons/react";

import { kpi, executive, anual, emprego, destinos, CHART } from "@/lib/data";
import { fmtInt, fmtPct, fmtCompact, fmtBRL } from "@/lib/format";
import { KpiCard } from "@/components/kpi-card";
import { PageHeader, ChartCard } from "@/components/page-header";
import { ComposedTrend, Donut } from "@/components/charts/charts";
import { BrazilMap } from "@/components/charts/brazil-map";

export default function VisaoGeralPage() {
  const km = executive.key_metrics;

  const serie = anual.map((r) => ({
    ano: r.ano,
    Abates: r.abates,
    Exportação: r.exportacoes,
    Evasão: r.evasao,
  }));

  // Top 5 destinos + agrupamento "Outros"
  const top = destinos.by_uf.slice(0, 5).map((d) => ({
    nome: d.nome,
    total: d.total,
  }));
  const outros = destinos.by_uf.slice(5).reduce((s, d) => s + d.total, 0);
  const donutData = [...top, { nome: "Outros", total: outros }];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Visão Geral"
        subtitle="A exportação interestadual de bovinos do Acre cresceu mais de 1.000% em uma década e drena, de forma crescente, a matéria-prima do abate local — comprometendo a sustentabilidade da indústria frigorífica do estado."
      />

      {/* KPIs essenciais */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Taxa de evasão (2025)"
          value={fmtPct(kpi.taxa_evasao_2025)}
          hint="export ÷ (abates + export)"
          tone="danger"
          icon={Percent}
          spark={anual.map((r) => r.evasao)}
        />
        <KpiCard
          label="Razão export ÷ abate (2025)"
          value={fmtPct(km.exp_abate_ratio_2025_pct)}
          hint="pressão sobre o abate local"
          tone="warning"
          icon={Scales}
          spark={anual.map((r) => r.razao)}
        />
        <KpiCard
          label="Crescimento da exportação (10 anos)"
          value={`+${fmtInt(km.export_growth_10yr_pct)}%`}
          delta="2015 → 2025"
          trend="up"
          tone="danger"
          icon={TrendUp}
          spark={anual.map((r) => r.exportacoes)}
        />
        <KpiCard
          label="Trabalhadores em frigorífico (2025)"
          value={fmtInt(kpi.trabalhadores_frigorifico_2025)}
          delta={fmtBRL(kpi.salario_medio_frig_2025)}
          hint="salário médio mensal"
          tone="success"
          icon={UsersThree}
          spark={emprego.frigorifico.map((f) => f.ativos)}
        />
      </div>

      {/* Gráfico principal + mapa de destinos */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <ChartCard
        title="Abates × Exportação × Taxa de evasão"
        description="Volumes anuais de abate e exportação interestadual (eixo esquerdo) e a taxa de evasão (eixo direito). Limiares de alerta em 30% e 50%."
        footer="Fonte: IDAF (abates e exportações) · evasão calculada como export ÷ (abates + export)."
      >
        <ComposedTrend
          data={serie}
          xKey="ano"
          fill
          rightAxis
          areas={[
            { key: "Abates", name: "Abates", color: CHART.verde, stackId: "a" },
            {
              key: "Exportação",
              name: "Exportação",
              color: CHART.vermelho,
              stackId: "a",
            },
          ]}
          lines={[
            {
              key: "Evasão",
              name: "Taxa de evasão (%)",
              color: CHART.azul,
              yAxisId: "right",
            },
          ]}
          leftFmt={(v) => fmtCompact(v)}
          rightFmt={(v) => `${v}%`}
          tooltipFmt={(v) => fmtInt(v)}
          refLines={[
            { y: 30, label: "alerta 30%", color: CHART.ambar, axis: "right" },
            { y: 50, label: "crítico 50%", color: CHART.vermelho, axis: "right" },
          ]}
        />
      </ChartCard>

        <ChartCard
          title="Mapa de destinos"
          description="Estados de destino dos bovinos exportados pelo Acre, por volume acumulado recebido."
          footer="Fonte: IDAF — exportações por UF · malha IBGE 2025."
        >
          <BrazilMap data={destinos.by_uf} compact />
        </ChartCard>
      </div>

      {/* Linha inferior: destinos */}
      <div className="grid grid-cols-1 gap-6">
        <ChartCard
          title="Destinos da exportação (acumulado)"
          description="Participação por estado de destino dos bovinos exportados pelo Acre."
          footer="Fonte: IDAF — exportações por UF de destino, 2014–2026."
        >
          <Donut
            data={donutData}
            nameKey="nome"
            valueKey="total"
            colors={[
              CHART.azul,
              CHART.ambar,
              CHART.verde,
              CHART.violeta,
              CHART.ciano,
              CHART.cinza,
            ]}
            fmt={(v) => fmtInt(v)}
          />
        </ChartCard>
      </div>
    </div>
  );
}

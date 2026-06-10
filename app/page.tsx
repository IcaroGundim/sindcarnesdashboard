"use client";

import { Scales, UsersThree, Percent, TrendUp } from "@phosphor-icons/react";

import { kpi, executive, anual, emprego, destinos, CHART } from "@/lib/data";
import { fmtInt, fmtPct, fmtCompact, fmtBRL } from "@/lib/format";
import { KpiCard } from "@/components/kpi-card";
import { PageHeader, ChartCard } from "@/components/page-header";
import { ComposedTrend, Donut } from "@/components/charts/charts";
import { DestinosMapTimeline } from "@/components/charts/destinos-map-timeline";

export default function VisaoGeralPage() {
  const km = executive.key_metrics;

  // 2013 não possui dados auxiliares (exportação, evasão) — removido das séries
  const anualSerie = anual.filter((r) => r.ano >= 2014);

  const serie = anualSerie.map((r) => ({
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
        subtitle="A evasão interestadual de bovinos do Acre cresceu mais de 1.000% em uma década e drena, de forma crescente, a matéria-prima do abate local, comprometendo a sustentabilidade da indústria frigorífica do estado."
      />

      {/* KPIs essenciais */}
      <div className="grid h-[133px] grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Taxa de evasão (2025)"
          value={fmtPct(kpi.taxa_evasao_2025)}
          hint="evasão ÷ (abates + evasão)"
          tone="danger"
          icon={Percent}
          spark={anualSerie.map((r) => r.evasao)}
        />
        <KpiCard
          label="Razão evasão ÷ abate (2025)"
          value={fmtPct(km.exp_abate_ratio_2025_pct)}
          hint="pressão sobre o abate local"
          tone="warning"
          icon={Scales}
          spark={anualSerie.map((r) => r.razao)}
        />
        <KpiCard
          label="Crescimento da evasão (10 anos)"
          value={`+${fmtInt(km.export_growth_10yr_pct)}%`}
          delta="2015 → 2025"
          deltaClassName="w-[106px]"
          trend="up"
          tone="danger"
          icon={TrendUp}
          spark={anualSerie.map((r) => r.exportacoes)}
          sparkFmt={fmtInt}
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
        title="Abates × Evasão × Taxa de evasão"
        description="Volumes anuais de abate e evasão interestadual (eixo esquerdo) e a taxa de evasão (eixo direito). Limiares de alerta em 30% e 50%."
        footer="Fonte: IDAF (abates e evasão) · evasão calculada como evasão ÷ (abates + evasão)."
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
              name: "Evasão",
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
              labels: true,
              labelFmt: (v) => `${v}%`,
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
          description="Estados de destino dos bovinos evadidos do Acre, por volume recebido no ano selecionado. Arraste o slider para percorrer a linha do tempo."
          footer="Fonte: IDAF — evasão por UF · malha IBGE 2025."
        >
          <DestinosMapTimeline compact />
        </ChartCard>
      </div>

      {/* Linha inferior: destinos */}
      <div className="grid grid-cols-1 gap-6">
        <ChartCard
          title="Destinos da evasão (acumulado)"
          description="Participação por estado de destino dos bovinos evadidos do Acre."
          footer="Fonte: IDAF — evasão por UF de destino, 2014–2026."
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

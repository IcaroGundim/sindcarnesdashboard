"use client";

import { anual, painelMensal, CHART } from "@/lib/data";
import { fmtInt, fmtCompact, fmtPct, fmtMesAno } from "@/lib/format";
import { PageHeader, ChartCard } from "@/components/page-header";
import { ComposedTrend } from "@/components/charts/charts";
import { KpiCard } from "@/components/kpi-card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Scales, Truck, Percent } from "@phosphor-icons/react";

export default function AbatesExportacoesPage() {
  // 2013 não possui dados auxiliares (exportação, razão) — removido das séries
  const anualSerie = anual.filter((r) => r.ano >= 2014);

  const serieAno = anualSerie.map((r) => ({
    ano: r.ano,
    Abates: r.abates,
    Exportação: r.exportacoes,
    Razão: r.razao,
  }));

  const serieMes = painelMensal
    .filter((r) => r.ano >= 2014)
    .map((r) => ({
      data: fmtMesAno(r.data),
      Abates: r.abates_total,
      Exportação: r.export_total,
    }));

  const ult = anual[anual.length - 1];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Abates × Exportações"
        subtitle="Comparação direta entre o abate realizado dentro do Acre e os bovinos vivos exportados para outros estados. Quando a razão export ÷ abate se aproxima de 100%, o estado exporta quase tanto quanto abate."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard
          label="Abates (2025)"
          value={fmtInt(ult.abates)}
          tone="success"
          icon={Scales}
          spark={anualSerie.map((r) => r.abates)}
        />
        <KpiCard
          label="Exportação (2025)"
          value={fmtInt(ult.exportacoes)}
          tone="danger"
          icon={Truck}
          spark={anualSerie.map((r) => r.exportacoes)}
        />
        <KpiCard
          label="Razão export ÷ abate (2025)"
          value={fmtPct(ult.razao)}
          hint="57% da produção sai viva"
          tone="warning"
          icon={Percent}
          spark={anualSerie.map((r) => r.razao)}
        />
      </div>

      <Tabs defaultValue="anual">
        <TabsList>
          <TabsTrigger value="anual">Anual</TabsTrigger>
          <TabsTrigger value="mensal">Mensal</TabsTrigger>
        </TabsList>

        <TabsContent value="anual" className="mt-4">
          <ChartCard
            title="Abates e exportação por ano"
            description="Barras: volumes anuais (eixo esquerdo). Linha: razão export ÷ abate em % (eixo direito), com limiar de inversão estrutural em 100%."
            footer="Fonte: IDAF, série consolidada 2014–2025."
          >
            <ComposedTrend
              data={serieAno}
              xKey="ano"
              height={380}
              rightAxis
              bars={[
                { key: "Abates", name: "Abates", color: CHART.verde },
                { key: "Exportação", name: "Exportação", color: CHART.vermelho },
              ]}
              lines={[
                {
                  key: "Razão",
                  name: "Razão export ÷ abate (%)",
                  color: CHART.azul,
                  yAxisId: "right",
                },
              ]}
              leftFmt={(v) => fmtCompact(v)}
              rightFmt={(v) => `${v}%`}
              tooltipFmt={(v) => fmtInt(v)}
              refLines={[
                {
                  y: 100,
                  label: "inversão estrutural",
                  color: CHART.vermelho,
                  axis: "right",
                },
              ]}
            />
          </ChartCard>
        </TabsContent>

        <TabsContent value="mensal" className="mt-4">
          <ChartCard
            title="Abates e exportação mês a mês"
            description="Série mensal 2014–2026. A exportação interestadual ganha amplitude e sazonalidade ao longo do período."
            footer="Fonte: IDAF — painel mensal."
          >
            <ComposedTrend
              data={serieMes}
              xKey="data"
              height={380}
              areas={[
                { key: "Abates", name: "Abates", color: CHART.verde },
                { key: "Exportação", name: "Exportação", color: CHART.vermelho },
              ]}
              leftFmt={(v) => fmtCompact(v)}
              tooltipFmt={(v) => fmtInt(v)}
            />
          </ChartCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}

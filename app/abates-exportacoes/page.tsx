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
        title="Abates × Evasão"
        subtitle="Comparação direta entre o abate realizado dentro do Acre e os bovinos vivos evadidos para outros estados. Quando a razão evasão ÷ abate se aproxima de 100%, o estado evade quase tanto quanto abate."
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
          label="Evasão (2025)"
          value={fmtInt(ult.exportacoes)}
          tone="danger"
          icon={Truck}
          spark={anualSerie.map((r) => r.exportacoes)}
        />
        <KpiCard
          label="Razão evasão ÷ abate (2025)"
          value={fmtPct(ult.razao)}
          hint="57% da produção sai viva"
          tone="warning"
          icon={Percent}
          spark={anualSerie.map((r) => r.razao)}
        />
      </div>

      <Tabs defaultValue="anual">
        <ChartCard
          title="Abates e evasão"
          action={
            <TabsList>
              <TabsTrigger value="anual">Anual</TabsTrigger>
              <TabsTrigger value="mensal">Mensal</TabsTrigger>
            </TabsList>
          }
        >
          <TabsContent value="anual" className="mt-0">
            <p className="text-muted-foreground mb-3 px-2 text-sm sm:px-1">
              Barras: volumes anuais (eixo esquerdo). Linha: razão evasão ÷ abate
              em % (eixo direito), com limiar de inversão estrutural em 100%.
            </p>
            <ComposedTrend
              data={serieAno}
              xKey="ano"
              height={380}
              rightAxis
              bars={[
                { key: "Abates", name: "Abates", color: CHART.verde },
                { key: "Exportação", name: "Evasão", color: CHART.vermelho },
              ]}
              lines={[
                {
                  key: "Razão",
                  name: "Razão evasão ÷ abate (%)",
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
            <p className="text-muted-foreground mt-2 px-2 text-xs sm:px-1">
              Fonte: IDAF, série consolidada 2014–2025.
            </p>
          </TabsContent>

          <TabsContent value="mensal" className="mt-0">
            <p className="text-muted-foreground mb-3 px-2 text-sm sm:px-1">
              Série mensal 2014–2026. A evasão interestadual ganha amplitude e
              sazonalidade ao longo do período.
            </p>
            <ComposedTrend
              data={serieMes}
              xKey="data"
              height={380}
              areas={[
                { key: "Abates", name: "Abates", color: CHART.verde },
                { key: "Exportação", name: "Evasão", color: CHART.vermelho },
              ]}
              leftFmt={(v) => fmtCompact(v)}
              tooltipFmt={(v) => fmtInt(v)}
            />
            <p className="text-muted-foreground mt-2 px-2 text-xs sm:px-1">
              Fonte: IDAF — painel mensal.
            </p>
          </TabsContent>
        </ChartCard>
      </Tabs>
    </div>
  );
}

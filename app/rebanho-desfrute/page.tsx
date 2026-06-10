"use client";

import { anual, kpi, CHART } from "@/lib/data";
import { fmtInt, fmtCompact, fmtPct } from "@/lib/format";
import { PageHeader, ChartCard } from "@/components/page-header";
import { ComposedTrend } from "@/components/charts/charts";
import { KpiCard } from "@/components/kpi-card";
import { Cow, Pulse, TrendUp } from "@phosphor-icons/react";

// Último ano com rebanho "real": descarta anos finais cujo valor apenas repete
// o anterior (placeholder enquanto a PPM/IBGE daquele ano não é publicada).
// Self-healing: quando o dado real chega (valor diferente), o ano reaparece.
function ultimoAnoRebanhoReal(
  serie: { ano: number; rebanho: number | null }[],
) {
  const reb = serie.filter((r) => r.rebanho != null);
  let i = reb.length - 1;
  while (i > 0 && reb[i].rebanho === reb[i - 1].rebanho) i--;
  return reb[i]?.ano ?? serie[serie.length - 1].ano;
}

export default function RebanhoDesfrutePage() {
  // 2013 não possui dados auxiliares (desfrute) — removido das séries
  const anualSerie = anual.filter((r) => r.ano >= 2014);

  // Rebanho e desfrute só vão até o último ano publicado pela PPM/IBGE; anos
  // posteriores chegam como repetição do último ano e seriam irreais (o rebanho
  // congelado infla o desfrute). Cortamos a série nesse ano.
  const rebanhoUltimoAno = ultimoAnoRebanhoReal(anual);
  const serieRebanho = anualSerie.filter((r) => r.ano <= rebanhoUltimoAno);

  const serie = serieRebanho.map((r) => ({
    ano: r.ano,
    Rebanho: r.rebanho,
    Desfrute: r.desfrute,
  }));

  const desfruteUltimo =
    anual.find((r) => r.ano === rebanhoUltimoAno)?.desfrute ?? null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard
          label={`Rebanho (${rebanhoUltimoAno})`}
          value={fmtCompact(kpi.rebanho_2024)}
          hint="cabeças"
          tone="success"
          icon={Cow}
          spark={serieRebanho.map((r) => r.rebanho)}
        />
        <KpiCard
          label="Crescimento do rebanho"
          value={`+${fmtPct(kpi.crescimento_rebanho_2015_2024)}`}
          delta="2015 → 2024"
          trend="up"
          tone="success"
          icon={TrendUp}
          spark={serieRebanho.map((r) => r.rebanho)}
          sparkFmt={fmtInt}
        />
        <KpiCard
          label={`Taxa de desfrute (${rebanhoUltimoAno})`}
          value={fmtPct(desfruteUltimo)}
          hint="(abates + evasão) ÷ rebanho"
          icon={Pulse}
          spark={serieRebanho.map((r) => r.desfrute)}
        />
      </div>

      <PageHeader
        title="Rebanho & Desfrute"
        subtitle="O rebanho bovino do Acre quase dobrou desde 2015, mas a taxa de desfrute aparente — quanto do rebanho é abatido ou evadido a cada ano — permanece baixa, sinalizando um rebanho em formação e ainda subutilizado industrialmente."
      />

      <ChartCard
        title="Rebanho e taxa de desfrute aparente"
        description="Barras: rebanho total do Acre (eixo esquerdo). Linha: taxa de desfrute em % (eixo direito)."
        footer={`Fonte: IDAF/IBGE — rebanho; desfrute = (abates + evasão) ÷ rebanho. Série até ${rebanhoUltimoAno} (último rebanho publicado pela PPM/IBGE).`}
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

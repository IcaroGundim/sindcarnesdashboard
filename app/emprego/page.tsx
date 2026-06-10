"use client";

import { emprego, anual, kpi, CHART } from "@/lib/data";
import { fmtInt, fmtBRL } from "@/lib/format";
import { PageHeader, ChartCard } from "@/components/page-header";
import { ComposedTrend } from "@/components/charts/charts";
import { KpiCard } from "@/components/kpi-card";
import { UsersThree, Money, Factory } from "@phosphor-icons/react";

export default function EmpregoPage() {
  const abatesPorAno = new Map(anual.map((r) => [r.ano, r.abates]));

  const serie = emprego.frigorifico.map((f) => {
    const p = emprego.pecuaria.find((x) => x.ano === f.ano);
    const abates = abatesPorAno.get(f.ano);
    return {
      ano: f.ano,
      Frigorífico: f.ativos,
      Pecuária: p?.ativos ?? null,
      salario: Math.round(f.rem_media),
      produtividade: abates ? Math.round(abates / f.ativos) : null,
    };
  });

  const frigUlt = emprego.frigorifico[emprego.frigorifico.length - 1];
  const frigIni = emprego.frigorifico[0];
  const cresc = ((frigUlt.ativos - frigIni.ativos) / frigIni.ativos) * 100;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard
          label="Trabalhadores em frigorífico (2025)"
          value={fmtInt(kpi.trabalhadores_frigorifico_2025)}
          delta={`+${fmtInt(cresc)}%`}
          trend="up"
          hint="vs 2015"
          tone="success"
          icon={Factory}
          spark={emprego.frigorifico.map((f) => f.ativos)}
        />
        <KpiCard
          label="Salário médio em frigorífico (2025)"
          value={fmtBRL(kpi.salario_medio_frig_2025)}
          hint="remuneração média mensal"
          icon={Money}
          spark={emprego.frigorifico.map((f) => f.rem_media)}
          sparkColor={CHART.verde}
        />
        <KpiCard
          label="Trabalhadores na pecuária (2025)"
          value={fmtInt(
            emprego.pecuaria[emprego.pecuaria.length - 1]?.ativos ?? null,
          )}
          hint="criação de bovinos de corte"
          icon={UsersThree}
          spark={emprego.pecuaria.map((p) => p.ativos)}
          sparkColor={CHART.azul}
        />
      </div>

      <PageHeader
        title="Emprego & Renda (RAIS)"
        subtitle="O emprego em frigoríficos é o elo que concentra valor, salários e arrecadação dentro do estado. Enquanto a pecuária de campo mantém o quadro estável, o abate cresceu — mas depende da continuidade da oferta local de animais para se sustentar."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartCard
          title="Trabalhadores ativos: frigorífico × pecuária"
          description="Vínculos ativos em 31/12 por ano."
          footer="Fonte: RAIS/MTE — CNAE de abate (frigorífico) e criação de bovinos."
        >
          <ComposedTrend
            data={serie}
            xKey="ano"
            height={320}
            bars={[
              { key: "Frigorífico", name: "Frigorífico", color: CHART.azul },
              { key: "Pecuária", name: "Pecuária", color: CHART.verde },
            ]}
            leftFmt={(v) => fmtInt(v)}
            tooltipFmt={(v) => fmtInt(v)}
          />
        </ChartCard>

        <ChartCard
          title="Salário médio e produtividade"
          description="Linha: salário médio em frigorífico (R$). Barras: abates por trabalhador de frigorífico (produtividade aparente)."
          footer="Fonte: RAIS/MTE e IDAF. Produtividade = abates ÷ trabalhadores ativos."
        >
          <ComposedTrend
            data={serie}
            xKey="ano"
            height={320}
            rightAxis
            bars={[
              {
                key: "produtividade",
                name: "Abates / trabalhador",
                color: CHART.ambar,
                yAxisId: "right",
              },
            ]}
            lines={[
              { key: "salario", name: "Salário médio (R$)", color: CHART.azul },
            ]}
            leftFmt={(v) => `R$ ${fmtInt(v)}`}
            rightFmt={(v) => fmtInt(v)}
            tooltipFmt={(v) => fmtInt(v)}
          />
        </ChartCard>
      </div>
    </div>
  );
}

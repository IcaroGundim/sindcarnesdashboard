"use client";

import { destinos, kpi, CHART } from "@/lib/data";
import { fmtInt, fmtPct, fmtMesAno } from "@/lib/format";
import { PageHeader, ChartCard } from "@/components/page-header";
import { HBars, ComposedTrend } from "@/components/charts/charts";
import { DestinosMapTimeline } from "@/components/charts/destinos-map-timeline";
import { KpiCard } from "@/components/kpi-card";
import { MapPin, TrendUp, ChartBar, MapTrifold } from "@phosphor-icons/react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function DestinosPage() {
  const top = destinos.by_uf.slice(0, 8).map((d) => ({
    uf: d.nome,
    total: d.total,
    share: d.share,
  }));

  const top3Share = destinos.by_uf
    .slice(0, 3)
    .reduce((s, d) => s + d.share, 0);

  const mtSerie = destinos.mt_share_by_month.map((r) => ({
    data: fmtMesAno(r.data),
    "Participação MT": r.share_mt,
  }));

  const nDestinos = destinos.by_uf.filter((d) => d.total > 0).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Destinos da Evasão"
        subtitle="Para onde vão os bovinos vivos que deixam o Acre. A forte concentração em Mato Grosso expõe a indústria local à dependência de um único mercado comprador e à sua política de preços."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Destino principal (2025)"
          value={kpi.destino_principal_2025}
          icon={MapPin}
        />
        <KpiCard
          label="Concentração no destino (2025)"
          value={fmtPct(kpi.share_mt_2025)}
          icon={TrendUp}
          tone="warning"
        />
        <KpiCard
          label="Top 3 destinos (acumulado)"
          value={fmtPct(top3Share)}
          icon={ChartBar}
        />
        <KpiCard
          label="Estados de destino"
          value={String(nDestinos)}
          icon={MapTrifold}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-stretch">
        <ChartCard
          title="Mapa de destinos da evasão"
          description="Estados de destino dos bovinos vivos evadidos do Acre, coloridos pelo volume recebido no ano selecionado. Quanto mais escuro, maior o volume. Arraste o slider para percorrer os anos."
          footer="Fonte: IDAF (evasão por UF de destino, 2014-2026) - malha estadual IBGE 2025. Passe o mouse sobre um estado para ver os números."
        >
          <DestinosMapTimeline compact mapMaxWidth={500} />
        </ChartCard>

        <ChartCard
          title="Evolução da participação de Mato Grosso"
          description="Percentual do total evadido que teve Mato Grosso como destino, mês a mês (jan/2014–abr/2026)."
          footer="Fonte: IDAF. Após anos de baixa participação, a concentração em MT dispara a partir de 2021–2022, superando os 60% nos meses mais recentes."
        >
          <ComposedTrend
            data={mtSerie}
            xKey="data"
            fill
            areas={[
              {
                key: "Participação MT",
                name: "Participação MT (%)",
                color: CHART.vermelho,
              },
            ]}
            leftFmt={(v) => `${v}%`}
            tooltipFmt={(v) => `${fmtInt(v)}%`}
            refLines={[
              { y: 60, label: "alerta 60%", color: CHART.ambar },
            ]}
          />
        </ChartCard>
      </div>

      <ChartCard
        title="Ranking de destinos (acumulado)"
        description="Total de bovinos evadidos por estado de destino, 2014-2026."
        footer="Fonte: IDAF - evasão por UF de destino."
      >
        <HBars
          data={top}
          labelKey="uf"
          valueKey="total"
          color={CHART.azul}
          height={340}
          fmt={(v) => fmtInt(v)}
        />
      </ChartCard>

      <ChartCard
        title="Detalhamento por estado de destino"
        description="Acumulado 2014-2026."
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Cabeças evadidas</TableHead>
              <TableHead className="text-right">Participação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {destinos.by_uf.map((d) => (
              <TableRow key={d.uf}>
                <TableCell className="font-medium">
                  {d.nome} <span className="text-muted-foreground">({d.uf})</span>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {fmtInt(d.total)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {fmtPct(d.share)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ChartCard>
    </div>
  );
}

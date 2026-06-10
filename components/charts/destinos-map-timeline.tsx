"use client";

import * as React from "react";

import { destinos } from "@/lib/data";
import { fmtInt, fmtPct } from "@/lib/format";
import {
  BrazilMap,
  MapGradientLegend,
  MapChips,
} from "@/components/charts/brazil-map";
import { YearSlider } from "@/components/ui/year-slider";

interface Props {
  compact?: boolean;
  mapMaxWidth?: number;
}

// Mapa de destinos com slider de linha do tempo: arraste para trocar o ano.
// Reaproveitado na Visão Geral e na aba Destinos. A escala de cor usa o max
// global (qualquer UF em qualquer ano), mantendo as cores comparáveis ao
// longo do tempo — assim o slider revela o crescimento real da evasão.
export function DestinosMapTimeline({ compact = true, mapMaxWidth }: Props) {
  const years = destinos.years;
  const lastYear = years[years.length - 1];
  const [year, setYear] = React.useState(lastYear);

  // Agrupa os destinos por ano (uma vez).
  const byYear = React.useMemo(() => {
    const m = new Map<number, typeof destinos.by_uf_year>();
    for (const d of destinos.by_uf_year) {
      const arr = m.get(d.ano) ?? [];
      arr.push(d);
      m.set(d.ano, arr);
    }
    return m;
  }, []);

  // Topo da escala de cor: maior volume de qualquer UF em qualquer ano.
  const colorMax = React.useMemo(
    () => Math.max(1, ...destinos.by_uf_year.map((d) => d.total)),
    [],
  );

  const data = byYear.get(year) ?? [];
  const totalAno = data.reduce((s, d) => s + d.total, 0);
  const principal = data.length > 0 ? data[0] : null;

  // Ultimo mes com dados no ano selecionado. Se < 12, o ano e parcial e
  // mostramos uma ressalva (ex.: 2026 vai so ate abril).
  const MESES = [
    "janeiro", "fevereiro", "março", "abril", "maio", "junho",
    "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
  ];
  const ultimoMes = React.useMemo(() => {
    let m = 0;
    for (const r of destinos.mt_share_by_month) {
      if (r.ano === year && r.mes > m) m = r.mes;
    }
    return m;
  }, [year]);
  const anoParcial = ultimoMes > 0 && ultimoMes < 12;

  // Mini cards de resumo do ano selecionado. Renderizados como overlay no
  // canto superior direito do mapa (espaço vazio) em telas largas, e em fluxo
  // normal abaixo do slider no mobile — onde o mapa ocupa a largura toda.
  const resumo = (
    <>
      <div className="bg-muted/40 rounded-lg border px-3 py-2">
        <p className="text-foreground text-2xl font-semibold tabular-nums leading-none">
          {fmtInt(totalAno)}
        </p>
        <p className="text-muted-foreground mt-1 text-[10px]">
          cabeças evadidas em{" "}
          <span className="text-foreground font-semibold">{year}</span>
        </p>
      </div>
      {principal && (
        <div className="overflow-hidden rounded-lg border">
          <p className="bg-brand text-brand-foreground px-3 py-1 text-[10px] font-semibold uppercase tracking-wide">
            Principal destino
          </p>
          <div className="bg-muted/40 px-3 py-2">
            <p className="text-foreground text-sm font-semibold">
              {principal.nome}
            </p>
            <p className="text-muted-foreground text-xs tabular-nums">
              {fmtPct(principal.share)} do total
            </p>
          </div>
        </div>
      )}
      {anoParcial && (
        <p className="text-muted-foreground text-[11px] italic">
          * {year} parcial — dados até {MESES[ultimoMes - 1]}.
        </p>
      )}
    </>
  );

  return (
    <div className="flex flex-col gap-1.5">
      {/* Wrapper de largura TOTAL do card; o mapa se centraliza sozinho
          (mx-auto + maxWidth interno). As legendas ficam nas BORDAS do card,
          no espaço lateral vazio, fora do fluxo vertical — o card encurta sem
          reduzir o mapa. */}
      <div className="relative w-full">
        <BrazilMap
          data={data}
          compact={compact}
          mapMaxWidth={mapMaxWidth}
          colorMaxOverride={colorMax}
          legendScope="no ano"
        />
        <MapGradientLegend
          max={colorMax}
          scope="no ano"
          className="pointer-events-none absolute bottom-12 left-0 z-10"
        />
        <MapChips className="pointer-events-none absolute right-0 bottom-12 z-10" />

        {/* Overlay no canto superior direito (espaço vazio do mapa) — só em
            telas largas, onde há folga ao lado do mapa centralizado. */}
        <div className="absolute right-0 top-0 z-10 hidden w-40 flex-col gap-2 sm:flex">
          {resumo}
        </div>
      </div>

      <YearSlider
        years={years}
        value={year}
        onChange={setYear}
        className="-mt-1"
      />

      {/* Versão mobile: em fluxo normal, pois o mapa ocupa a largura toda. */}
      <div className="flex flex-col gap-2 sm:hidden">{resumo}</div>
    </div>
  );
}

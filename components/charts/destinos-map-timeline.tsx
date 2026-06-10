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
// longo do tempo — assim o slider revela o crescimento real da exportação.
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
      </div>

      <YearSlider
        years={years}
        value={year}
        onChange={setYear}
        className="-mt-1"
      />

      <p className="text-muted-foreground text-xs">
        <span className="text-foreground font-semibold tabular-nums">
          {fmtInt(totalAno)}
        </span>{" "}
        cabeças exportadas em{" "}
        <span className="text-foreground font-semibold">{year}</span>
        {principal && (
          <>
            {" "}
            · principal destino:{" "}
            <span className="text-foreground font-medium">
              {principal.nome} ({fmtPct(principal.share)})
            </span>
          </>
        )}
      </p>
    </div>
  );
}

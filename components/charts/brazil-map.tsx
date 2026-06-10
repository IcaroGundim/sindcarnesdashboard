"use client";

import * as React from "react";
import { geoMercator, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { Feature, FeatureCollection, Geometry } from "geojson";

import topoData from "@/data/br_uf.topo.json";
import { fmtInt, fmtPct } from "@/lib/format";
import { cn } from "@/lib/utils";

const WIDTH = 480;
const HEIGHT = 440;
const PAD = 12;

// Endpoints da escala de cor (claro -> vermelho da marca #9b1521)
const LIGHT: [number, number, number] = [247, 217, 221];
const DARK: [number, number, number] = [155, 21, 33];
const NO_DATA = "#eceef1";
const ORIGIN = "#0f172a";

function rampColor(t: number): string {
  const c = (i: number) => Math.round(LIGHT[i] + (DARK[i] - LIGHT[i]) * t);
  return `rgb(${c(0)}, ${c(1)}, ${c(2)})`;
}

interface UfDatum {
  uf: string;
  nome: string;
  total: number;
  share: number;
}

// --- Geometria pré-computada UMA vez (sem geoPath durante o render) ---------
const objectName = Object.keys(
  (topoData as unknown as { objects: Record<string, unknown> }).objects,
)[0];
const fc = feature(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  topoData as any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (topoData as any).objects[objectName],
) as unknown as FeatureCollection<Geometry, { SIGLA_UF: string; NM_UF: string }>;

const projection = geoMercator().fitExtent(
  [
    [PAD, PAD],
    [WIDTH - PAD, HEIGHT - PAD],
  ],
  fc,
);
const pathGen = geoPath(projection);

interface StateGeo {
  sigla: string;
  nm: string;
  d: string;
  cx: number;
  cy: number;
}

const STATES: StateGeo[] = fc.features.map((f) => {
  const [cx, cy] = pathGen.centroid(f as Feature);
  return {
    sigla: f.properties.SIGLA_UF,
    nm: f.properties.NM_UF,
    d: pathGen(f as Feature) ?? "",
    cx,
    cy,
  };
});

// --- Camada base (memoizada: não re-renderiza no hover) ---------------------
interface BaseLayerProps {
  fills: Map<string, string>;
  originUf: string;
  onEnter: (sigla: string) => void;
}

const BaseLayer = React.memo(function BaseLayer({
  fills,
  originUf,
  onEnter,
}: BaseLayerProps) {
  return (
    <>
      <g>
        {STATES.map((s) => (
          <path
            key={s.sigla}
            d={s.d}
            fill={fills.get(s.sigla) ?? NO_DATA}
            stroke="#ffffff"
            strokeWidth={0.6}
            className="cursor-pointer"
            onMouseEnter={() => onEnter(s.sigla)}
          />
        ))}
      </g>
      <g className="pointer-events-none">
        {STATES.filter(
          (s) =>
            s.sigla === originUf ||
            (fills.get(s.sigla) ?? NO_DATA) !== NO_DATA,
        ).map((s) => {
          if (!Number.isFinite(s.cx) || !Number.isFinite(s.cy)) return null;
          const fill = fills.get(s.sigla) ?? NO_DATA;
          const dark = isDarkFill(fill);
          return (
            <text
              key={`l-${s.sigla}`}
              x={s.cx}
              y={s.cy}
              textAnchor="middle"
              dominantBaseline="middle"
              className="select-none text-[11px] font-semibold"
              fill={dark ? "#ffffff" : "#1f2937"}
            >
              {s.sigla}
            </text>
          );
        })}
      </g>
    </>
  );
});

// Decide cor do rótulo a partir do brilho do fill.
function isDarkFill(fill: string): boolean {
  if (fill === ORIGIN) return true;
  const m = fill.match(/rgb\((\d+), (\d+), (\d+)\)/);
  if (!m) return false;
  const [r, g, b] = [Number(m[1]), Number(m[2]), Number(m[3])];
  // luminância perceptual
  return 0.299 * r + 0.587 * g + 0.114 * b < 150;
}

interface Props {
  data: UfDatum[];
  originUf?: string;
  compact?: boolean;
  /** Largura máxima do mapa (px) no modo compact. Padrão 420. */
  mapMaxWidth?: number;
  /** Fixa o topo da escala de cor (ex.: max global entre anos), para manter
   *  as cores comparáveis ao trocar o ano no slider. Padrão: max dos dados. */
  colorMaxOverride?: number;
  /** Palavra que descreve o recorte ("acumulado" | "no ano"). */
  legendScope?: string;
}

export function BrazilMap({
  data,
  originUf = "AC",
  compact = false,
  mapMaxWidth,
  colorMaxOverride,
  legendScope = "acumulado",
}: Props) {
  const [hovered, setHovered] = React.useState<string | null>(null);
  const onEnter = React.useCallback((s: string) => setHovered(s), []);

  const byUf = React.useMemo(() => {
    const m = new Map<string, UfDatum>();
    for (const d of data) m.set(d.uf, d);
    return m;
  }, [data]);

  const max = React.useMemo(
    () =>
      colorMaxOverride && colorMaxOverride > 0
        ? colorMaxOverride
        : Math.max(
            1,
            ...data.filter((d) => d.uf !== originUf).map((d) => d.total),
          ),
    [data, originUf, colorMaxOverride],
  );

  // Cores e shares pré-calculados por UF (só mudam com os dados).
  const fills = React.useMemo(() => {
    const m = new Map<string, string>();
    for (const s of STATES) {
      if (s.sigla === originUf) {
        m.set(s.sigla, ORIGIN);
        continue;
      }
      const d = byUf.get(s.sigla);
      m.set(
        s.sigla,
        !d || d.total <= 0 ? NO_DATA : rampColor(Math.sqrt(d.total / max)),
      );
    }
    return m;
  }, [byUf, max, originUf]);

  const hoveredGeo = hovered ? STATES.find((s) => s.sigla === hovered) : null;
  const hoveredDatum = hovered ? byUf.get(hovered) : null;

  const mapBlock = (
    <div
      className={compact ? "relative mx-auto w-full" : "relative w-full lg:flex-1"}
      style={compact ? { maxWidth: mapMaxWidth ?? 420 } : undefined}
    >
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-auto w-full"
        role="img"
        aria-label="Mapa de destinos da evasão de bovinos por estado"
        onMouseLeave={() => setHovered(null)}
      >
        <BaseLayer fills={fills} originUf={originUf} onEnter={onEnter} />

        {/* Destaque do estado sob o cursor (um único path) */}
        {hoveredGeo && (
          <path
            d={hoveredGeo.d}
            fill="none"
            stroke="#0f172a"
            strokeWidth={1.8}
            className="pointer-events-none"
          />
        )}
      </svg>

      {/* Tooltip ancorado ao centroide (sem updates por pixel) */}
      {hoveredGeo && (
        <div
          className="bg-popover text-popover-foreground pointer-events-none absolute z-10 w-max max-w-[200px] rounded-lg border px-3 py-2 text-xs shadow-md"
          style={{
            left: `${(hoveredGeo.cx / WIDTH) * 100}%`,
            top: `${(hoveredGeo.cy / HEIGHT) * 100}%`,
            transform: `translate(-50%, ${hoveredGeo.cy < HEIGHT * 0.2 ? "12px" : "calc(-100% - 10px)"})`,
          }}
        >
          <p className="mb-0.5 font-semibold">
            {hoveredDatum?.nome ?? hoveredGeo.nm}{" "}
            <span className="text-muted-foreground">({hoveredGeo.sigla})</span>
          </p>
          {hoveredGeo.sigla === originUf ? (
            <p className="text-muted-foreground">Origem da evasão</p>
          ) : hoveredDatum && hoveredDatum.total > 0 ? (
            <div className="space-y-0.5">
              <p>
                Cabeças:{" "}
                <span className="font-medium tabular-nums">
                  {fmtInt(hoveredDatum.total)}
                </span>
              </p>
              <p>
                Participação:{" "}
                <span className="font-medium tabular-nums">
                  {fmtPct(hoveredDatum.share)}
                </span>
              </p>
            </div>
          ) : (
            <p className="text-muted-foreground">Sem evasão registrada</p>
          )}
        </div>
      )}
    </div>
  );

  // No modo compacto, BrazilMap renderiza somente o mapa. As legendas são
  // componentes próprios (MapGradientLegend / MapChips), posicionadas por quem
  // consome o mapa (ver DestinosMapTimeline) — fora do container do <svg>.
  if (compact) {
    return mapBlock;
  }

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
      {mapBlock}
      <div className="flex shrink-0 flex-row flex-wrap gap-4 lg:w-44 lg:flex-col">
        <MapGradientLegend max={max} scope={legendScope} />
        <MapChips />
      </div>
    </div>
  );
}

// --- Legendas (reutilizáveis fora do mapa) ----------------------------------

/** Barra de gradiente da escala de cor. `max` = topo da escala. */
export function MapGradientLegend({
  max,
  scope = "acumulado",
  className,
}: {
  max: number;
  scope?: string;
  className?: string;
}) {
  return (
    <div className={cn("w-40", className)}>
      <p className="text-muted-foreground mb-1 text-xs font-medium">
        Cabeças evadidas ({scope})
      </p>
      <div
        className="h-3 w-full rounded"
        style={{
          background: `linear-gradient(to right, ${rampColor(0)}, ${rampColor(1)})`,
          minWidth: 120,
        }}
      />
      <div className="text-muted-foreground mt-1 flex justify-between text-[11px] tabular-nums">
        <span>0</span>
        <span>{fmtInt(max)}</span>
      </div>
    </div>
  );
}

/** Chips de origem e "sem evasão". */
export function MapChips({ className }: { className?: string }) {
  return (
    <div
      className={cn("flex gap-3 text-xs sm:flex-col sm:gap-1.5", className)}
    >
      <div className="flex items-center gap-2">
        <span
          className="inline-block size-3 rounded-sm"
          style={{ background: ORIGIN }}
        />
        <span className="text-muted-foreground">Origem (Acre)</span>
      </div>
      <div className="flex items-center gap-2">
        <span
          className="inline-block size-3 rounded-sm border"
          style={{ background: NO_DATA }}
        />
        <span className="text-muted-foreground">Sem evasão</span>
      </div>
    </div>
  );
}

"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

interface Props {
  years: number[];
  value: number;
  onChange: (year: number) => void;
  className?: string;
}

// Slider de linha do tempo: arraste para mudar o ano exibido no mapa.
// Usa <input type="range"> nativo (arrastável e acessível), estilizado via
// globals.css (.year-slider). O ano selecionado flutua acima do cursor.
// Os anos sao inteiros consecutivos -> step=1.
export function YearSlider({ years, value, onChange, className }: Props) {
  if (years.length === 0) return null;

  const min = years[0];
  const max = years[years.length - 1];
  const span = Math.max(1, max - min);
  const pct = ((value - min) / span) * 100;

  return (
    <div className={cn("w-full select-none", className)}>
      {/* Rótulo e balão do ano compartilham a mesma faixa (o rótulo à esquerda,
          o balão flutuando sobre o thumb), economizando uma linha de altura.
          O inset de 8px alinha o balão ao centro do thumb (raio ~8px). */}
      <div className="relative pt-6">
        <span className="text-muted-foreground absolute top-1 left-0 text-[10px] font-semibold tracking-wider uppercase">
          Linha do tempo
        </span>
        <div className="pointer-events-none absolute inset-x-[8px] top-0 h-6">
          <span
            className="bg-brand text-brand-foreground ring-card absolute -translate-x-1/2 rounded-md px-2 py-0.5 text-xs font-bold tabular-nums shadow-md ring-2"
            style={{ left: `${pct}%` }}
          >
            {value}
            <span className="bg-brand absolute top-full left-1/2 -mt-1 size-2 -translate-x-1/2 rotate-45" />
          </span>
        </div>

        <input
          type="range"
          min={min}
          max={max}
          step={1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label="Selecionar ano"
          className="year-slider w-full"
          style={{ "--pct": `${pct}%` } as React.CSSProperties}
        />
      </div>

      {/* Marcas de ano: tracinho por ano (alinhados pelo topo), extremos
          rotulados. items-start mantem todos os tracinhos na mesma linha. */}
      <div className="mt-0.5 flex items-start justify-between px-[8px]">
        {years.map((y) => {
          const active = y === value;
          const edge = y === min || y === max;
          return (
            <div key={y} className="flex flex-col items-center gap-1">
              <span
                className={cn(
                  "w-1 rounded-full transition-all",
                  active ? "bg-brand h-2.5" : "bg-border h-1.5",
                )}
              />
              {edge && (
                <span className="text-muted-foreground text-[10px] tabular-nums">
                  {y}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

import * as React from "react";

// Heatmap de correlação simples (-1 a 1). Vermelho = negativo, azul = positivo.
function cellColor(v: number): string {
  const a = Math.min(Math.abs(v), 1);
  if (v >= 0) return `rgba(59, 130, 246, ${0.12 + a * 0.78})`; // azul
  return `rgba(239, 68, 68, ${0.12 + a * 0.78})`; // vermelho
}

export function CorrHeatmap({
  labels,
  matrix,
  display,
}: {
  labels: string[];
  matrix: number[][];
  display?: string[];
}) {
  const heads = display ?? labels;
  return (
    <div className="overflow-x-auto">
      <table className="border-separate border-spacing-1 text-xs">
        <thead>
          <tr>
            <th className="p-1" />
            {heads.map((l) => (
              <th
                key={l}
                className="text-muted-foreground p-1 text-center font-medium"
              >
                {l}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.map((row, i) => (
            <tr key={i}>
              <td className="text-muted-foreground pr-2 text-right font-medium">
                {heads[i]}
              </td>
              {row.map((v, j) => (
                <td
                  key={j}
                  className="h-11 w-14 rounded text-center font-medium tabular-nums"
                  style={{
                    backgroundColor: cellColor(v),
                    color: Math.abs(v) > 0.55 ? "#fff" : "inherit",
                  }}
                  title={`${heads[i]} × ${heads[j]}: ${v.toFixed(3)}`}
                >
                  {v.toFixed(2)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

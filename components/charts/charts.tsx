"use client";

import * as React from "react";
import {
  Area,
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  LabelList,
  Legend,
  Line,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { PieLabelRenderProps } from "recharts";

import { fmtInt } from "@/lib/format";

const AXIS = "currentColor";

type Fmt = (v: number) => string;

const tickStyle = { fill: "currentColor", fontSize: 11, opacity: 0.85 };

// ---- Tooltip pt-BR ---------------------------------------------------------
function ChartTooltip({
  active,
  payload,
  label,
  fmt,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; color?: string }>;
  label?: string | number;
  fmt?: Fmt;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const f = fmt ?? ((v: number) => fmtInt(v));
  return (
    <div className="bg-popover text-popover-foreground rounded-lg border px-3 py-2 text-xs shadow-md">
      {label !== undefined && (
        <p className="mb-1 font-medium">{String(label)}</p>
      )}
      <div className="space-y-0.5">
        {payload.map((p, i) => (
          <div key={i} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5">
              <span
                className="inline-block size-2 rounded-full"
                style={{ backgroundColor: p.color }}
              />
              {p.name}
            </span>
            <span className="font-medium tabular-nums">
              {p.value === null || p.value === undefined ? "—" : f(p.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

const legendStyle = { fontSize: 12 };

function SparklineTooltip({
  active,
  payload,
  fmt,
}: {
  active?: boolean;
  payload?: Array<{ value?: number | null }>;
  fmt?: Fmt;
}) {
  const value = payload?.[0]?.value;
  if (!active || value === null || value === undefined) return null;
  const f = fmt ?? ((v: number) => fmtInt(v));

  return (
    <div className="bg-popover text-popover-foreground rounded-md border px-2 py-1 text-xs font-medium tabular-nums shadow-md">
      {f(value)}
    </div>
  );
}

// ---- Composição flexível: barras (empilháveis) + linhas -------------------
export interface SeriesDef {
  key: string;
  name: string;
  color: string;
  stackId?: string;
  yAxisId?: "left" | "right";
  dashed?: boolean;
  type?: "monotone" | "linear";
  /** Mostra o valor de cada ponto sobre a linha. */
  labels?: boolean;
  /** Formatação dos rótulos (default: valor cru). */
  labelFmt?: Fmt;
  /** Cor dos rótulos (default: escura, alto contraste). */
  labelColor?: string;
}

export function ComposedTrend({
  data,
  xKey,
  bars = [],
  lines = [],
  areas = [],
  height = 320,
  fill = false,
  leftFmt,
  rightFmt,
  tooltipFmt,
  refLines = [],
  rightAxis = false,
}: {
  data: Record<string, unknown>[];
  xKey: string;
  bars?: SeriesDef[];
  lines?: SeriesDef[];
  areas?: SeriesDef[];
  height?: number;
  fill?: boolean;
  leftFmt?: Fmt;
  rightFmt?: Fmt;
  tooltipFmt?: Fmt;
  refLines?: Array<{
    y: number;
    label: string;
    color?: string;
    axis?: "left" | "right";
  }>;
  rightAxis?: boolean;
}) {
  return (
    <div
      className={`text-muted-foreground w-full${fill ? " h-full min-h-[320px]" : ""}`}
      style={fill ? undefined : { height }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={data}
          margin={{ top: 8, right: rightAxis ? 8 : 12, left: 0, bottom: 0 }}
        >
          <CartesianGrid
            stroke={AXIS}
            strokeOpacity={0.15}
            vertical={false}
          />
          <XAxis
            dataKey={xKey}
            tick={tickStyle}
            tickLine={false}
            axisLine={{ stroke: AXIS, strokeOpacity: 0.2 }}
            minTickGap={16}
          />
          <YAxis
            yAxisId="left"
            tick={tickStyle}
            tickLine={false}
            axisLine={false}
            width={52}
            tickFormatter={leftFmt}
          />
          {rightAxis && (
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={tickStyle}
              tickLine={false}
              axisLine={false}
              width={48}
              tickFormatter={rightFmt}
            />
          )}
          <Tooltip
            content={<ChartTooltip fmt={tooltipFmt} />}
            cursor={{ fill: "currentColor", fillOpacity: 0.06 }}
          />
          <Legend wrapperStyle={legendStyle} />
          {refLines.map((r, i) => (
            <ReferenceLine
              key={i}
              yAxisId={r.axis ?? "left"}
              y={r.y}
              stroke={r.color ?? "#ef4444"}
              strokeDasharray="4 4"
              label={{
                value: r.label,
                position: "insideTopRight",
                fill: r.color ?? "#ef4444",
                fontSize: 10,
              }}
            />
          ))}
          {areas.map((s) => (
            <Area
              key={s.key}
              yAxisId={s.yAxisId ?? "left"}
              type={s.type ?? "monotone"}
              dataKey={s.key}
              name={s.name}
              stroke={s.color}
              fill={s.color}
              fillOpacity={0.18}
              strokeWidth={2}
              stackId={s.stackId}
              dot={false}
            />
          ))}
          {bars.map((s) => (
            <Bar
              key={s.key}
              yAxisId={s.yAxisId ?? "left"}
              dataKey={s.key}
              name={s.name}
              fill={s.color}
              stackId={s.stackId}
              radius={s.stackId ? [0, 0, 0, 0] : [3, 3, 0, 0]}
              maxBarSize={48}
            />
          ))}
          {lines.map((s) => (
            <Line
              key={s.key}
              yAxisId={s.yAxisId ?? "left"}
              type={s.type ?? "monotone"}
              dataKey={s.key}
              name={s.name}
              stroke={s.color}
              strokeWidth={2.5}
              strokeDasharray={s.dashed ? "5 4" : undefined}
              dot={s.labels ? { r: 2.5, fill: s.color, strokeWidth: 0 } : false}
              connectNulls
            >
              {s.labels && (
                <LabelList
                  dataKey={s.key}
                  position="top"
                  offset={8}
                  fill={s.labelColor ?? "#0f172a"}
                  fontSize={10}
                  fontWeight={700}
                  formatter={
                    s.labelFmt
                      ? (v) => {
                          const n = typeof v === "number" ? v : Number(v);
                          return v == null || Number.isNaN(n)
                            ? ""
                            : s.labelFmt!(n);
                        }
                      : undefined
                  }
                />
              )}
            </Line>
          ))}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

// ---- Sparkline (mini série temporal para KPI cards) -----------------------
export function Sparkline({
  data,
  color = "#3b82f6",
  height = 38,
  fmt,
}: {
  data: (number | null)[];
  color?: string;
  height?: number;
  fmt?: Fmt;
}) {
  const id = React.useId();
  const chartData = data.map((v, i) => ({ i, v }));
  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={chartData}
          margin={{ top: 4, right: 0, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id={`spark-${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.28} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="i" hide />
          <YAxis hide domain={["dataMin", "dataMax"]} />
          <Tooltip
            content={<SparklineTooltip fmt={fmt} />}
            cursor={{ stroke: color, strokeOpacity: 0.2 }}
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            dataKey="v"
            stroke="none"
            fill={`url(#spark-${id})`}
            connectNulls
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={2}
            dot={false}
            connectNulls
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

// ---- Barras horizontais (ranking) -----------------------------------------
export function HBars({
  data,
  labelKey,
  valueKey,
  color = "#3b82f6",
  height = 320,
  fmt,
}: {
  data: Record<string, unknown>[];
  labelKey: string;
  valueKey: string;
  color?: string;
  height?: number;
  fmt?: Fmt;
}) {
  return (
    <div className="text-muted-foreground w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          layout="vertical"
          data={data}
          margin={{ top: 4, right: 16, left: 8, bottom: 0 }}
        >
          <CartesianGrid stroke={AXIS} strokeOpacity={0.15} horizontal={false} />
          <XAxis
            type="number"
            tick={tickStyle}
            tickLine={false}
            axisLine={false}
            tickFormatter={fmt}
          />
          <YAxis
            type="category"
            dataKey={labelKey}
            tick={tickStyle}
            tickLine={false}
            axisLine={false}
            width={92}
          />
          <Tooltip
            content={<ChartTooltip fmt={fmt} />}
            cursor={{ fill: "currentColor", fillOpacity: 0.06 }}
          />
          <Bar dataKey={valueKey} name="Total" radius={[0, 4, 4, 0]} maxBarSize={26}>
            {data.map((_, i) => (
              <Cell key={i} fill={color} />
            ))}
          </Bar>
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

// ---- Donut -----------------------------------------------------------------
export function Donut({
  data,
  nameKey,
  valueKey,
  colors,
  height = 300,
  fmt,
}: {
  data: Record<string, unknown>[];
  nameKey: string;
  valueKey: string;
  colors: string[];
  height?: number;
  fmt?: Fmt;
}) {
  const f = fmt ?? ((v: number) => fmtInt(v));
  const RADIAN = Math.PI / 180;

  const renderLabel = (props: PieLabelRenderProps) => {
    const cx = Number(props.cx);
    const cy = Number(props.cy);
    const midAngle = Number(props.midAngle);
    const outerRadius = Number(props.outerRadius);
    const value = Number((props as { value?: number }).value);
    const r = outerRadius + 14;
    const x = cx + r * Math.cos(-midAngle * RADIAN);
    const y = cy + r * Math.sin(-midAngle * RADIAN);
    return (
      <text
        x={x}
        y={y}
        fill="currentColor"
        fontSize={11}
        fontWeight={600}
        textAnchor={x > cx ? "start" : "end"}
        dominantBaseline="central"
      >
        {f(value)}
      </text>
    );
  };

  return (
    <div className="text-muted-foreground w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <Pie
            data={data}
            dataKey={valueKey}
            nameKey={nameKey}
            innerRadius="52%"
            outerRadius="72%"
            paddingAngle={2}
            stroke="transparent"
            label={renderLabel}
            labelLine={{ stroke: "currentColor", strokeOpacity: 0.3 }}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={colors[i % colors.length]} />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltip fmt={fmt} />} />
          <Legend wrapperStyle={legendStyle} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

// ---- Fan chart (bandas de incerteza P10–P90 / P25–P75 + mediana) ----------
// Cada linha de `data` deve conter, alem do xKey:
//   historico?: number | null     -> linha cheia (observado)
//   mediana?:   number | null     -> linha tracejada (previsao central)
//   banda80?:   [number, number]  -> faixa P10–P90 (par [inferior, superior])
//   banda50?:   [number, number]  -> faixa P25–P75
function BandTooltip({
  active,
  payload,
  label,
  fmt,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number | number[]; color?: string; dataKey?: string }>;
  label?: string | number;
  fmt?: Fmt;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const f = fmt ?? ((v: number) => fmtInt(v));
  const row = (
    name: string,
    value: number | number[] | undefined,
    color?: string,
  ) => {
    if (value === undefined || value === null) return null;
    const text = Array.isArray(value)
      ? `${f(value[0])} – ${f(value[1])}`
      : f(value as number);
    return (
      <div className="flex items-center justify-between gap-4">
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-2 rounded-full" style={{ backgroundColor: color }} />
          {name}
        </span>
        <span className="font-medium tabular-nums">{text}</span>
      </div>
    );
  };
  const get = (k: string) => payload.find((p) => p.dataKey === k)?.value;
  return (
    <div className="bg-popover text-popover-foreground rounded-lg border px-3 py-2 text-xs shadow-md">
      {label !== undefined && <p className="mb-1 font-medium">{String(label)}</p>}
      <div className="space-y-0.5">
        {row("Observado", get("historico") as number | undefined, "#3b82f6")}
        {row("Mediana", get("mediana") as number | undefined, "#ef4444")}
        {row("P25–P75", get("banda50") as number[] | undefined, "#f59e0b")}
        {row("P10–P90", get("banda80") as number[] | undefined, "#94a3b8")}
      </div>
    </div>
  );
}

export function FanChart({
  data,
  xKey,
  height = 340,
  leftFmt,
  tooltipFmt,
  color = "#ef4444",
  refLines = [],
}: {
  data: Record<string, unknown>[];
  xKey: string;
  height?: number;
  leftFmt?: Fmt;
  tooltipFmt?: Fmt;
  color?: string;
  refLines?: Array<{ y: number; label: string; color?: string }>;
}) {
  return (
    <div className="text-muted-foreground w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={AXIS} strokeOpacity={0.15} vertical={false} />
          <XAxis
            dataKey={xKey}
            tick={tickStyle}
            tickLine={false}
            axisLine={{ stroke: AXIS, strokeOpacity: 0.2 }}
            minTickGap={16}
          />
          <YAxis
            tick={tickStyle}
            tickLine={false}
            axisLine={false}
            width={52}
            tickFormatter={leftFmt}
          />
          <Tooltip content={<BandTooltip fmt={tooltipFmt} />} cursor={{ stroke: AXIS, strokeOpacity: 0.2 }} />
          <Legend wrapperStyle={legendStyle} />
          {refLines.map((r, i) => (
            <ReferenceLine
              key={i}
              y={r.y}
              stroke={r.color ?? "#ef4444"}
              strokeDasharray="4 4"
              label={{ value: r.label, position: "insideTopRight", fill: r.color ?? "#ef4444", fontSize: 10 }}
            />
          ))}
          {/* faixa larga P10–P90 (clara) e estreita P25–P75 (média) */}
          <Area
            dataKey="banda80"
            name="P10–P90"
            stroke="none"
            fill={color}
            fillOpacity={0.12}
            connectNulls
            isAnimationActive={false}
            activeDot={false}
          />
          <Area
            dataKey="banda50"
            name="P25–P75"
            stroke="none"
            fill={color}
            fillOpacity={0.22}
            connectNulls
            isAnimationActive={false}
            activeDot={false}
          />
          <Line
            type="monotone"
            dataKey="mediana"
            name="Mediana / previsão"
            stroke={color}
            strokeWidth={2.5}
            strokeDasharray="5 4"
            dot={false}
            connectNulls
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="historico"
            name="Observado"
            stroke="#3b82f6"
            strokeWidth={2.5}
            dot={false}
            connectNulls
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

// ---- Scatter + reta de regressão ------------------------------------------
export function ScatterReg({
  points,
  line,
  height = 340,
  xName = "x",
  yName = "y",
  xFmt,
  yFmt,
}: {
  points: { x: number; y: number }[];
  line: { x: number; y: number }[];
  height?: number;
  xName?: string;
  yName?: string;
  xFmt?: Fmt;
  yFmt?: Fmt;
}) {
  return (
    <div className="text-muted-foreground w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 8, right: 16, left: 4, bottom: 8 }}>
          <CartesianGrid stroke={AXIS} strokeOpacity={0.15} />
          <XAxis
            type="number"
            dataKey="x"
            name={xName}
            tick={tickStyle}
            tickLine={false}
            axisLine={{ stroke: AXIS, strokeOpacity: 0.2 }}
            tickFormatter={xFmt}
            domain={["auto", "auto"]}
          />
          <YAxis
            type="number"
            dataKey="y"
            name={yName}
            tick={tickStyle}
            tickLine={false}
            axisLine={false}
            width={56}
            tickFormatter={yFmt}
            domain={["auto", "auto"]}
          />
          <Tooltip
            content={<ChartTooltip fmt={yFmt} />}
            cursor={{ strokeDasharray: "3 3" }}
          />
          <Scatter
            data={line}
            line={{ stroke: "#ef4444", strokeWidth: 2 }}
            shape={() => <></>}
            name="Regressão"
            isAnimationActive={false}
          />
          <Scatter data={points} fill="#3b82f6" name={yName} />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

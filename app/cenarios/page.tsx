"use client";

import { estrutural, montecarlo, CENARIO_ORDEM, CHART } from "@/lib/data";
import type { CenarioEstrutural, CenarioMonteCarlo } from "@/lib/data";
import { fmtInt, fmtCompact, fmtPct } from "@/lib/format";
import { PageHeader, ChartCard } from "@/components/page-header";
import { ComposedTrend, FanChart } from "@/components/charts/charts";
import { KpiCard, type Tone } from "@/components/kpi-card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Factory, TrendUp, Minus, Warning } from "@phosphor-icons/react";

// Aparência por cenário (do mais virtuoso ao mais crítico).
const ESTILO: Record<
  string,
  { tone: Tone; cor: string; icon: typeof Factory }
> = {
  industrializacao: { tone: "success", cor: CHART.verde, icon: Factory },
  retencao_moderada: { tone: "success", cor: CHART.ciano, icon: Minus },
  continuidade: { tone: "warning", cor: CHART.ambar, icon: Minus },
  pressao_externa: { tone: "danger", cor: CHART.vermelho, icon: TrendUp },
};

const RISCO_LABEL: Record<string, string> = {
  evasao_acima_50: "Evasão acima de 50%",
  export_supera_abate: "Exportação supera o abate",
  utilizacao_abaixo_60: "Utilização industrial < 60%",
  abates_abaixo_500k: "Abates locais < 500 mil",
};

function fanData(mc: CenarioMonteCarlo, baseEvasao: number) {
  const rows: Record<string, unknown>[] = [
    {
      ano: "2025",
      historico: baseEvasao,
      mediana: baseEvasao,
      banda80: [baseEvasao, baseEvasao],
      banda50: [baseEvasao, baseEvasao],
    },
  ];
  for (const f of mc.fan) {
    rows.push({
      ano: String(f.ano),
      historico: null,
      mediana: f.evasao.mediana,
      banda80: [f.evasao.p10, f.evasao.p90],
      banda50: [f.evasao.p25, f.evasao.p75],
    });
  }
  return rows;
}

function PercentilTabela({ mc }: { mc: CenarioMonteCarlo }) {
  const linhas: { label: string; chave: keyof CenarioMonteCarlo["percentis_2030"]; pct?: boolean }[] = [
    { label: "Taxa de evasão", chave: "evasao", pct: true },
    { label: "Abates locais", chave: "abates" },
    { label: "Exportação em pé", chave: "export" },
    { label: "Utilização industrial", chave: "utilizacao", pct: true },
    { label: "Empregos em risco", chave: "empregos_risco" },
  ];
  const f = (v: number, pct?: boolean) => (pct ? `${fmtInt(v)}%` : fmtInt(v));
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Indicador (2030)</TableHead>
          <TableHead className="text-right">P10</TableHead>
          <TableHead className="text-right">Mediana</TableHead>
          <TableHead className="text-right">P90</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {linhas.map((l) => {
          const p = mc.percentis_2030[l.chave];
          return (
            <TableRow key={l.chave}>
              <TableCell className="font-medium">{l.label}</TableCell>
              <TableCell className="text-right tabular-nums">{f(p.p10, l.pct)}</TableCell>
              <TableCell className="text-right font-semibold tabular-nums">
                {f(p.mediana, l.pct)}
              </TableCell>
              <TableCell className="text-right tabular-nums">{f(p.p90, l.pct)}</TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function Tornado({ mc }: { mc: CenarioMonteCarlo }) {
  const max = Math.max(...mc.tornado.map((t) => Math.abs(t.correlacao || 0)), 0.01);
  return (
    <div className="space-y-2.5 py-2">
      {mc.tornado.map((t) => {
        const v = t.correlacao || 0;
        const w = (Math.abs(v) / max) * 100;
        const pos = v >= 0;
        return (
          <div key={t.fator} className="flex items-center gap-3 text-sm">
            <span className="w-48 shrink-0 text-muted-foreground">{t.label}</span>
            <div className="relative h-4 flex-1 rounded bg-muted">
              <div
                className="absolute inset-y-0 left-0 rounded"
                style={{
                  width: `${w}%`,
                  backgroundColor: pos ? CHART.vermelho : CHART.verde,
                  opacity: 0.85,
                }}
              />
            </div>
            <span className="w-12 shrink-0 text-right font-medium tabular-nums">
              {v.toFixed(2)}
            </span>
          </div>
        );
      })}
      <p className="text-muted-foreground pt-1 text-xs">
        Correlação de cada premissa com a evasão de 2030 nas simulações. Vermelho =
        eleva a evasão; verde = reduz. Quanto maior a barra, mais decisivo o fator.
      </p>
    </div>
  );
}

function CenarioPainel({
  est,
  mc,
  baseEvasao,
}: {
  est: CenarioEstrutural;
  mc: CenarioMonteCarlo;
  baseEvasao: number;
}) {
  const estilo = ESTILO[mcKey(est.nome)];
  const ev = mc.percentis_2030.evasao;
  const topo = mc.tornado.slice(0, 3).map((t) => t.label);
  const prob = mc.riscos.evasao_acima_50;
  return (
    <div className="space-y-6">
      {/* Narrativa técnica */}
      <div className="bg-card rounded-xl border p-5 text-sm">
        <p className="text-muted-foreground">{est.descricao}</p>
        <p className="mt-3">
          <strong className="text-foreground">
            Sob estas premissas, a evasão mediana em 2030 é {ev.mediana}%, com faixa
            provável entre {ev.p10}% e {ev.p90}%.
          </strong>{" "}
          Probabilidade de evasão crítica ({">"}50%):{" "}
          <strong className="text-foreground">{Math.round(prob * 100)}%</strong>. Os
          fatores mais decisivos são {topo.join(", ")}.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {est.drivers.map((d) => (
            <Badge key={d} variant="outline">
              {d}
            </Badge>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Premissa label="Propensão a exportar (2030)" valor={`${est.premissas_2030.propensao_exportar_pct}%`} />
          <Premissa label="Taxa de desfrute (2030)" valor={`${est.premissas_2030.taxa_desfrute_pct}%`} />
          <Premissa label="Capacidade industrial (CAGR)" valor={`${est.premissas_2030.capacidade_cagr_pct}%/ano`} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartCard
          title="Evasão 2026–2030 — faixa de incerteza"
          description="Fan chart das simulações de Monte Carlo: mediana (tracejada), P25–P75 (escuro) e P10–P90 (claro). A faixa se alarga com o horizonte — incerteza honesta, sem falsa precisão."
          footer={`${montecarlo.n_sims.toLocaleString("pt-BR")} simulações · limiares de alerta 30% e crítico 50%.`}
        >
          <FanChart
            data={fanData(mc, baseEvasao)}
            xKey="ano"
            height={320}
            color={estilo.cor}
            leftFmt={(v) => `${v}%`}
            tooltipFmt={(v) => `${fmtInt(v)}%`}
            refLines={[
              { y: 30, label: "alerta", color: CHART.ambar },
              { y: 50, label: "crítico", color: CHART.vermelho },
            ]}
          />
        </ChartCard>

        <ChartCard
          title="Percentis dos indicadores em 2030"
          description="Faixas plausíveis (P10 · mediana · P90) de cada indicador, propagando a incerteza das premissas."
          footer="Empregos em risco = queda do abate local frente a 2025 × empregos por cabeça (RAIS)."
        >
          <PercentilTabela mc={mc} />
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartCard
          title="Probabilidades de risco em 2030"
          description="Probabilidade de cada evento ocorrer, dada a incerteza nas premissas."
        >
          <div className="space-y-3 py-2">
            {Object.entries(mc.riscos).map(([k, v]) => (
              <div key={k} className="flex items-center gap-3 text-sm">
                <span className="w-52 shrink-0 text-muted-foreground">
                  {RISCO_LABEL[k] ?? k}
                </span>
                <div className="relative h-4 flex-1 rounded bg-muted">
                  <div
                    className="absolute inset-y-0 left-0 rounded"
                    style={{
                      width: `${Math.round(v * 100)}%`,
                      backgroundColor: v >= 0.5 ? CHART.vermelho : v >= 0.2 ? CHART.ambar : CHART.verde,
                    }}
                  />
                </div>
                <span className="w-12 shrink-0 text-right font-semibold tabular-nums">
                  {Math.round(v * 100)}%
                </span>
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard
          title="Fatores de incerteza (tornado)"
          description="Ranking dos fatores que mais influenciam a evasão de 2030."
        >
          <Tornado mc={mc} />
        </ChartCard>
      </div>
    </div>
  );
}

function Premissa({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="bg-muted/40 rounded-lg border px-3 py-2">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="mt-0.5 text-lg font-bold tabular-nums">{valor}</p>
    </div>
  );
}

// Mapeia o nome exibido de volta à chave do cenário (estilo/cores).
function mcKey(nome: string): string {
  const map: Record<string, string> = {
    "Industrializacao local": "industrializacao",
    "Industrialização local": "industrializacao",
    "Retencao moderada": "retencao_moderada",
    "Retenção moderada": "retencao_moderada",
    "Continuidade": "continuidade",
    "Pressao externa": "pressao_externa",
    "Pressão externa": "pressao_externa",
  };
  return map[nome] ?? "continuidade";
}

export default function CenariosPage() {
  const base = estrutural.baseline_2025;

  // Comparação das trajetórias medianas de evasão entre cenários (estrutural).
  const anos = [2025, ...estrutural.cenarios.continuidade.trajetoria.map((t) => t.ano)];
  const comparacao = anos.map((ano) => {
    const row: Record<string, number | string> = { ano };
    for (const chave of CENARIO_ORDEM) {
      const c = estrutural.cenarios[chave];
      row[c.nome] =
        ano === 2025 ? base.evasao : c.trajetoria.find((t) => t.ano === ano)!.evasao;
    }
    return row;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cenários 2030"
        subtitle="Projeções estruturais e probabilísticas até 2030. Em vez de taxas fixas, um modelo de estoque-fluxo da cadeia bovina (rebanho → oferta → demanda industrial → exportação) sob quatro cenários, com a incerteza das premissas propagada por Monte Carlo. O dashboard comunica faixas plausíveis, não um número pontual."
      />

      <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm">
        <p className="flex items-start gap-2 text-muted-foreground">
          <Warning weight="duotone" className="mt-0.5 size-4 shrink-0 text-[var(--warning)]" />
          <span>
            <strong className="text-foreground">Nota metodológica:</strong> não é
            previsão de série temporal (essa está em <em>Previsão de curto prazo</em>).
            São cenários condicionais — “o que precisa acontecer no sistema produtivo”
            para a evasão cair, manter-se ou subir. O modelo de estoque reproduz o
            rebanho histórico 2015–2024 com erro médio de {estrutural.validacao.mape_rebanho}%.
          </span>
        </p>
      </div>

      {/* KPIs: evasão mediana 2030 por cenário (Monte Carlo) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {CENARIO_ORDEM.map((chave) => {
          const mc = montecarlo.cenarios[chave];
          const estilo = ESTILO[chave];
          const ev = mc.percentis_2030.evasao;
          return (
            <KpiCard
              key={chave}
              label={`${mc.nome} — evasão 2030`}
              value={fmtPct(ev.mediana)}
              hint={`faixa ${ev.p10}%–${ev.p90}%`}
              tone={estilo.tone}
              icon={estilo.icon}
            />
          );
        })}
      </div>

      <ChartCard
        title="Comparação entre cenários — trajetória da evasão (mediana)"
        description="Trajetória anual 2026–2030 da taxa de evasão em cada cenário estrutural, partindo da base de 2025 (36,3%)."
        footer="Linhas: evasão mediana por cenário. Limiar crítico em 50%."
      >
        <ComposedTrend
          data={comparacao}
          xKey="ano"
          height={340}
          lines={CENARIO_ORDEM.map((chave) => ({
            key: estrutural.cenarios[chave].nome,
            name: estrutural.cenarios[chave].nome,
            color: ESTILO[chave].cor,
          }))}
          leftFmt={(v) => `${v}%`}
          tooltipFmt={(v) => `${fmtInt(v)}%`}
          refLines={[{ y: 50, label: "crítico 50%", color: CHART.vermelho }]}
        />
      </ChartCard>

      <Tabs defaultValue="continuidade">
        <TabsList className="flex-wrap">
          {CENARIO_ORDEM.map((chave) => (
            <TabsTrigger key={chave} value={chave}>
              {estrutural.cenarios[chave].nome}
            </TabsTrigger>
          ))}
        </TabsList>
        {CENARIO_ORDEM.map((chave) => (
          <TabsContent key={chave} value={chave} className="mt-4">
            <CenarioPainel
              est={estrutural.cenarios[chave]}
              mc={montecarlo.cenarios[chave]}
              baseEvasao={base.evasao}
            />
          </TabsContent>
        ))}
      </Tabs>

      <ChartCard
        title="Validação do modelo estrutural — rebanho 2015–2024"
        description="O modelo de estoque-fluxo, alimentado com a retirada observada (abate + exportação) de cada ano, reproduz a trajetória do rebanho do IBGE."
        footer={`Erro médio absoluto percentual (MAPE) do rebanho = ${estrutural.validacao.mape_rebanho}%. Premissas: natalidade ${estrutural.parametros_base.taxa_natal_pct}%, mortalidade ${estrutural.parametros_base.taxa_mort_pct}%.`}
      >
        <ComposedTrend
          data={estrutural.validacao.serie.map((s) => ({
            ano: s.ano,
            Observado: s.rebanho_real,
            Modelo: s.rebanho_modelo,
          }))}
          xKey="ano"
          height={300}
          lines={[
            { key: "Observado", name: "Rebanho observado (IBGE)", color: CHART.azul },
            { key: "Modelo", name: "Rebanho modelado", color: CHART.violeta, dashed: true },
          ]}
          leftFmt={(v) => fmtCompact(v)}
          tooltipFmt={(v) => fmtInt(v)}
        />
      </ChartCard>
    </div>
  );
}

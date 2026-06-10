"use client";

import * as React from "react";
import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { forecast, CHART } from "@/lib/data";
import type { SerieForecast } from "@/lib/data";
import { fmtInt, fmtCompact, fmtMesAno } from "@/lib/format";
import { PageHeader, ChartCard } from "@/components/page-header";
import { FanChart } from "@/components/charts/charts";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

// Quantos meses de historico mostrar antes do forecast (legibilidade).
const HIST_DESDE = "2021-01-01";

type FanRow = Record<string, unknown>;

// Junta historico + forecast num unico array para o fan chart, conectando a
// mediana ao ultimo ponto observado.
function montarFan(s: SerieForecast): FanRow[] {
  const hist = s.history.filter((h) => h.data >= HIST_DESDE);
  const rows: FanRow[] = hist.map((h) => ({
    rotulo: fmtMesAno(h.data),
    historico: h.valor,
    mediana: null,
    banda80: null,
    banda50: null,
  }));
  const ultimo = hist[hist.length - 1];
  if (ultimo) {
    const r = rows[rows.length - 1];
    r.mediana = ultimo.valor;
    r.banda80 = [ultimo.valor, ultimo.valor];
    r.banda50 = [ultimo.valor, ultimo.valor];
  }
  for (const f of s.forecast) {
    rows.push({
      rotulo: fmtMesAno(f.data),
      historico: null,
      mediana: f.mean,
      banda80: [f.p10, f.p90],
      banda50: [f.p25, f.p75],
    });
  }
  return rows;
}

// Especificacao matematica do modelo Holt-Winters aditivo, fiel a _hw_add /
// prever_serie em scripts/build_models.py (periodo m = 12).
function Eq({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2">
      <span className="text-muted-foreground w-24 shrink-0 text-[11px] font-medium uppercase tracking-wide">
        {label}
      </span>
      <code className="font-mono text-[13px] leading-relaxed tracking-tight text-foreground">
        {children}
      </code>
    </div>
  );
}

function EqGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-lg border">
      <p className="bg-brand text-brand-foreground border-b border-black/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide">
        {title}
      </p>
      <div className="divide-y">{children}</div>
    </div>
  );
}

function VarDef({ sym, children }: { sym: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3 px-3 py-2 text-sm">
      <dt className="bg-muted text-foreground inline-flex h-6 min-w-14 shrink-0 items-center justify-center rounded-md border px-2 font-mono text-xs">
        {sym}
      </dt>
      <dd className="text-muted-foreground pt-0.5 text-[13px] leading-snug">
        {children}
      </dd>
    </div>
  );
}

function PassoCard({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-lg border p-4">
      <div className="mb-2 flex items-center gap-2">
        <span className="bg-muted text-foreground inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border font-mono text-xs">
          {n}
        </span>
        <p className="text-sm font-semibold">{title}</p>
      </div>
      <p className="text-muted-foreground text-[13px] leading-relaxed">
        {children}
      </p>
    </div>
  );
}

function SlideEspecificacao() {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <EqGroup title="Recursões de suavização">
            <Eq label="Nível">
              ℓ<sub>t</sub> = α (y<sub>t</sub> − s<sub>t−m</sub>) + (1 − α)(ℓ<sub>t−1</sub> + b<sub>t−1</sub>)
            </Eq>
            <Eq label="Tendência">
              b<sub>t</sub> = β (ℓ<sub>t</sub> − ℓ<sub>t−1</sub>) + (1 − β) b<sub>t−1</sub>
            </Eq>
            <Eq label="Sazonalidade">
              s<sub>t</sub> = γ (y<sub>t</sub> − ℓ<sub>t</sub>) + (1 − γ) s<sub>t−m</sub>
            </Eq>
          </EqGroup>

          <EqGroup title="Previsão & intervalo">
            <Eq label="Ponto">
              ŷ<sub>t+h</sub> = max(0, ℓ<sub>t</sub> + h·b<sub>t</sub> + s<sub>t+h−m</sub>)
            </Eq>
            <Eq label="IP 80%">
              [ ŷ<sub>t+h</sub> + q<sub>0,10</sub>(e<sub>h</sub>) , ŷ<sub>t+h</sub> + q<sub>0,90</sub>(e<sub>h</sub>) ]
            </Eq>
            <Eq label="IP 50%">
              idem, com q<sub>0,25</sub> / q<sub>0,75</sub> (banda P25–P75)
            </Eq>
          </EqGroup>

          <EqGroup title="Evasão (escala logit)">
            <Eq label="Transformar">
              z<sub>t</sub> = ln( p<sub>t</sub> / (1 − p<sub>t</sub>) ), p<sub>t</sub> = evasão<sub>t</sub> / 100
            </Eq>
            <Eq label="Prever">
              Holt-Winters sobre z<sub>t</sub>, depois p̂ = 1 / (1 + e<sup>−ẑ</sup>)
            </Eq>
          </EqGroup>
        </div>

        <div className="overflow-hidden rounded-lg border">
          <p className="bg-brand text-brand-foreground border-b border-black/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide">
            Variáveis
          </p>
          <dl className="divide-y">
            <VarDef sym={<>y<sub>t</sub></>}>
              valor observado no mês t (cabeças): evasão ou abates
            </VarDef>
            <VarDef sym={<>ℓ<sub>t</sub></>}>nível suavizado da série</VarDef>
            <VarDef sym={<>b<sub>t</sub></>}>tendência (variação mensal do nível)</VarDef>
            <VarDef sym={<>s<sub>t</sub></>}>
              fator sazonal aditivo (ciclo de m = 12 meses)
            </VarDef>
            <VarDef sym="m">período sazonal = 12 (meses)</VarDef>
            <VarDef sym="α, β, γ">
              parâmetros de suavização (nível, tendência, sazonalidade), ∈ [0, 1]
            </VarDef>
            <VarDef sym="h">horizonte de previsão (1 a 24 meses)</VarDef>
            <VarDef sym={<>ŷ<sub>t+h</sub></>}>previsão h passos à frente</VarDef>
            <VarDef sym={<>e<sub>h</sub></>}>
              resíduos do backtest no horizonte h; q<sub>p</sub>(·) = quantil empírico p
            </VarDef>
          </dl>
        </div>
      </div>
  );
}

function SlideIntuicao() {
  return (
    <div className="space-y-4">
      <p className="text-muted-foreground max-w-[1536px] text-sm leading-relaxed">
        O modelo enxerga cada série mensal como a soma de três peças simples:
        um patamar, uma direção de movimento e um padrão que se repete todo ano.
        A cada novo mês de dados, essas três peças são atualizadas. Para prever
        o futuro, o modelo apenas projeta essas peças à frente e soma tudo.
      </p>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <PassoCard n={1} title="Nível (ℓ)">
          É o patamar atual da série, ou seja, em torno de que valor ela está
          rodando hoje, já tirando o efeito da época do ano. O parâmetro α define
          a sensibilidade: com α alto, o modelo reage rápido a cada novo mês; com
          α baixo, ele muda devagar e ignora oscilações passageiras.
        </PassoCard>
        <PassoCard n={2} title="Tendência (b)">
          É quanto o patamar sobe ou desce, em média, de um mês para o outro. É
          essa peça que faz a previsão crescer ou cair ao longo do tempo. O
          parâmetro β define a rapidez com que o modelo percebe que a série mudou
          de rumo.
        </PassoCard>
        <PassoCard n={3} title="Sazonalidade (s)">
          São doze ajustes, um para cada mês do ano, que capturam o calendário da
          atividade, como meses de pico de embarque ou de abate. O parâmetro γ
          define o quanto esse padrão se renova conforme chegam anos novos.
        </PassoCard>
      </div>
      <div className="rounded-lg border p-4">
        <p className="mb-1 text-sm font-semibold">
          Por que a versão &quot;aditiva&quot;?
        </p>
        <p className="text-muted-foreground text-[13px] leading-relaxed">
          Na versão aditiva, o efeito da época do ano é somado em quantidade fixa
          de cabeças, não em porcentagem. Isso funciona bem quando o vai e vem
          sazonal tem tamanho parecido independentemente de a série estar alta ou
          baixa. Também é a escolha segura aqui porque a evasão tem meses
          quase zerados no histórico, situação em que a versão multiplicativa
          (baseada em porcentagens) deixa de funcionar. Por fim, o modelo aplica
          um piso em zero para a previsão nunca sair negativa.
        </p>
      </div>
      <div className="rounded-lg border p-4">
        <p className="mb-1 text-sm font-semibold">E a taxa de evasão?</p>
        <p className="text-muted-foreground text-[13px] leading-relaxed">
          A taxa de evasão tem um modelo próprio, com um cuidado extra: como é uma taxa,
          ela precisa ficar sempre entre 0% e 100%. Para garantir isso, o modelo
          trabalha numa escala transformada chamada logit, que estica a taxa
          para uma reta sem limites. O Holt-Winters roda nessa escala e o
          resultado é convertido de volta para porcentagem, o que torna
          impossível prever valores absurdos como 110% ou abaixo de zero. Como
          checagem, a previsão é comparada com a taxa de evasão calculada a partir das
          previsões de evasão e abate, e as duas leituras contam histórias
          parecidas.
        </p>
      </div>
    </div>
  );
}

function SlideValidacao() {
  return (
    <div className="space-y-4">
      <p className="text-muted-foreground max-w-[1536px] text-sm leading-relaxed">
        Antes de gerar a previsão final, cada série passa por duas etapas: o
        ajuste automático dos parâmetros e um teste honesto em que o modelo tenta
        prever meses que ele ainda não conhecia. É desse teste que saem as faixas
        de incerteza mostradas nos gráficos.
      </p>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <PassoCard n={1} title="Ajuste dos parâmetros">
          O computador testa muitas combinações de α, β e γ e escolhe a que teria
          errado menos ao prever o mês seguinte dentro do próprio histórico. Não
          existe ajuste manual: o processo é totalmente automático e repetível.
        </PassoCard>
        <PassoCard n={2} title="Teste com o passado (backtesting)">
          O modelo é treinado só com os dados até certa data e tenta prever os
          meses seguintes, que ele não viu. Depois a data de corte avança e o
          teste se repete várias vezes. No fim, sabemos quanto o modelo costuma
          errar em cada distância de previsão.
        </PassoCard>
        <PassoCard n={3} title="Faixas de incerteza realistas">
          As faixas dos gráficos vêm direto dos erros observados nesse teste, e
          não de uma fórmula teórica. Se o modelo costuma errar mais ao prever
          meses distantes, a faixa fica naturalmente mais larga nesses meses.
        </PassoCard>
      </div>
      <div className="overflow-hidden rounded-lg border">
        <p className="bg-brand text-brand-foreground border-b border-black/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide">
          Como ler as métricas do rodapé dos gráficos
        </p>
        <dl className="divide-y">
          <VarDef sym="sMAPE">
            o tamanho típico do erro da previsão, em porcentagem, medido no teste
            com o passado. Quanto menor, melhor. Um sMAPE de 10% significa que a
            previsão central costuma errar cerca de 10% para cima ou para baixo.
          </VarDef>
          <VarDef sym="IP80">
            mede se a faixa de 80% está bem calibrada: é a porcentagem de meses
            do teste em que o valor real de fato caiu dentro da faixa. O ideal é
            ficar perto de 80%. Valores bem abaixo disso indicam que a faixa está
            estreita demais, ou seja, otimista.
          </VarDef>
        </dl>
      </div>
      <div className="rounded-lg border p-4">
        <p className="mb-1 text-sm font-semibold">Limitações</p>
        <p className="text-muted-foreground text-[13px] leading-relaxed">
          O modelo olha apenas para o histórico da própria série. Ele não enxerga
          fatores externos como câmbio, barreiras sanitárias ou mudanças de
          regras. Por isso, vale como leitura operacional de 3 a 24 meses, e não
          como projeção estrutural. Para o longo prazo, consulte a aba Cenários
          2030.
        </p>
      </div>
    </div>
  );
}

const SLIDES: { titulo: string; conteudo: ReactNode }[] = [
  { titulo: "Especificação matemática", conteudo: <SlideEspecificacao /> },
  { titulo: "Intuição dos componentes", conteudo: <SlideIntuicao /> },
  { titulo: "Calibração, validação e limites", conteudo: <SlideValidacao /> },
];

function ModeloHoltWinters() {
  const [slide, setSlide] = React.useState(0);
  const total = SLIDES.length;

  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      const alvo = e.target as HTMLElement | null;
      // Nao interceptar quando o foco esta em campos de texto ou nas abas
      // (as setas ja navegam entre abas do Radix).
      if (
        alvo &&
        (alvo.closest('input, textarea, select, [role="tablist"]') != null ||
          alvo.isContentEditable)
      ) {
        return;
      }
      e.preventDefault();
      setSlide((s) =>
        e.key === "ArrowLeft" ? (s - 1 + total) % total : (s + 1) % total
      );
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [total]);

  return (
    <ChartCard
      title="Especificação do modelo (Holt-Winters aditivo)"
      description="Suavização exponencial com nível, tendência e sazonalidade aditiva (período m = 12 meses). Evasão e abates são modelados em cabeças; a taxa de evasão é modelada em escala logit, que mantém a previsão entre 0% e 100%."
      footer="α, β, γ calibrados por busca em grade minimizando o SSE de previsão 1-passo. Intervalos empíricos a partir dos resíduos do backtesting de origem móvel. Fiel a scripts/build_models.py."
    >
      <div className="p-3">
        <div className="mb-4 flex items-center justify-between gap-3">
          <p className="text-sm font-semibold">
            <span className="text-muted-foreground font-mono text-xs">
              {slide + 1}/{total}
            </span>{" "}
            · {SLIDES[slide].titulo}
          </p>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground mr-1 hidden text-xs sm:inline">
              use as setas ← → do teclado
            </span>
            <div className="mr-1 flex items-center gap-1.5">
              {SLIDES.map((s, i) => (
                <button
                  key={s.titulo}
                  type="button"
                  aria-label={s.titulo}
                  onClick={() => setSlide(i)}
                  className={`h-1.5 rounded-full transition-all ${
                    i === slide
                      ? "bg-foreground w-5"
                      : "bg-muted-foreground/30 hover:bg-muted-foreground/60 w-1.5"
                  }`}
                />
              ))}
            </div>
            <button
              type="button"
              aria-label="Lâmina anterior"
              onClick={() => setSlide((s) => (s - 1 + total) % total)}
              className="text-muted-foreground hover:bg-muted hover:text-foreground inline-flex h-7 w-7 items-center justify-center rounded-md border transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Próxima lâmina"
              onClick={() => setSlide((s) => (s + 1) % total)}
              className="text-muted-foreground hover:bg-muted hover:text-foreground inline-flex h-7 w-7 items-center justify-center rounded-md border transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
        {SLIDES[slide].conteudo}
      </div>
    </ChartCard>
  );
}

function SerieTab({
  s,
  unidade,
  pct = false,
  refLines,
  children,
}: {
  s: SerieForecast;
  unidade: string;
  pct?: boolean;
  refLines?: { y: number; label: string; color: string }[];
  children?: ReactNode;
}) {
  const data = montarFan(s);
  const fmtVal = pct ? (v: number) => `${fmtInt(v)}%` : (v: number) => fmtInt(v);
  const fmtEixo = pct ? (v: number) => `${v}%` : (v: number) => fmtCompact(v);
  return (
    <div className="space-y-6">
      <ChartCard
        title={`Histórico + previsão — ${s.variavel.toLowerCase()}`}
        description={`Linha azul: observado. Linha tracejada: mediana prevista pelo modelo ${s.modelo}. Faixas: intervalo de previsão P25–P75 (escuro) e P10–P90 (claro).`}
        footer={`Modelo: ${s.modelo} · sMAPE ${s.smape?.toFixed(1)}% no backtesting de origem móvel · cobertura empírica do IP80 = ${
          s.cobertura_ip80 != null ? Math.round(s.cobertura_ip80 * 100) : "—"
        }%. ${unidade}`}
      >
        <FanChart
          data={data}
          xKey="rotulo"
          height={360}
          color={CHART.vermelho}
          leftFmt={fmtEixo}
          tooltipFmt={fmtVal}
          refLines={refLines}
        />
      </ChartCard>
      {children}
    </div>
  );
}

function FatoresEvasaoCard() {
  const fat = forecast.evasao.fatores;
  if (!fat) return null;
  const maxAbs = Math.max(
    ...fat.coeficientes.map((c) => Math.abs(c.coef_padronizado)),
    1e-9
  );
  return (
    <ChartCard
      title="O que move a taxa de evasão"
      description={`Análise complementar: regressão da taxa de evasão (em escala logit) sobre fatores padronizados, nos ${fat.n} meses com preços disponíveis. R² = ${fat.r2.toFixed(2)}. Não é o modelo de previsão; serve para entender direções e forças.`}
      footer="Barras para a direita aumentam a taxa de evasão; para a esquerda, reduzem. O tamanho da barra indica a força relativa do fator (coeficiente padronizado)."
    >
      <div className="space-y-3 p-3">
        {fat.coeficientes.map((c) => {
          const pos = c.coef_padronizado >= 0;
          const w = Math.max(4, (Math.abs(c.coef_padronizado) / maxAbs) * 100);
          return (
            <div key={c.fator} className="flex items-center gap-3">
              <span className="text-muted-foreground w-56 shrink-0 text-[13px] leading-snug">
                {c.label}
              </span>
              <div className="relative h-4 flex-1">
                <div className="bg-border absolute inset-y-0 left-1/2 w-px" />
                <div
                  className="absolute top-0 h-4 rounded-sm"
                  style={{
                    backgroundColor: pos ? CHART.vermelho : CHART.verde,
                    width: `${w / 2}%`,
                    left: pos ? "50%" : `${50 - w / 2}%`,
                    opacity: 0.85,
                  }}
                />
              </div>
              <span className="w-14 shrink-0 text-right font-mono text-xs">
                {c.coef_padronizado >= 0 ? "+" : ""}
                {c.coef_padronizado.toFixed(2)}
              </span>
            </div>
          );
        })}
      </div>
    </ChartCard>
  );
}

export default function PrevisaoPage() {
  const ex = forecast.export;
  const ab = forecast.abate;
  const ev = forecast.evasao;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Previsão de curto prazo"
        subtitle="Modelo estatístico operacional de 3 a 24 meses para abates, evasão e taxa de evasão, validado por erro histórico (backtesting). É previsão de série temporal, não um cenário estrutural de 2030. A taxa de evasão tem modelo próprio em escala logit, que garante previsões sempre entre 0% e 100%."
      />

      <Tabs defaultValue="export">
        <TabsList>
          <TabsTrigger value="export">Evasão</TabsTrigger>
          <TabsTrigger value="abate">Abates</TabsTrigger>
          <TabsTrigger value="evasao">Taxa de evasão</TabsTrigger>
          <TabsTrigger value="explicacao">Explicação</TabsTrigger>
        </TabsList>

        <TabsContent value="export" className="mt-4">
          <SerieTab s={ex} unidade="Unidade: cabeças/mês." />
        </TabsContent>
        <TabsContent value="abate" className="mt-4">
          <SerieTab s={ab} unidade="Unidade: cabeças/mês." />
        </TabsContent>
        <TabsContent value="evasao" className="mt-4">
          <SerieTab
            s={ev}
            pct
            unidade="Limiares: alerta em 30% e crítico em 50%. A projeção de 2030 está na aba Cenários 2030."
            refLines={[
              { y: 30, label: "alerta 30%", color: CHART.ambar },
              { y: 50, label: "crítico 50%", color: CHART.vermelho },
            ]}
          >
            <FatoresEvasaoCard />
          </SerieTab>
        </TabsContent>
        <TabsContent value="explicacao" className="mt-4">
          <ModeloHoltWinters />
        </TabsContent>
      </Tabs>
    </div>
  );
}

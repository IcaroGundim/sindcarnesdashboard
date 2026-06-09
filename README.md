# SINDICARNES Acre — Dashboard

Painel executivo do **Sindicato das Indústrias de Frigoríficos e Matadouros do
Estado do Acre (SINDICARNES Acre)** sobre a **sustentabilidade da indústria de
abate bovino do estado**. Inspirado na estrutura do template Apex
(Next.js + shadcn/ui), alimentado com dados de IDAF, IBGE/SIDRA, COMEX, CEPEA,
RAIS e ANP.

## Stack

- **Next.js 16** (App Router, export estático) + **React 19** + **TypeScript 5**
- **Tailwind CSS v4** + componentes no estilo **shadcn/ui** (Radix UI)
- **Recharts** (gráficos) · **lucide-react** (ícones) · tema claro (sem modo escuro)

## Estrutura

```
dashboard/
├── app/                     # rotas (9 páginas) + layout
│   ├── page.tsx             # Visão Geral
│   ├── abates-exportacoes/
│   ├── rebanho-desfrute/
│   ├── destinos/
│   ├── composicao-etaria/
│   ├── precos/
│   ├── emprego/
│   ├── previsao/           # Camada 1 — previsão de curto prazo (3–24 meses)
│   └── cenarios/           # Camadas 2 e 3 — estrutural + Monte Carlo
├── components/
│   ├── ui/                  # primitivos (card, button, tabs, table...)
│   ├── layout/              # sidebar, topbar (app-shell), nav, tema
│   ├── charts/              # wrappers Recharts + heatmap
│   ├── kpi-card.tsx
│   └── page-header.tsx
├── lib/
│   ├── data.ts              # importa os JSON e expõe dados tipados
│   ├── format.ts            # formatadores pt-BR
│   └── utils.ts             # cn()
├── data/                    # JSON gerados (importados em build-time)
├── scripts/
│   ├── prep_data.py         # gera data/*.json a partir da consultoria
│   └── build_models.py      # gera forecast/estrutural/montecarlo.json (modelagem)
└── public/                  # favicon e assets estáticos
```

## Como rodar

### 1. (Re)gerar os dados — opcional, já vêm prontos em `data/`

Requer Python 3 com `pandas` e `openpyxl`:

```bash
pip install pandas openpyxl
python scripts/prep_data.py
```

O script lê a pasta `../Consultoria Frigorificos/Consultoria Frigorificos/`
(ajustável via variável de ambiente `CONSULTORIA_SRC`) e grava os JSON em
`data/`. **Não modifica os arquivos originais.**

#### Modelagem de projeções e cenários — `scripts/build_models.py`

Implementa o `PLANO_MODELAGEM_CENARIOS_2030.md` em três camadas e **usa apenas a
biblioteca padrão do Python** (sem numpy/pandas/statsmodels) — roda offline e é
reprodutível (seed fixa). Deve rodar **depois** de `prep_data.py`, pois lê
`data/painel_mensal.json` e `data/serie_anual.json`:

```bash
python scripts/build_models.py
```

| Camada | O que faz | Saída |
|--------|-----------|-------|
| 1 · Previsão curto prazo | **Holt-Winters aditivo** (selecionado por superar os demais candidatos) validado por **backtesting de origem móvel**; intervalos de previsão empíricos; evasão derivada de export ÷ (export+abate) | `data/forecast.json` |
| 2 · Estrutural/causal | Modelo de **estoque-fluxo** da cadeia bovina (rebanho → oferta → demanda industrial → exportação) em 4 cenários, validado contra o rebanho 2015–2024 | `data/estrutural.json` |
| 3 · Probabilístico | **Monte Carlo** (8.000 sims/cenário) com premissas correlacionadas (Cholesky); percentis P10–P90, probabilidades de risco e ranking de fatores (tornado) | `data/montecarlo.json` |

#### Mapa de estados (coroplético) — `data/br_uf.topo.json`

O mapa da página *Destinos* usa a malha estadual do IBGE (pasta `SHAPE BRASIL/`),
convertida para TopoJSON simplificado (já versionado em `data/`). Para regenerar:

```bash
npx mapshaper "SHAPE BRASIL/BR_UF_2025.shp" \
  -simplify 4% keep-shapes \
  -filter-fields SIGLA_UF,NM_UF \
  -o format=topojson quantization=6000 data/br_uf.topo.json
```

O join com os dados é feito pelo campo `SIGLA_UF` (= `uf` em `destinos_uf.json`).
O mapa é renderizado com `d3-geo` + `topojson-client` (SVG, sem libs de mapa
pesadas) e a geometria é embutida em build-time — funciona offline.

### 2. Desenvolvimento

```bash
npm install
npm run dev      # http://localhost:3000
```

### 3. Build estático (produção)

```bash
npm run build    # gera a pasta out/
```

Os dados são **embutidos no JavaScript** em build-time, então o site funciona
offline — basta abrir `out/index.html` ou hospedar a pasta `out/` em qualquer
servidor estático (Vercel, Cloudflare Pages, S3, Nginx...).

## Páginas

| Página | Conteúdo |
|--------|----------|
| Visão Geral | KPIs executivos, abates × exportação × evasão, destinos, cenários |
| Abates × Exportações | Série anual e mensal, razão export ÷ abate |
| Rebanho & Desfrute | Evolução do rebanho e taxa de desfrute |
| Destinos | Ranking por UF, concentração em MT, tabela |
| Composição Etária | Drenagem por classe etária/sexo, % machos jovens |
| Preços | Boi gordo × bezerro, razão de arbitragem |
| Emprego (RAIS) | Trabalhadores e salários: frigorífico × pecuária |
| Previsão de curto prazo | Forecast de 3–24 meses (Holt-Winters validado por backtesting), bandas de incerteza, evasão derivada |
| Cenários 2030 | Modelo estrutural de estoque-fluxo (4 cenários) + Monte Carlo: fan charts, percentis, probabilidades de risco e tornado |

## Notas sobre as métricas

- **Taxa de evasão** = `export ÷ (abates + export)` → 36,3% em 2025.
- **Razão export ÷ abate** = `export ÷ abates` → 57,0% em 2025.

São indicadores diferentes (e aparecem com o mesmo nome em arquivos de origem
distintos); por isso são recalculados de forma consistente em `lib/data.ts`.

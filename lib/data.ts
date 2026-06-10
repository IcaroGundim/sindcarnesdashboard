// Camada de dados tipada. Os JSON sao gerados por scripts/prep_data.py e
// importados em build-time (funciona offline no export estatico).

import kpisRaw from "@/data/kpis.json";
import serieAnualRaw from "@/data/serie_anual.json";
import painelMensalRaw from "@/data/painel_mensal.json";
import destinosRaw from "@/data/destinos_uf.json";
import modelosRaw from "@/data/modelos.json";
import cenariosRaw from "@/data/cenarios.json";
import empregoRaw from "@/data/emprego.json";
import precosRaw from "@/data/precos.json";
import forecastRaw from "@/data/forecast.json";
import estruturalRaw from "@/data/estrutural.json";
import montecarloRaw from "@/data/montecarlo.json";

// ---- Tipos ----------------------------------------------------------------
export interface KpiStats {
  ultimo_ano: number;
  abates_2025: number;
  export_2025: number;
  taxa_evasao_2025: number;
  rebanho_2024: number;
  crescimento_rebanho_2015_2024: number;
  machos_jovens_exportados_2025: number;
  crescimento_export_2015_2025: number;
  preco_boi_2025: number;
  preco_bezerro_2025: number;
  ssi_2025: number;
  idi_2025: number;
  destino_principal_2025: string;
  share_mt_2025: number;
  trabalhadores_frigorifico_2025: number;
  salario_medio_frig_2025: number;
}

export interface ExecutiveSummary {
  title: string;
  date: string;
  key_metrics: {
    export_growth_10yr_pct: number;
    evasion_rate_2025_pct: number;
    exp_abate_ratio_2025_pct: number;
    young_male_export_share_pct: number;
    mt_concentration_pct: number;
    estimated_saturation_year: number;
    herd_2024_million: number;
    slaughter_2025: number;
    export_2025: number;
    workers_at_risk: number;
    avg_wage_frig_2025: number;
  };
  granger_causality: Record<string, { f_stat: number; p_value: number }>;
  scenarios_2030: Record<
    string,
    { export: number; abates: number; evasion_pct: number }
  >;
}

export interface SerieAnual {
  ano: number;
  rebanho_acre: number | null;
  abates: number | null;
  exportacoes: number | null;
  taxa_evasao: number | null;
  taxa_desfrute: number | null;
}

export interface PainelMensal {
  ano: number;
  mes: number;
  data: string;
  export_total: number | null;
  export_machos: number | null;
  export_femeas: number | null;
  export_m_0a12: number | null;
  export_m_13a24: number | null;
  export_m_25a36: number | null;
  export_m_36plus: number | null;
  export_f_0a12: number | null;
  export_f_13a24: number | null;
  export_f_25a36: number | null;
  export_f_36plus: number | null;
  abates_total: number | null;
  boi_gordo_r_arroba: number | null;
  bezerro_r_cabeca: number | null;
  taxa_evasao: number | null;
  razao_export_abate: number | null;
  prop_machos_jovens_export: number | null;
  prop_femeas_export: number | null;
  [key: string]: number | string | null;
}

export interface DestinoUf {
  uf: string;
  nome: string;
  total: number;
  share: number;
}

export interface DestinoUfAno {
  ano: number;
  uf: string;
  nome: string;
  total: number;
  share: number;
}

export interface MtShare {
  ano: number;
  total: number;
  mt: number;
  share_mt: number;
}

export interface MtShareMes {
  data: string;
  ano: number;
  mes: number;
  total: number;
  mt: number;
  share_mt: number;
}

export interface EmpregoAno {
  ano: number;
  vinculos: number;
  ativos: number;
  rem_media: number;
  massa: number;
}

export interface PrecoMes {
  data: string;
  ano: number;
  mes: number;
  boi: number | null;
  bezerro: number | null;
}

export interface Modelos {
  reg_abates_export: {
    slope: number;
    intercept: number;
    r2: number;
    p_value: number;
    std_err: number;
  };
  correlations: Record<string, Record<string, number>>;
  arima_export: {
    forecast_years: number[];
    mean: number[];
    ci_lower: number[];
    ci_upper: number[];
    aic: number;
    bic: number;
  };
  granger: Record<string, { f: number; p: number }>;
}

// ---- Exports tipados ------------------------------------------------------
const kpisData = kpisRaw as { kpi: KpiStats; executive: ExecutiveSummary };

export const kpi: KpiStats = kpisData.kpi;
export const executive: ExecutiveSummary = kpisData.executive;
export const serieAnual: SerieAnual[] = serieAnualRaw as SerieAnual[];
export const painelMensal: PainelMensal[] = painelMensalRaw as PainelMensal[];
export const destinos = destinosRaw as {
  by_uf: DestinoUf[];
  by_uf_year: DestinoUfAno[];
  years: number[];
  mt_share_by_year: MtShare[];
  mt_share_by_month: MtShareMes[];
  ultimo_ano: number;
};
export const modelos: Modelos = modelosRaw as Modelos;
export const cenarios = cenariosRaw as {
  baseline_2025: { abates: number; export: number; evasion_pct: number };
  scenarios_2030: Record<
    string,
    { export: number; abates: number; evasion_pct: number }
  >;
  estimated_saturation_year: number;
};
export const emprego = empregoRaw as {
  frigorifico: EmpregoAno[];
  pecuaria: EmpregoAno[];
};
export const precos: PrecoMes[] = precosRaw as PrecoMes[];

// ---- Camada 1: previsao de curto prazo (forecast.json) --------------------
export interface ForecastPonto {
  data: string;
  mean: number;
  p10: number;
  p25: number;
  p75: number;
  p90: number;
}
export interface SerieForecast {
  variavel: string;
  modelo: string;
  mae: number | null;
  rmse: number | null;
  smape: number | null;
  cobertura_ip80: number | null;
  history: { data: string; valor: number }[];
  forecast: ForecastPonto[];
}
export interface FatorEvasao {
  fator: string;
  label: string;
  coef_padronizado: number;
}
export interface FatoresEvasao {
  descricao: string;
  n: number;
  r2: number;
  coeficientes: FatorEvasao[];
}
export interface SerieForecastEvasao extends SerieForecast {
  fatores: FatoresEvasao | null;
  derivada_mean: { data: string; mean: number | null }[];
}
export interface ForecastData {
  atualizado_ate: string;
  horizonte_meses: number;
  export: SerieForecast;
  abate: SerieForecast;
  evasao: SerieForecastEvasao;
}
export const forecast = forecastRaw as ForecastData;

// ---- Camada 2: modelo estrutural (estrutural.json) ------------------------
export interface IndicadorAno {
  ano: number;
  rebanho: number;
  abates: number;
  export: number;
  evasao: number;
  utilizacao: number;
  empregos_risco: number;
}
export interface CenarioEstrutural {
  nome: string;
  descricao: string;
  drivers: string[];
  premissas_2030: {
    propensao_exportar_pct: number;
    taxa_desfrute_pct: number;
    capacidade_cagr_pct: number;
  };
  trajetoria: IndicadorAno[];
  resultado_2030: IndicadorAno;
}
export interface EstruturalData {
  baseline_2025: {
    rebanho: number;
    abates: number;
    export: number;
    evasao: number;
    capacidade: number;
    utilizacao: number;
  };
  parametros_base: Record<string, number>;
  cenarios: Record<string, CenarioEstrutural>;
  validacao: {
    serie: { ano: number; rebanho_real: number | null; rebanho_modelo: number }[];
    mape_rebanho: number;
  };
}
export const estrutural = estruturalRaw as EstruturalData;

// ---- Camada 3: Monte Carlo (montecarlo.json) ------------------------------
export interface Percentis {
  p10: number;
  p25: number;
  mediana: number;
  p75: number;
  p90: number;
}
export interface CenarioMonteCarlo {
  nome: string;
  percentis_2030: Record<
    "evasao" | "abates" | "export" | "utilizacao" | "empregos_risco",
    Percentis
  >;
  riscos: Record<string, number>;
  tornado: { fator: string; correlacao: number; label: string }[];
  fan: {
    ano: number;
    evasao: Percentis;
    export: Percentis;
    abates: Percentis;
  }[];
}
export interface MonteCarloData {
  n_sims: number;
  seed: number;
  fatores: { fator: string; label: string }[];
  correlacoes: { a: string; b: string; valor: number }[];
  cenarios: Record<string, CenarioMonteCarlo>;
}
export const montecarlo = montecarloRaw as MonteCarloData;

// Ordem canonica dos cenarios estruturais (do mais virtuoso ao mais critico).
export const CENARIO_ORDEM = [
  "industrializacao",
  "retencao_moderada",
  "continuidade",
  "pressao_externa",
] as const;

// ---- Derivados ------------------------------------------------------------
// Serie anual com metricas recalculadas de forma consistente a partir dos
// valores brutos (evita a ambiguidade do campo "taxa_evasao" entre arquivos):
//   evasao = export / (abates + export) * 100   (% que deixa o estado)
//   razao  = export / abates * 100              (pressao sobre o abate local)
export interface AnualDerivado {
  ano: number;
  rebanho: number | null;
  abates: number;
  exportacoes: number | null;
  evasao: number | null;
  razao: number | null;
  desfrute: number | null;
}

export const anual: AnualDerivado[] = serieAnual.map((r) => {
  const ab = r.abates ?? 0;
  const ex = r.exportacoes;
  const evasao = ex !== null && ab + ex > 0 ? (ex / (ab + ex)) * 100 : null;
  const razao = ex !== null && ab > 0 ? (ex / ab) * 100 : null;
  return {
    ano: r.ano,
    rebanho: r.rebanho_acre,
    abates: ab,
    exportacoes: ex,
    evasao: evasao !== null ? Math.round(evasao * 10) / 10 : null,
    razao: razao !== null ? Math.round(razao * 10) / 10 : null,
    desfrute: r.taxa_desfrute,
  };
});

// Paleta de cores (hex) para as series dos graficos. Valores fixos porque
// var(--css) nao resolve em atributos SVG do Recharts. Funcionam bem nos dois
// temas; eixos/grid usam currentColor (herdado de text-muted-foreground).
export const CHART = {
  azul: "#3b82f6",
  ambar: "#f59e0b",
  verde: "#10b981",
  vermelho: "#ef4444",
  violeta: "#8b5cf6",
  ciano: "#06b6d4",
  rosa: "#ec4899",
  cinza: "#94a3b8",
};


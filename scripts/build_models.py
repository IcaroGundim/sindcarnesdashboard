#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Modelagem para projecoes e cenarios 2030 do Dashboard "SINDICARNES Acre".

Implementa o PLANO_MODELAGEM_CENARIOS_2030.md em tres camadas, SEM dependencias
externas (apenas a biblioteca padrao do Python), para rodar offline e ser
reproduzivel:

  Camada 1 - Previsao estatistica de curto prazo (3-24 meses)
      Competicao de modelos (naive, naive sazonal, media movel, crescimento
      medio, Holt-Winters aditivo) validada por backtesting de origem movel.
      Intervalos de previsao empiricos a partir dos residuos do backtest.
      -> data/forecast.json

  Camada 2 - Modelo estrutural/causal (estoque-fluxo) 2026-2030
      Rebanho, oferta (desfrute), demanda industrial (capacidade/utilizacao) e
      exportacao (propensao a exportar). Quatro cenarios estruturais.
      -> data/estrutural.json

  Camada 3 - Simulacao de Monte Carlo sobre o modelo estrutural
      Premissas como distribuicoes (correlacionadas via Cholesky), 8.000
      simulacoes por cenario, percentis P10..P90, probabilidades de risco e
      ranking de fatores (tornado).
      -> data/montecarlo.json

Le os JSON ja gerados por prep_data.py (data/painel_mensal.json,
data/serie_anual.json, data/emprego.json). Nao acessa os dados originais e nao
modifica nenhum arquivo de entrada.

Uso:
    cd dashboard
    python scripts/build_models.py
"""
from __future__ import annotations

import json
import math
import os
import random

# ---------------------------------------------------------------------------
# Caminhos
# ---------------------------------------------------------------------------
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DASHBOARD_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, ".."))
DATA_DIR = os.path.join(DASHBOARD_DIR, "data")

PERIODO = 12          # sazonalidade mensal
HORIZONTE = 24        # meses de previsao (ate 24, conforme plano)
N_SIMS = 8000         # simulacoes de Monte Carlo por cenario
SEED = 20300101       # reprodutibilidade
ANOS_CENARIO = [2026, 2027, 2028, 2029, 2030]


def load(name: str):
    with open(os.path.join(DATA_DIR, name), encoding="utf-8") as fh:
        return json.load(fh)


def write_json(name: str, data) -> None:
    path = os.path.join(DATA_DIR, name)
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(data, fh, ensure_ascii=False, indent=2)
    print(f"  ok  data/{name}  ({os.path.getsize(path):,} bytes)")


def r2(x):
    return round(x, 2) if x is not None else None


def add_months(ym: str, k: int) -> str:
    """ym no formato YYYY-MM-DD (dia 01). Retorna a data deslocada de k meses."""
    y, m, _ = (int(p) for p in ym.split("-"))
    idx = (y * 12 + (m - 1)) + k
    return f"{idx // 12:04d}-{idx % 12 + 1:02d}-01"


# ===========================================================================
# CAMADA 1 - PREVISAO ESTATISTICA DE CURTO PRAZO
# ===========================================================================
# --- Modelo de previsao ------------------------------------------------------
# Modelo unico: Holt-Winters aditivo (escolhido por ter superado os demais
# candidatos no backtesting). Recebe a serie de treino e o horizonte h e
# retorna h previsoes. f_snaive e' mantido apenas como fallback para series
# curtas (menos de dois ciclos sazonais).

def f_snaive(y, h):
    return [y[-PERIODO + (i % PERIODO)] if len(y) >= PERIODO else y[-1]
            for i in range(h)]


def _hw_add(y, h, alpha, beta, gamma, piso_zero=True):
    """Holt-Winters aditivo (nivel + tendencia + sazonalidade aditiva).

    Sazonalidade aditiva (e nao multiplicativa) porque a serie de exportacao
    contem zeros, o que inviabiliza o fator multiplicativo.

    piso_zero aplica max(0, .) as previsoes (series de contagem); deve ser
    False quando o modelo roda em escala transformada (ex.: logit), na qual
    valores negativos sao legitimos.
    """
    m = PERIODO
    if len(y) < 2 * m:
        return f_snaive(y, h)
    # inicializacao
    level = sum(y[:m]) / m
    # tendencia inicial: media das diferencas entre os dois primeiros ciclos
    trend = sum((y[m + i] - y[i]) for i in range(m)) / (m * m)
    season = [y[i] - level for i in range(m)]
    for t in range(len(y)):
        s = season[t % m]
        val = y[t]
        last_level = level
        level = alpha * (val - s) + (1 - alpha) * (last_level + trend)
        trend = beta * (level - last_level) + (1 - beta) * trend
        season[t % m] = gamma * (val - level) + (1 - gamma) * s
    out = []
    n = len(y)
    for i in range(1, h + 1):
        s = season[(n + i - 1) % m]
        out.append(level + i * trend + s)
    return [max(0.0, v) for v in out] if piso_zero else out


def f_holt_winters(y, h, piso_zero=True):
    """Holt-Winters aditivo com busca em grade dos parametros de suavizacao
    (minimiza o SSE de previsao 1-passo dentro da amostra)."""
    m = PERIODO
    if len(y) < 2 * m:
        return f_snaive(y, h)
    best, best_sse = (0.3, 0.05, 0.3), float("inf")
    grid_a = (0.1, 0.2, 0.3, 0.5, 0.7)
    grid_b = (0.0, 0.02, 0.05, 0.1)
    grid_g = (0.05, 0.2, 0.4, 0.6)
    for a in grid_a:
        for b in grid_b:
            for g in grid_g:
                sse = _hw_one_step_sse(y, a, b, g)
                if sse < best_sse:
                    best_sse, best = sse, (a, b, g)
    return _hw_add(y, h, *best, piso_zero=piso_zero)


def _hw_one_step_sse(y, alpha, beta, gamma):
    m = PERIODO
    level = sum(y[:m]) / m
    trend = sum((y[m + i] - y[i]) for i in range(m)) / (m * m)
    season = [y[i] - level for i in range(m)]
    sse = 0.0
    for t in range(len(y)):
        s = season[t % m]
        pred = level + trend + s
        val = y[t]
        if t >= m:
            sse += (val - pred) ** 2
        last_level = level
        level = alpha * (val - s) + (1 - alpha) * (last_level + trend)
        trend = beta * (level - last_level) + (1 - beta) * trend
        season[t % m] = gamma * (val - level) + (1 - gamma) * s
    return sse


# --- Metricas ----------------------------------------------------------------
def _mae(e):
    return sum(abs(v) for v in e) / len(e)


def _rmse(e):
    return math.sqrt(sum(v * v for v in e) / len(e))


def _mape(real, prev):
    vals = [abs((r - p) / r) for r, p in zip(real, prev) if r != 0]
    return 100 * sum(vals) / len(vals) if vals else None


def _smape(real, prev):
    vals = []
    for r, p in zip(real, prev):
        d = (abs(r) + abs(p))
        if d > 0:
            vals.append(2 * abs(r - p) / d)
    return 100 * sum(vals) / len(vals) if vals else None


def backtest(y, fn, h_max=12, min_treino=None):
    """Backtesting de origem movel (expanding window) para um unico modelo.

    Para cada origem t (a partir de min_treino), treina com y[:t] e preve
    h=1..h_max. Acumula o erro de cada passo e os residuos por horizonte
    (usados depois para os intervalos de previsao).
    Retorna (metricas, residuos_por_horizonte).
    """
    n = len(y)
    if min_treino is None:
        min_treino = 2 * PERIODO + 6
    erros, reais, prevs = [], [], []
    resid_h = {h: [] for h in range(1, h_max + 1)}

    for t in range(min_treino, n):  # ultima origem deixa h>=1 fora da amostra
        treino = y[:t]
        hmax = min(h_max, n - t)
        if hmax <= 0:
            continue
        pred = fn(treino, hmax)
        for hh in range(1, hmax + 1):
            real = y[t + hh - 1]
            p = pred[hh - 1]
            erros.append(real - p)
            reais.append(real)
            prevs.append(p)
            resid_h[hh].append(real - p)

    metricas = {
        "mae": _mae(erros),
        "rmse": _rmse(erros),
        "mape": _mape(reais, prevs),
        "smape": _smape(reais, prevs),
        "n": len(erros),
    } if erros else {}
    return metricas, resid_h


def _quantil(vals, q):
    if not vals:
        return 0.0
    s = sorted(vals)
    if len(s) == 1:
        return s[0]
    pos = q * (len(s) - 1)
    lo = int(math.floor(pos))
    hi = int(math.ceil(pos))
    if lo == hi:
        return s[lo]
    return s[lo] + (s[hi] - s[lo]) * (pos - lo)


MODELO = "Holt-Winters"


def prever_serie(y, datas, nome_var):
    """Gera 24 meses de previsao com Holt-Winters aditivo, com intervalos
    empiricos (P10/P25/mediana/P75/P90) a partir dos residuos do backtesting de
    origem movel, e mede a cobertura do IP80% e o sMAPE do modelo."""
    fn = f_holt_winters
    metricas, res = backtest(y, fn, h_max=12)
    central = fn(y, HORIZONTE)

    # intervalos a partir dos residuos por horizonte (h>12 reaproveita h=12).
    forecast = []
    for i in range(HORIZONTE):
        h = i + 1
        rs = res[min(h, 12)]
        forecast.append({
            "data": add_months(datas[-1], h),
            "mean": round(max(0.0, central[i])),
            "p10": round(max(0.0, central[i] + _quantil(rs, 0.10))),
            "p25": round(max(0.0, central[i] + _quantil(rs, 0.25))),
            "p75": round(max(0.0, central[i] + _quantil(rs, 0.75))),
            "p90": round(max(0.0, central[i] + _quantil(rs, 0.90))),
        })

    # cobertura empirica do IP80 (P10-P90) no backtest
    cobertos = total_cob = 0
    for h in range(1, 13):
        rs = res[h]
        lo, hi = _quantil(rs, 0.10), _quantil(rs, 0.90)
        for e in rs:
            total_cob += 1
            if lo <= e <= hi:
                cobertos += 1
    cobertura80 = round(cobertos / total_cob, 3) if total_cob else None

    history = [{"data": d, "valor": round(v)} for d, v in zip(datas, y)]
    return {
        "variavel": nome_var,
        "modelo": MODELO,
        "mae": round(metricas["mae"]) if metricas else None,
        "rmse": round(metricas["rmse"]) if metricas else None,
        "smape": r2(metricas["smape"]) if metricas else None,
        "cobertura_ip80": cobertura80,
        "history": history,
        "forecast": forecast,
    }


# --- Evasao: modelo direto em escala logit ---------------------------------
_EPS_LOGIT = 0.005  # trunca p em [eps, 1-eps]; a serie tem meses com evasao 0


def _logit(p):
    p = min(1.0 - _EPS_LOGIT, max(_EPS_LOGIT, p))
    return math.log(p / (1.0 - p))


def _inv_logit(z):
    return 1.0 / (1.0 + math.exp(-z))


def f_evasao_logit(y, h):
    """Wrapper de previsao para a taxa de evasao (em %): transforma em logit,
    aplica Holt-Winters aditivo e destransforma de volta para %.

    A transformacao garante previsoes sempre dentro de (0, 100)."""
    z = [_logit(v / 100.0) for v in y]
    zf = f_holt_winters(z, h, piso_zero=False)
    return [100.0 * _inv_logit(v) for v in zf]


def prever_evasao(taxas, datas):
    """Modelo direto da taxa de evasao (%): Holt-Winters em escala logit, com
    backtesting de origem movel, intervalos empiricos (em pontos percentuais,
    truncados em [0, 100]), sMAPE e cobertura do IP80."""
    fn = f_evasao_logit
    metricas, res = backtest(taxas, fn, h_max=12)
    central = fn(taxas, HORIZONTE)

    def clip_pct(v):
        return min(100.0, max(0.0, v))

    forecast = []
    for i in range(HORIZONTE):
        h = i + 1
        rs = res[min(h, 12)]
        forecast.append({
            "data": add_months(datas[-1], h),
            "mean": r2(clip_pct(central[i])),
            "p10": r2(clip_pct(central[i] + _quantil(rs, 0.10))),
            "p25": r2(clip_pct(central[i] + _quantil(rs, 0.25))),
            "p75": r2(clip_pct(central[i] + _quantil(rs, 0.75))),
            "p90": r2(clip_pct(central[i] + _quantil(rs, 0.90))),
        })

    cobertos = total_cob = 0
    for h in range(1, 13):
        rs = res[h]
        lo, hi = _quantil(rs, 0.10), _quantil(rs, 0.90)
        for e in rs:
            total_cob += 1
            if lo <= e <= hi:
                cobertos += 1
    cobertura80 = round(cobertos / total_cob, 3) if total_cob else None

    history = [{"data": d, "valor": r2(v)} for d, v in zip(datas, taxas)]
    return {
        "variavel": "Taxa de evasão",
        "modelo": f"{MODELO} (logit)",
        "mae": r2(metricas["mae"]) if metricas else None,
        "rmse": r2(metricas["rmse"]) if metricas else None,
        "smape": r2(metricas["smape"]) if metricas else None,
        "cobertura_ip80": cobertura80,
        "history": history,
        "forecast": forecast,
    }


# --- Evasao: regressao explicativa (analise de fatores) --------------------
def _ols(X, y):
    """OLS por equacoes normais (X'X) b = X'y, resolvido por eliminacao de
    Gauss. X: lista de linhas (com intercepto ja incluido)."""
    k = len(X[0])
    XtX = [[sum(r[i] * r[j] for r in X) for j in range(k)] for i in range(k)]
    Xty = [sum(r[i] * v for r, v in zip(X, y)) for i in range(k)]
    # eliminacao de Gauss com pivoteamento parcial
    A = [row[:] + [Xty[i]] for i, row in enumerate(XtX)]
    for col in range(k):
        piv = max(range(col, k), key=lambda r: abs(A[r][col]))
        A[col], A[piv] = A[piv], A[col]
        if abs(A[col][col]) < 1e-12:
            return None
        for r in range(col + 1, k):
            f = A[r][col] / A[col][col]
            for c in range(col, k + 1):
                A[r][c] -= f * A[col][c]
    b = [0.0] * k
    for i in range(k - 1, -1, -1):
        b[i] = (A[i][k] - sum(A[i][j] * b[j] for j in range(i + 1, k))) / A[i][i]
    return b


def fatores_evasao(painel):
    """Regressao explicativa: logit(evasao) ~ razao de precos bezerro/boi,
    evasao defasada (t-1) e sazonalidade anual (seno/cosseno). Usa apenas os
    meses com precos disponiveis. Analise complementar; nao gera a previsao."""
    rows = []
    prev_logit = None
    for r in painel:
        ev = r.get("taxa_evasao")
        boi = r.get("boi_gordo_r_arroba")
        bez = r.get("bezerro_r_cabeca")
        cur_logit = _logit(ev / 100.0) if ev is not None else None
        if (ev is not None and boi and bez and prev_logit is not None):
            mes = r["mes"]
            rows.append({
                "y": cur_logit,
                "razao_precos": bez / boi,
                "evasao_lag": prev_logit,
                "sin": math.sin(2 * math.pi * mes / 12.0),
                "cos": math.cos(2 * math.pi * mes / 12.0),
            })
        prev_logit = cur_logit
    if len(rows) < 24:
        return None

    nomes = ["razao_precos", "evasao_lag", "sin", "cos"]
    # padroniza os regressores para coeficientes comparaveis entre si
    stats = {}
    for nm in nomes:
        vals = [r[nm] for r in rows]
        mu = sum(vals) / len(vals)
        sd = math.sqrt(sum((v - mu) ** 2 for v in vals) / len(vals)) or 1.0
        stats[nm] = (mu, sd)
    X = [[1.0] + [(r[nm] - stats[nm][0]) / stats[nm][1] for nm in nomes]
         for r in rows]
    y = [r["y"] for r in rows]
    b = _ols(X, y)
    if b is None:
        return None
    yhat = [sum(c * v for c, v in zip(row, b)) for row in X]
    my = sum(y) / len(y)
    ss_res = sum((a - p) ** 2 for a, p in zip(y, yhat))
    ss_tot = sum((a - my) ** 2 for a in y) or 1.0
    r2_reg = 1.0 - ss_res / ss_tot

    labels = {
        "razao_precos": "Razão de preços bezerro ÷ boi gordo",
        "evasao_lag": "Evasão do mês anterior (inércia)",
        "sin": "Sazonalidade (componente seno)",
        "cos": "Sazonalidade (componente cosseno)",
    }
    coefs = [{
        "fator": nm,
        "label": labels[nm],
        "coef_padronizado": round(b[i + 1], 4),
    } for i, nm in enumerate(nomes)]
    coefs.sort(key=lambda c: abs(c["coef_padronizado"]), reverse=True)
    return {
        "descricao": "Regressão OLS de logit(evasão) sobre regressores "
                     "padronizados, nos meses com preços disponíveis. "
                     "Análise de fatores; não gera a previsão oficial.",
        "n": len(rows),
        "r2": round(r2_reg, 3),
        "coeficientes": coefs,
    }


def build_forecast(painel):
    rows = [r for r in painel]
    datas = [r["data"] for r in rows]
    export = [float(r["export_total"]) for r in rows]
    abate = [float(r["abates_total"]) for r in rows]

    fx_export = prever_serie(export, datas, "Exportação interestadual")
    fx_abate = prever_serie(abate, datas, "Abates")

    # Evasao com MODELO PROPRIO: Holt-Winters em escala logit sobre a taxa
    # mensal observada (export / (export + abate)).
    taxas, datas_ev = [], []
    for r in rows:
        ex, ab = float(r["export_total"]), float(r["abates_total"])
        if (ex + ab) > 0:
            taxas.append(100 * ex / (ex + ab))
            datas_ev.append(r["data"])
    fx_evasao = prever_evasao(taxas, datas_ev)
    fx_evasao["fatores"] = fatores_evasao(rows)

    # Checagem de consistencia: evasao derivada das medianas de export/abate
    # (apenas registro no JSON; nao exibida no dashboard).
    derivada = []
    for fe, fa in zip(fx_export["forecast"], fx_abate["forecast"]):
        tot = fe["mean"] + fa["mean"]
        derivada.append({
            "data": fe["data"],
            "mean": r2(100 * fe["mean"] / tot) if tot > 0 else None,
        })
    fx_evasao["derivada_mean"] = derivada

    payload = {
        "atualizado_ate": datas[-1],
        "horizonte_meses": HORIZONTE,
        "export": fx_export,
        "abate": fx_abate,
        "evasao": fx_evasao,
    }
    write_json("forecast.json", payload)
    print(f"      modelo: {MODELO} · sMAPE export {fx_export['smape']}% | "
          f"abate {fx_abate['smape']}% | evasao {fx_evasao['smape']}%")


# ===========================================================================
# CAMADA 2 - MODELO ESTRUTURAL / CAUSAL (ESTOQUE-FLUXO)
# ===========================================================================
# Parametros base calibrados para reproduzir 2025 (abates 664.435, export
# 378.708, rebanho ~5,19 mi, desfrute 20,1%, propensao a exportar 36,3%).
BASE = {
    "rebanho_2025": 5_186_919,
    "abates_2025": 664_435,
    "export_2025": 378_708,
    "taxa_natal": 0.265,        # nascimentos / rebanho
    "taxa_mort": 0.050,         # mortalidade / rebanho
    "taxa_desfrute": 0.201,     # (abate + export em pe) / rebanho
    "propensao_exportar": 0.363,  # export / (export + abate)
    "capacidade_2025": 760_000,   # capacidade industrial instalada (cab/ano)
}
# empregos por cabeca abatida (RAIS frigorifico 2025 / abates 2025)
JOBS_POR_CAB = 3013 / BASE["abates_2025"]


def passo_estrutural(estado, par):
    """Avanca um ano do modelo de estoque-fluxo.

    estado: dict com 'rebanho'. par: parametros do ano (taxas e capacidade).
    Retorna (novo_estado, indicadores_do_ano).
    """
    reb = estado["rebanho"]
    nascimentos = reb * par["taxa_natal"]
    mortalidade = reb * par["taxa_mort"]
    desfrute = reb * par["taxa_desfrute"]          # animais comercializados
    export = desfrute * par["propensao_exportar"]
    abate_demandado = desfrute - export
    capacidade = par["capacidade"]
    abates = min(abate_demandado, capacidade)
    # excedente que nao encontra abate local e' drenado como exportacao em pe
    export += max(0.0, abate_demandado - abates)

    total = export + abates
    evasao = 100 * export / total if total > 0 else 0.0
    utilizacao = 100 * abates / capacidade if capacidade > 0 else 0.0
    empregos_risco = max(0.0, (BASE["abates_2025"] - abates)) * JOBS_POR_CAB

    novo = {"rebanho": reb + nascimentos - mortalidade - desfrute}
    ind = {
        "rebanho": round(reb),
        "abates": round(abates),
        "export": round(export),
        "evasao": r2(evasao),
        "utilizacao": r2(utilizacao),
        "empregos_risco": round(empregos_risco),
    }
    return novo, ind


def _interp(v2025, v2030, ano):
    """Interpolacao linear de um parametro entre 2025 e 2030."""
    frac = (ano - 2025) / 5.0
    return v2025 + (v2030 - v2025) * frac


# Cada cenario define os ALVOS de 2030 para os parametros que evoluem; o
# caminho 2026-2029 e' interpolado linearmente a partir da base 2025.
CENARIOS = {
    "continuidade": {
        "nome": "Continuidade",
        "descricao": "Baixa mudança institucional. A exportação em pé segue "
                     "atrativa, a capacidade industrial cresce pouco e a evasão "
                     "permanece alta ou crescente.",
        "drivers": ["Exportação atrativa", "Capacidade quase estagnada",
                    "Sem política de retenção"],
        "alvo_2030": {
            "propensao_exportar": 0.42,
            "taxa_desfrute": 0.205,
            "capacidade_cagr": 0.010,
        },
    },
    "retencao_moderada": {
        "nome": "Retenção moderada",
        "descricao": "Alguma política de incentivo ao abate local, leve aumento "
                     "da utilização frigorífica e perda parcial da atratividade "
                     "da exportação. A evasão estabiliza.",
        "drivers": ["Incentivo parcial ao abate", "Capacidade +3%/ano",
                    "Exportação menos atrativa"],
        "alvo_2030": {
            "propensao_exportar": 0.32,
            "taxa_desfrute": 0.195,
            "capacidade_cagr": 0.030,
        },
    },
    "industrializacao": {
        "nome": "Industrialização local",
        "descricao": "Aumento de abate local, maior capacidade e utilização, "
                     "contratos de fornecimento e retenção de animais. A evasão "
                     "cai de forma consistente.",
        "drivers": ["Contratos de fornecimento", "Capacidade +6%/ano",
                    "Retenção de matrizes"],
        "alvo_2030": {
            "propensao_exportar": 0.23,
            "taxa_desfrute": 0.188,
            "capacidade_cagr": 0.060,
        },
    },
    "pressao_externa": {
        "nome": "Pressão externa",
        "descricao": "MT e outros destinos seguem puxando a demanda com preço "
                     "mais atrativo. Os frigoríficos locais perdem matéria-prima "
                     "e a evasão sobe.",
        "drivers": ["Demanda externa forte", "Capacidade estagnada",
                    "Preço externo atrativo"],
        "alvo_2030": {
            "propensao_exportar": 0.52,
            "taxa_desfrute": 0.210,
            "capacidade_cagr": 0.005,
        },
    },
}


def parametros_ano(alvo, ano):
    return {
        "taxa_natal": BASE["taxa_natal"],
        "taxa_mort": BASE["taxa_mort"],
        "taxa_desfrute": _interp(BASE["taxa_desfrute"],
                                 alvo["taxa_desfrute"], ano),
        "propensao_exportar": _interp(BASE["propensao_exportar"],
                                      alvo["propensao_exportar"], ano),
        "capacidade": BASE["capacidade_2025"] *
        (1 + alvo["capacidade_cagr"]) ** (ano - 2025),
    }


def rodar_cenario(alvo, par_over=None):
    """Roda a trajetoria 2026-2030. par_over permite sobrepor parametros
    (usado pelo Monte Carlo)."""
    estado = {"rebanho": BASE["rebanho_2025"]}
    traj = []
    for ano in ANOS_CENARIO:
        par = parametros_ano(alvo, ano)
        if par_over:
            par = par_over(par, ano)
        estado, ind = passo_estrutural(estado, par)
        ind["ano"] = ano
        traj.append(ind)
    return traj


def validar_estrutural(serie_anual):
    """Backtest do estoque: projeta o REBANHO a partir de 2015 usando a equacao
    de estoque-fluxo (nascimentos e mortalidade pelos parametros base, retirada
    = desfrute observado abate+export de cada ano) e compara o rebanho modelado
    com o rebanho observado (IBGE). E' a parte genuinamente testavel do modelo:
    checa se a calibracao natal-mort reproduz a dinamica historica do rebanho.
    """
    porano = {r["ano"]: r for r in serie_anual}
    anos = [a for a in range(2015, 2025) if a in porano]
    reb_modelo = porano[anos[0]]["rebanho_acre"]
    out = []
    for ano in anos:
        r = porano[ano]
        reb_obs = r["rebanho_acre"]
        out.append({
            "ano": ano,
            "rebanho_real": round(reb_obs) if reb_obs else None,
            "rebanho_modelo": round(reb_modelo),
        })
        # avanca um ano: nascimentos - mortalidade - retirada observada
        offtake = (r["abates"] or 0) + (r["exportacoes"] or 0)
        reb_modelo = (reb_modelo
                      + reb_modelo * BASE["taxa_natal"]
                      - reb_modelo * BASE["taxa_mort"]
                      - offtake)
    errs = [abs(o["rebanho_modelo"] - o["rebanho_real"]) / o["rebanho_real"]
            for o in out if o["rebanho_real"]]
    return {"serie": out, "mape_rebanho": r2(100 * sum(errs) / len(errs))}


def build_estrutural(serie_anual):
    cenarios = {}
    for chave, cfg in CENARIOS.items():
        traj = rodar_cenario(cfg["alvo_2030"])
        cenarios[chave] = {
            "nome": cfg["nome"],
            "descricao": cfg["descricao"],
            "drivers": cfg["drivers"],
            "premissas_2030": {
                "propensao_exportar_pct": r2(100 * cfg["alvo_2030"]["propensao_exportar"]),
                "taxa_desfrute_pct": r2(100 * cfg["alvo_2030"]["taxa_desfrute"]),
                "capacidade_cagr_pct": r2(100 * cfg["alvo_2030"]["capacidade_cagr"]),
            },
            "trajetoria": traj,
            "resultado_2030": traj[-1],
        }
    payload = {
        "baseline_2025": {
            "rebanho": BASE["rebanho_2025"],
            "abates": BASE["abates_2025"],
            "export": BASE["export_2025"],
            "evasao": r2(100 * BASE["export_2025"] /
                         (BASE["export_2025"] + BASE["abates_2025"])),
            "capacidade": BASE["capacidade_2025"],
            "utilizacao": r2(100 * BASE["abates_2025"] / BASE["capacidade_2025"]),
        },
        "parametros_base": {
            "taxa_natal_pct": r2(100 * BASE["taxa_natal"]),
            "taxa_mort_pct": r2(100 * BASE["taxa_mort"]),
            "taxa_desfrute_pct": r2(100 * BASE["taxa_desfrute"]),
            "propensao_exportar_pct": r2(100 * BASE["propensao_exportar"]),
            "empregos_por_mil_abates": r2(1000 * JOBS_POR_CAB),
        },
        "cenarios": cenarios,
        "validacao": validar_estrutural(serie_anual),
    }
    write_json("estrutural.json", payload)


# ===========================================================================
# CAMADA 3 - SIMULACAO DE MONTE CARLO
# ===========================================================================
def _cholesky(A):
    """Decomposicao de Cholesky (matriz simetrica positiva-definida)."""
    n = len(A)
    L = [[0.0] * n for _ in range(n)]
    for i in range(n):
        for j in range(i + 1):
            s = sum(L[i][k] * L[j][k] for k in range(j))
            if i == j:
                L[i][j] = math.sqrt(max(1e-12, A[i][i] - s))
            else:
                L[i][j] = (A[i][j] - s) / L[j][j]
    return L


def _normais_correlacionadas(rng, L):
    z = [rng.gauss(0, 1) for _ in range(len(L))]
    return [sum(L[i][k] * z[k] for k in range(i + 1)) for i in range(len(L))]


# Fatores incertos e desvios-padrao relativos (sobre os alvos de cada cenario).
# Ordem fixa -> usada na matriz de correlacao.
FATORES = ["propensao_exportar", "taxa_desfrute", "capacidade_cagr",
           "taxa_natal", "preco_relativo"]

# Correlacoes entre premissas (plano: nao assumir independencia).
#  - preco_relativo alto puxa a propensao a exportar para cima  (+0.6)
#  - maior desfrute acompanha levemente a propensao a exportar  (+0.3)
#  - maior capacidade tende a reduzir a propensao a exportar    (-0.3)
CORR = {
    ("propensao_exportar", "preco_relativo"): 0.60,
    ("propensao_exportar", "taxa_desfrute"): 0.30,
    ("propensao_exportar", "capacidade_cagr"): -0.30,
    ("taxa_desfrute", "preco_relativo"): 0.20,
}


def _matriz_corr():
    n = len(FATORES)
    M = [[1.0 if i == j else 0.0 for j in range(n)] for i in range(n)]
    idx = {f: i for i, f in enumerate(FATORES)}
    for (a, b), v in CORR.items():
        i, j = idx[a], idx[b]
        M[i][j] = M[j][i] = v
    return M


def simular_cenario(alvo, rng, L):
    """8.000 simulacoes para um cenario. Cada simulacao perturba os alvos de
    2030 com choques correlacionados e roda o modelo estrutural."""
    sd = {  # desvios-padrao absolutos dos choques nos alvos de 2030
        "propensao_exportar": 0.06,
        "taxa_desfrute": 0.012,
        "capacidade_cagr": 0.015,
        "taxa_natal": 0.015,
        "preco_relativo": 1.0,   # padronizado; entra via correlacao
    }
    res_2030 = {"evasao": [], "abates": [], "export": [], "utilizacao": [],
                "empregos_risco": []}
    inputs = {f: [] for f in FATORES}
    saidas_evasao = []
    # tambem guardamos a trajetoria por ano para o fan chart
    por_ano = {a: {"evasao": [], "export": [], "abates": []} for a in ANOS_CENARIO}

    for _ in range(N_SIMS):
        ch = _normais_correlacionadas(rng, L)
        choque = {f: ch[i] for i, f in enumerate(FATORES)}
        prop_alvo = min(0.75, max(0.05,
                        alvo["propensao_exportar"]
                        + choque["propensao_exportar"] * sd["propensao_exportar"]
                        + choque["preco_relativo"] * 0.02))
        desf_alvo = min(0.26, max(0.14,
                        alvo["taxa_desfrute"] + choque["taxa_desfrute"] * sd["taxa_desfrute"]))
        cagr = max(-0.02, alvo["capacidade_cagr"] + choque["capacidade_cagr"] * sd["capacidade_cagr"])
        natal = max(0.20, min(0.32, BASE["taxa_natal"] + choque["taxa_natal"] * sd["taxa_natal"]))

        for f, val in (("propensao_exportar", prop_alvo), ("taxa_desfrute", desf_alvo),
                       ("capacidade_cagr", cagr), ("taxa_natal", natal),
                       ("preco_relativo", choque["preco_relativo"])):
            inputs[f].append(val)

        def override(par, ano, _prop=prop_alvo, _desf=desf_alvo, _cagr=cagr, _natal=natal):
            par = dict(par)
            par["propensao_exportar"] = _interp(BASE["propensao_exportar"], _prop, ano)
            par["taxa_desfrute"] = _interp(BASE["taxa_desfrute"], _desf, ano)
            par["taxa_natal"] = _natal
            par["capacidade"] = BASE["capacidade_2025"] * (1 + _cagr) ** (ano - 2025)
            return par

        traj = rodar_cenario(alvo, override)
        for ind in traj:
            por_ano[ind["ano"]]["evasao"].append(ind["evasao"])
            por_ano[ind["ano"]]["export"].append(ind["export"])
            por_ano[ind["ano"]]["abates"].append(ind["abates"])
        fim = traj[-1]
        for k in res_2030:
            res_2030[k].append(fim[k])
        saidas_evasao.append(fim["evasao"])

    def pct(vals):
        return {
            "p10": r2(_quantil(vals, 0.10)), "p25": r2(_quantil(vals, 0.25)),
            "mediana": r2(_quantil(vals, 0.50)), "p75": r2(_quantil(vals, 0.75)),
            "p90": r2(_quantil(vals, 0.90)),
        }

    n = float(N_SIMS)
    riscos = {
        "evasao_acima_50": round(sum(1 for v in res_2030["evasao"] if v > 50) / n, 3),
        "export_supera_abate": round(sum(1 for e, a in zip(res_2030["export"], res_2030["abates"]) if e > a) / n, 3),
        "utilizacao_abaixo_60": round(sum(1 for v in res_2030["utilizacao"] if v < 60) / n, 3),
        "abates_abaixo_500k": round(sum(1 for v in res_2030["abates"] if v < 500_000) / n, 3),
    }

    # tornado: correlacao de Pearson entre cada input e a evasao 2030
    tornado = []
    for f in FATORES:
        tornado.append({"fator": f, "correlacao": r2(_pearson(inputs[f], saidas_evasao))})
    tornado.sort(key=lambda d: abs(d["correlacao"] or 0), reverse=True)

    fan = [{
        "ano": a,
        "evasao": pct(por_ano[a]["evasao"]),
        "export": pct(por_ano[a]["export"]),
        "abates": pct(por_ano[a]["abates"]),
    } for a in ANOS_CENARIO]

    return {
        "percentis_2030": {k: pct(v) for k, v in res_2030.items()},
        "riscos": riscos,
        "tornado": tornado,
        "fan": fan,
    }


def _pearson(x, y):
    n = len(x)
    if n < 2:
        return None
    mx, my = sum(x) / n, sum(y) / n
    sxy = sum((a - mx) * (b - my) for a, b in zip(x, y))
    sxx = sum((a - mx) ** 2 for a in x)
    syy = sum((b - my) ** 2 for b in y)
    if sxx <= 0 or syy <= 0:
        return 0.0
    return sxy / math.sqrt(sxx * syy)


FATOR_LABEL = {
    "propensao_exportar": "Propensão a exportar",
    "taxa_desfrute": "Taxa de desfrute",
    "capacidade_cagr": "Crescimento da capacidade",
    "taxa_natal": "Taxa de natalidade",
    "preco_relativo": "Preço relativo AC vs MT/RO/SP",
}


def build_montecarlo():
    rng = random.Random(SEED)
    L = _cholesky(_matriz_corr())
    cenarios = {}
    for chave, cfg in CENARIOS.items():
        sim = simular_cenario(cfg["alvo_2030"], rng, L)
        for t in sim["tornado"]:
            t["label"] = FATOR_LABEL.get(t["fator"], t["fator"])
        cenarios[chave] = {"nome": cfg["nome"], **sim}
    payload = {
        "n_sims": N_SIMS,
        "seed": SEED,
        "fatores": [{"fator": f, "label": FATOR_LABEL[f]} for f in FATORES],
        "correlacoes": [
            {"a": FATOR_LABEL[a], "b": FATOR_LABEL[b], "valor": v}
            for (a, b), v in CORR.items()
        ],
        "cenarios": cenarios,
    }
    write_json("montecarlo.json", payload)


# ===========================================================================
def main():
    print(f"Lendo dados de: {DATA_DIR}\n")
    painel = load("painel_mensal.json")
    serie_anual = load("serie_anual.json")

    print("Camada 1 - Previsao de curto prazo (backtesting + IP):")
    build_forecast(painel)
    print("\nCamada 2 - Modelo estrutural (estoque-fluxo) 2026-2030:")
    build_estrutural(serie_anual)
    print(f"\nCamada 3 - Monte Carlo ({N_SIMS} sims/cenario):")
    build_montecarlo()

    print("\nConcluido.")


if __name__ == "__main__":
    main()

#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Preparacao de dados do Dashboard "SINDICARNES Acre".

Le os arquivos JA TRATADOS da consultoria (JSON/CSV/XLSX) e gera arquivos
JSON limpos em dashboard/data/, que sao importados em build-time pelo app
Next.js. NAO modifica os dados originais.

Uso:
    cd dashboard
    python scripts/prep_data.py
"""
from __future__ import annotations

import json
import math
import os
import sys

import pandas as pd

# ---------------------------------------------------------------------------
# Caminhos
# ---------------------------------------------------------------------------
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DASHBOARD_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, ".."))
WORKSPACE_DIR = os.path.abspath(os.path.join(DASHBOARD_DIR, ".."))

# Permite sobrescrever a origem via variavel de ambiente
SRC = os.environ.get(
    "CONSULTORIA_SRC",
    os.path.join(WORKSPACE_DIR, "Consultoria Frigorificos", "Consultoria Frigorificos"),
)
OUT_DIR = os.path.join(DASHBOARD_DIR, "data")
PUBLIC_DIR = os.path.join(DASHBOARD_DIR, "public")

os.makedirs(OUT_DIR, exist_ok=True)
os.makedirs(PUBLIC_DIR, exist_ok=True)


def src(*parts: str) -> str:
    return os.path.join(SRC, *parts)


def write_json(name: str, data) -> None:
    path = os.path.join(OUT_DIR, name)
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(data, fh, ensure_ascii=False, indent=2)
    print(f"  ok  data/{name}  ({os.path.getsize(path):,} bytes)")


def clean(value):
    """Converte NaN/inf -> None e numpy types -> python nativos."""
    if value is None:
        return None
    if isinstance(value, float):
        if math.isnan(value) or math.isinf(value):
            return None
        return round(value, 4)
    return value


def records(df: pd.DataFrame) -> list[dict]:
    df = df.where(pd.notnull(df), None)
    out = []
    for row in df.to_dict(orient="records"):
        out.append({k: clean(v) for k, v in row.items()})
    return out


# ---------------------------------------------------------------------------
# 1) KPIs (kpi_stats + executive_summary)
# ---------------------------------------------------------------------------
def build_kpis():
    with open(src("EDA_output", "kpi_stats.json"), encoding="utf-8") as fh:
        kpi = json.load(fh)
    with open(src("PRESENTATION", "executive_summary.json"), encoding="utf-8") as fh:
        exe = json.load(fh)
    payload = {
        "kpi": kpi,
        "executive": exe,
    }
    write_json("kpis.json", payload)


# ---------------------------------------------------------------------------
# 2) Serie anual consolidada
# ---------------------------------------------------------------------------
def build_serie_anual():
    df = pd.read_csv(src("RELATORIO", "serie_historica_consolidada.csv"))
    df.columns = [c.strip() for c in df.columns]
    write_json("serie_anual.json", records(df))


# ---------------------------------------------------------------------------
# 3) Painel mensal (2013-2026)
# ---------------------------------------------------------------------------
def build_painel_mensal():
    df = pd.read_csv(src("EDA_output", "dataset_painel_mensal.csv"))
    df.columns = [c.strip() for c in df.columns]
    if "data" in df.columns:
        df["data"] = df["data"].astype(str).str.slice(0, 10)
    write_json("painel_mensal.json", records(df))


# ---------------------------------------------------------------------------
# 4) Destinos por UF (IDAF Bovinos)
# ---------------------------------------------------------------------------
UF_NOMES = {
    "RO": "Rondonia", "AM": "Amazonas", "SP": "Sao Paulo", "MT": "Mato Grosso",
    "AC": "Acre", "PA": "Para", "GO": "Goias", "MG": "Minas Gerais",
    "RR": "Roraima", "TO": "Tocantins", "MS": "Mato Grosso do Sul",
    "BA": "Bahia", "MA": "Maranhao", "PR": "Parana", "RS": "Rio Grande do Sul",
    "CE": "Ceara", "PE": "Pernambuco", "DF": "Distrito Federal",
}


def build_destinos():
    f = src("2026_04_30- idaf", "2026_04_30", "Bovinos",
            "exportacoes_por_ano_mes_destino_uf.xlsx")
    df = pd.read_excel(f)
    df = df[["ano", "mes", "estado_destino_siglauf", "total", "machos", "femeas"]].copy()
    df = df.rename(columns={"estado_destino_siglauf": "uf"})
    df["total"] = pd.to_numeric(df["total"], errors="coerce").fillna(0)

    # total acumulado por UF (todos os anos)
    by_uf = (
        df.groupby("uf")["total"].sum().sort_values(ascending=False).reset_index()
    )
    by_uf["nome"] = by_uf["uf"].map(lambda u: UF_NOMES.get(u, u))
    total_geral = float(by_uf["total"].sum()) or 1.0
    by_uf["share"] = (by_uf["total"] / total_geral * 100).round(2)

    # total por ano e UF (para series e share MT)
    by_year = df.groupby(["ano", "uf"])["total"].sum().reset_index()
    pivot = by_year.pivot(index="ano", columns="uf", values="total").fillna(0)
    mt_share = []
    for ano, row in pivot.iterrows():
        tot = float(row.sum()) or 1.0
        mt = float(row.get("MT", 0))
        mt_share.append({"ano": int(ano), "total": int(tot), "mt": int(mt),
                         "share_mt": round(mt / tot * 100, 2)})

    # total por ano e UF, com share dentro do ano (para o mapa com slider)
    by_uf_year = []
    for ano, grp in by_year.groupby("ano"):
        tot_ano = float(grp["total"].sum()) or 1.0
        rows = grp.sort_values("total", ascending=False)
        for _, r in rows.iterrows():
            t = float(r["total"])
            by_uf_year.append({
                "ano": int(ano),
                "uf": r["uf"],
                "nome": UF_NOMES.get(r["uf"], r["uf"]),
                "total": int(t),
                "share": round(t / tot_ano * 100, 2),
            })

    # total por ano-mes e UF (para a serie mensal de participacao de MT)
    by_month = df.groupby(["ano", "mes", "uf"])["total"].sum().reset_index()
    pivot_m = by_month.pivot_table(index=["ano", "mes"], columns="uf",
                                   values="total", aggfunc="sum").fillna(0)
    mt_share_month = []
    for (ano, mes), row in pivot_m.iterrows():
        tot = float(row.sum()) or 1.0
        mt = float(row.get("MT", 0))
        mt_share_month.append({
            "data": f"{int(ano):04d}-{int(mes):02d}-01",
            "ano": int(ano), "mes": int(mes),
            "total": int(tot), "mt": int(mt),
            "share_mt": round(mt / tot * 100, 2),
        })

    payload = {
        "by_uf": records(by_uf),
        "by_uf_year": by_uf_year,
        "years": [int(a) for a in sorted(pivot.index)],
        "mt_share_by_year": mt_share,
        "mt_share_by_month": mt_share_month,
        "ultimo_ano": int(pivot.index.max()),
    }
    write_json("destinos_uf.json", payload)


# ---------------------------------------------------------------------------
# 5) Modelos estatisticos
# ---------------------------------------------------------------------------
def build_modelos():
    with open(src("RELATORIO", "estatisticas_modelos.json"), encoding="utf-8") as fh:
        modelos = json.load(fh)
    write_json("modelos.json", modelos)


# ---------------------------------------------------------------------------
# 6) Cenarios 2030
# ---------------------------------------------------------------------------
def build_cenarios():
    with open(src("PRESENTATION", "executive_summary.json"), encoding="utf-8") as fh:
        exe = json.load(fh)
    with open(src("EDA_output", "kpi_stats.json"), encoding="utf-8") as fh:
        kpi = json.load(fh)
    payload = {
        "baseline_2025": {
            "abates": kpi["abates_2025"],
            "export": kpi["export_2025"],
            "evasion_pct": kpi["taxa_evasao_2025"],
        },
        "scenarios_2030": exe["scenarios_2030"],
        "estimated_saturation_year": exe["key_metrics"]["estimated_saturation_year"],
    }
    write_json("cenarios.json", payload)


# ---------------------------------------------------------------------------
# 7) Emprego (RAIS evolucao_anual)
# ---------------------------------------------------------------------------
def build_emprego():
    def evol(fname):
        df = pd.read_excel(src("RAIS", fname), sheet_name="evolucao_anual")
        df = df.rename(columns={
            "total_vinculos": "vinculos",
            "trabalhadores_ativos": "ativos",
            "rem_media_media": "rem_media",
            "massa_salarial": "massa",
        })
        return records(df[["ano", "vinculos", "ativos", "rem_media", "massa"]])

    payload = {
        "frigorifico": evol("ACRE_frigorifico_abate_detalhado_2015_2025.xlsx"),
        "pecuaria": evol("ACRE_pecuaria_bovina_detalhado_2015_2025.xlsx"),
    }
    write_json("emprego.json", payload)


# ---------------------------------------------------------------------------
# 8) Precos (boi gordo x bezerro, mensal)
# ---------------------------------------------------------------------------
def build_precos():
    df = pd.read_csv(src("EDA_output", "dataset_painel_mensal.csv"))
    df.columns = [c.strip() for c in df.columns]
    cols = ["data", "ano", "mes", "boi_gordo_r_arroba", "bezerro_r_cabeca"]
    df = df[cols].copy()
    df["data"] = df["data"].astype(str).str.slice(0, 10)
    df = df.rename(columns={"boi_gordo_r_arroba": "boi", "bezerro_r_cabeca": "bezerro"})
    df = df[df["boi"].notna() | df["bezerro"].notna()]
    write_json("precos.json", records(df))


# ---------------------------------------------------------------------------
def main():
    print(f"Origem dos dados: {SRC}")
    if not os.path.isdir(SRC):
        print("ERRO: pasta de origem nao encontrada. "
              "Defina CONSULTORIA_SRC ou ajuste o caminho.", file=sys.stderr)
        sys.exit(1)
    print(f"Saida:            {OUT_DIR}\n")

    build_kpis()
    build_serie_anual()
    build_painel_mensal()
    build_destinos()
    build_modelos()
    build_cenarios()
    build_emprego()
    build_precos()

    print("\nConcluido.")


if __name__ == "__main__":
    main()

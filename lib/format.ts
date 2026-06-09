// Formatadores pt-BR reutilizados em todo o dashboard.

const nfInt = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const nf2 = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function fmtInt(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return nfInt.format(value);
}

export function fmtPct(value: number | null | undefined, dec = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${(dec === 1 ? nf1 : nf2).format(value)}%`;
}

export function fmtBRL(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `R$ ${nf2.format(value)}`;
}

export function fmtCompact(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  if (Math.abs(value) >= 1_000_000) return `${nf1.format(value / 1_000_000)} mi`;
  if (Math.abs(value) >= 1_000) return `${nf1.format(value / 1_000)} mil`;
  return nfInt.format(value);
}

const MESES = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];

export function fmtMesAno(data: string): string {
  // data no formato YYYY-MM-DD
  const [ano, mes] = data.split("-");
  const idx = Number(mes) - 1;
  return `${MESES[idx] ?? mes}/${ano.slice(2)}`;
}

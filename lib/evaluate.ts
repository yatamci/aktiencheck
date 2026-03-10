export type Score = 'good' | 'warn' | 'bad' | 'neutral'

export interface StockData {
  name?: string
  symbol?: string
  sector?: string
  industry?: string
  price?: number | null
  currency?: string
  pe?: number | null
  ps?: number | null
  pb?: number | null
  roe?: number | null
  roa?: number | null
  debt?: number | null
  currentRatio?: number | null
  cashflow?: number | null
  grossMargin?: number | null
  operatingMargin?: number | null
  netMargin?: number | null
  rsi?: number | null
  dividendYield?: number | null
  revenueGrowth?: number | null
  earningsGrowth?: number | null
  error?: string
}

export interface MetricResult {
  key: string
  label: string
  value: number | null | undefined
  score: Score
  description: string
  goodThreshold: string
  warnThreshold: string
  badThreshold: string
  unit?: string
  formatType?: 'number' | 'percent' | 'ratio' | 'currency'
}

export function evaluatePE(v?: number | null): Score {
  if (v == null || v <= 0) return 'neutral'
  if (v < 15) return 'good'
  if (v < 25) return 'warn'
  return 'bad'
}

export function evaluatePS(v?: number | null): Score {
  if (v == null) return 'neutral'
  if (v < 2) return 'good'
  if (v < 5) return 'warn'
  return 'bad'
}

export function evaluatePB(v?: number | null): Score {
  if (v == null) return 'neutral'
  if (v < 1.5) return 'good'
  if (v < 4) return 'warn'
  return 'bad'
}

export function evaluateROE(v?: number | null): Score {
  if (v == null) return 'neutral'
  if (v > 0.2) return 'good'
  if (v > 0.1) return 'warn'
  return 'bad'
}

export function evaluateROA(v?: number | null): Score {
  if (v == null) return 'neutral'
  if (v > 0.1) return 'good'
  if (v > 0.05) return 'warn'
  return 'bad'
}

export function evaluateDebt(v?: number | null): Score {
  if (v == null) return 'neutral'
  if (v < 0.5) return 'good'
  if (v < 1.5) return 'warn'
  return 'bad'
}

export function evaluateCurrentRatio(v?: number | null): Score {
  if (v == null) return 'neutral'
  if (v > 2) return 'good'
  if (v > 1) return 'warn'
  return 'bad'
}

export function evaluateCashflow(v?: number | null): Score {
  if (v == null) return 'neutral'
  if (v > 5) return 'good'
  if (v > 0) return 'warn'
  return 'bad'
}

export function evaluateGrossMargin(v?: number | null): Score {
  if (v == null) return 'neutral'
  if (v > 0.4) return 'good'
  if (v > 0.2) return 'warn'
  return 'bad'
}

export function evaluateOperatingMargin(v?: number | null): Score {
  if (v == null) return 'neutral'
  if (v > 0.15) return 'good'
  if (v > 0.05) return 'warn'
  return 'bad'
}

export function evaluateNetMargin(v?: number | null): Score {
  if (v == null) return 'neutral'
  if (v > 0.1) return 'good'
  if (v > 0.03) return 'warn'
  return 'bad'
}

export function evaluateRSI(v?: number | null): Score {
  if (v == null) return 'neutral'
  if (v < 30) return 'good'
  if (v < 70) return 'warn'
  return 'bad'
}

export function evaluateDividendYield(v?: number | null): Score {
  if (v == null || v === 0) return 'neutral'
  if (v > 0.03) return 'good'
  if (v > 0.01) return 'warn'
  return 'neutral'
}

export function evaluateRevenueGrowth(v?: number | null): Score {
  if (v == null) return 'neutral'
  if (v > 0.1) return 'good'
  if (v > 0) return 'warn'
  return 'bad'
}

export function evaluateEarningsGrowth(v?: number | null): Score {
  if (v == null) return 'neutral'
  if (v > 0.1) return 'good'
  if (v > 0) return 'warn'
  return 'bad'
}

export function buildMetrics(data: StockData): MetricResult[] {
  return [
    {
      key: 'pe',
      label: 'KGV (Kurs-Gewinn-Verhältnis)',
      value: data.pe,
      score: evaluatePE(data.pe),
      description: 'Zeigt, wie viel Anleger bereit sind, pro Euro Gewinn zu zahlen.',
      goodThreshold: '< 15',
      warnThreshold: '15–25',
      badThreshold: '> 25',
      formatType: 'ratio',
    },
    {
      key: 'ps',
      label: 'KUV (Kurs-Umsatz-Verhältnis)',
      value: data.ps,
      score: evaluatePS(data.ps),
      description: 'Vergleicht Marktkapitalisierung mit dem Umsatz.',
      goodThreshold: '< 2',
      warnThreshold: '2–5',
      badThreshold: '> 5',
      formatType: 'ratio',
    },
    {
      key: 'pb',
      label: 'KBV (Kurs-Buchwert-Verhältnis)',
      value: data.pb,
      score: evaluatePB(data.pb),
      description: 'Vergleicht Börsenwert mit dem Buchwert des Unternehmens.',
      goodThreshold: '< 1.5',
      warnThreshold: '1.5–4',
      badThreshold: '> 4',
      formatType: 'ratio',
    },
    {
      key: 'roe',
      label: 'ROE (Eigenkapitalrendite)',
      value: data.roe,
      score: evaluateROE(data.roe),
      description: 'Wie effizient nutzt das Unternehmen das Eigenkapital der Aktionäre?',
      goodThreshold: '> 20%',
      warnThreshold: '10–20%',
      badThreshold: '< 10%',
      formatType: 'percent',
    },
    {
      key: 'roa',
      label: 'ROA (Gesamtkapitalrendite)',
      value: data.roa,
      score: evaluateROA(data.roa),
      description: 'Wie profitabel ist das Unternehmen im Verhältnis zu seinen Gesamtaktiva?',
      goodThreshold: '> 10%',
      warnThreshold: '5–10%',
      badThreshold: '< 5%',
      formatType: 'percent',
    },
    {
      key: 'grossMargin',
      label: 'Bruttomarge',
      value: data.grossMargin,
      score: evaluateGrossMargin(data.grossMargin),
      description: 'Anteil des Umsatzes, der nach Abzug der Herstellungskosten verbleibt.',
      goodThreshold: '> 40%',
      warnThreshold: '20–40%',
      badThreshold: '< 20%',
      formatType: 'percent',
    },
    {
      key: 'operatingMargin',
      label: 'Operative Marge',
      value: data.operatingMargin,
      score: evaluateOperatingMargin(data.operatingMargin),
      description: 'Operative Gewinnspanne nach Betriebs- und Verwaltungskosten.',
      goodThreshold: '> 15%',
      warnThreshold: '5–15%',
      badThreshold: '< 5%',
      formatType: 'percent',
    },
    {
      key: 'netMargin',
      label: 'Nettomarge',
      value: data.netMargin,
      score: evaluateNetMargin(data.netMargin),
      description: 'Prozentualer Anteil des Nettogewinns am Gesamtumsatz.',
      goodThreshold: '> 10%',
      warnThreshold: '3–10%',
      badThreshold: '< 3%',
      formatType: 'percent',
    },
    {
      key: 'cashflow',
      label: 'Free Cashflow je Aktie',
      value: data.cashflow,
      score: evaluateCashflow(data.cashflow),
      description: 'Frei verfügbarer Cashflow pro Aktie nach Investitionen.',
      goodThreshold: '> 5',
      warnThreshold: '0–5',
      badThreshold: '< 0',
      formatType: 'currency',
    },
    {
      key: 'debt',
      label: 'Verschuldungsgrad',
      value: data.debt,
      score: evaluateDebt(data.debt),
      description: 'Verhältnis von Fremdkapital zu Eigenkapital.',
      goodThreshold: '< 0.5',
      warnThreshold: '0.5–1.5',
      badThreshold: '> 1.5',
      formatType: 'ratio',
    },
    {
      key: 'currentRatio',
      label: 'Current Ratio (Liquidität)',
      value: data.currentRatio,
      score: evaluateCurrentRatio(data.currentRatio),
      description: 'Kurzfristige Zahlungsfähigkeit: Umlaufvermögen / kurzfristige Verbindlichkeiten.',
      goodThreshold: '> 2',
      warnThreshold: '1–2',
      badThreshold: '< 1',
      formatType: 'ratio',
    },
    {
      key: 'rsi',
      label: 'RSI (Relative Strength Index)',
      value: data.rsi,
      score: evaluateRSI(data.rsi),
      description: 'Technischer Indikator: < 30 überverkauft, > 70 überkauft.',
      goodThreshold: '< 30 (überverkauft)',
      warnThreshold: '30–70 (neutral)',
      badThreshold: '> 70 (überkauft)',
      formatType: 'number',
    },
    {
      key: 'dividendYield',
      label: 'Dividendenrendite',
      value: data.dividendYield,
      score: evaluateDividendYield(data.dividendYield),
      description: 'Jährliche Dividende im Verhältnis zum aktuellen Aktienkurs.',
      goodThreshold: '> 3%',
      warnThreshold: '1–3%',
      badThreshold: '0% (keine Dividende)',
      formatType: 'percent',
    },
    {
      key: 'revenueGrowth',
      label: 'Umsatzwachstum (YoY)',
      value: data.revenueGrowth,
      score: evaluateRevenueGrowth(data.revenueGrowth),
      description: 'Prozentuales Umsatzwachstum im Vergleich zum Vorjahr.',
      goodThreshold: '> 10%',
      warnThreshold: '0–10%',
      badThreshold: '< 0%',
      formatType: 'percent',
    },
    {
      key: 'earningsGrowth',
      label: 'Gewinnwachstum (YoY)',
      value: data.earningsGrowth,
      score: evaluateEarningsGrowth(data.earningsGrowth),
      description: 'Prozentuales Gewinnwachstum im Vergleich zum Vorjahr.',
      goodThreshold: '> 10%',
      warnThreshold: '0–10%',
      badThreshold: '< 0%',
      formatType: 'percent',
    },
  ]
}

export function calculateOverallScore(metrics: MetricResult[]): {
  score: number
  maxScore: number
  label: string
  color: string
} {
  const relevant = metrics.filter((m) => m.score !== 'neutral')
  const good = relevant.filter((m) => m.score === 'good').length
  const warn = relevant.filter((m) => m.score === 'warn').length
  const score = good * 2 + warn * 1
  const maxScore = relevant.length * 2

  const pct = maxScore > 0 ? score / maxScore : 0
  let label = 'Unzureichend'
  let color = '#FF3B30'
  if (pct >= 0.75) { label = 'Sehr gut'; color = '#00C853' }
  else if (pct >= 0.55) { label = 'Gut'; color = '#4CAF50' }
  else if (pct >= 0.4) { label = 'Neutral'; color = '#FFCC00' }
  else if (pct >= 0.25) { label = 'Schwach'; color = '#FF9500' }

  return { score, maxScore, label, color }
}

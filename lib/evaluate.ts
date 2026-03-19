export type Score = 'good' | 'warn' | 'bad' | 'neutral'

export interface ChartPoint {
  date: string
  close: number | null
  ma50:  number | null
  ma200: number | null
}

export interface StockData {
  name?: string
  symbol?: string
  sector?: string
  industry?: string
  price?: number | null
  priceEur?: number | null
  currency?: string
  priceDate?: string | null
  description?: string | null
  founded?: string | null
  hq?: string | null
  employees?: string | null
  ceo?: string | null
  website?: string | null

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

  chartData?: ChartPoint[]
  crossSignal?: 'golden' | 'death' | 'none'
  ma50Latest?: number | null
  ma200Latest?: number | null

  error?: string
  rateLimited?: boolean
  // Historical annual data for mini charts (oldest → newest)
  historicalMetrics?: {
    pe?:             { date: string; value: number }[]
    ps?:             { date: string; value: number }[]
    pb?:             { date: string; value: number }[]
    roe?:            { date: string; value: number }[]
    netMargin?:      { date: string; value: number }[]
    revenueGrowth?:  { date: string; value: number }[]
  }
}

export interface MetricResult {
  key: string
  label: string
  value: number | null | undefined
  score: Score
  description: string
  formatType?: 'number' | 'percent' | 'ratio' | 'currency'
  // Expand panel info
  formula: string
  thresholds: { good: string; warn: string; bad: string }
  interpretation: string
}

// ── Evaluation functions ──────────────────────────────────────────
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

// ── Build full metric list ────────────────────────────────────────
export function buildMetrics(data: StockData): MetricResult[] {
  return [
    {
      key: 'pe', label: 'KGV (Kurs-Gewinn-Verhältnis)',
      value: data.pe, score: evaluatePE(data.pe), formatType: 'ratio',
      description: 'Wie viel zahlen Anleger pro Euro Gewinn?',
      formula: 'KGV = Aktienkurs ÷ Gewinn je Aktie (EPS)',
      thresholds: { good: '< 15 – günstig bewertet', warn: '15–25 – moderat bewertet', bad: '> 25 – teuer bewertet' },
      interpretation: 'Ein niedriges KGV deutet auf eine günstige Bewertung hin, kann aber auch auf geringe Wachstumserwartungen hinweisen. Wachstumsunternehmen haben oft höhere KGVs.',
    },
    {
      key: 'ps', label: 'KUV (Kurs-Umsatz-Verhältnis)',
      value: data.ps, score: evaluatePS(data.ps), formatType: 'ratio',
      description: 'Marktkapitalisierung im Verhältnis zum Umsatz.',
      formula: 'KUV = Marktkapitalisierung ÷ Jahresumsatz',
      thresholds: { good: '< 2 – günstig', warn: '2–5 – moderat', bad: '> 5 – hoch bewertet' },
      interpretation: 'Besonders nützlich für Unternehmen ohne Gewinn. Gibt an, wie viel Anleger pro Euro Umsatz zahlen.',
    },
    {
      key: 'pb', label: 'KBV (Kurs-Buchwert-Verhältnis)',
      value: data.pb, score: evaluatePB(data.pb), formatType: 'ratio',
      description: 'Börsenwert verglichen mit dem Buchwert.',
      formula: 'KBV = Aktienkurs ÷ Buchwert je Aktie',
      thresholds: { good: '< 1,5 – unter Buchwert', warn: '1,5–4 – moderat', bad: '> 4 – deutlich über Buchwert' },
      interpretation: 'Ein KBV unter 1 bedeutet, die Aktie ist günstiger als das Nettovermögen des Unternehmens. Bei Technologieunternehmen ist ein höheres KBV typisch.',
    },
    {
      key: 'roe', label: 'ROE (Eigenkapitalrendite)',
      value: data.roe, score: evaluateROE(data.roe), formatType: 'percent',
      description: 'Wie effizient wird das Eigenkapital eingesetzt?',
      formula: 'ROE = Nettogewinn ÷ Eigenkapital × 100',
      thresholds: { good: '> 20 % – sehr effizient', warn: '10–20 % – solide', bad: '< 10 % – schwach' },
      interpretation: 'Misst die Rentabilität des eingesetzten Eigenkapitals. Ein hoher ROE zeigt, dass das Management das Kapital der Aktionäre effektiv nutzt.',
    },
    {
      key: 'roa', label: 'ROA (Gesamtkapitalrendite)',
      value: data.roa, score: evaluateROA(data.roa), formatType: 'percent',
      description: 'Rentabilität bezogen auf alle Aktiva.',
      formula: 'ROA = Nettogewinn ÷ Gesamtvermögen × 100',
      thresholds: { good: '> 10 % – sehr gut', warn: '5–10 % – solide', bad: '< 5 % – schwach' },
      interpretation: 'Zeigt, wie profitabel ein Unternehmen im Verhältnis zu seinem Gesamtvermögen ist. Kapitalintensive Branchen haben naturgemäß niedrigere ROAs.',
    },
    {
      key: 'grossMargin', label: 'Bruttomarge',
      value: data.grossMargin, score: evaluateGrossMargin(data.grossMargin), formatType: 'percent',
      description: 'Umsatzanteil nach Herstellungskosten.',
      formula: 'Bruttomarge = (Umsatz − Herstellungskosten) ÷ Umsatz × 100',
      thresholds: { good: '> 40 % – sehr gut', warn: '20–40 % – solide', bad: '< 20 % – niedrig' },
      interpretation: 'Hohe Bruttomargen deuten auf Preismacht oder skalierbare Produkte hin. Software- und Pharmaunternehmen haben typischerweise sehr hohe Bruttomargen.',
    },
    {
      key: 'operatingMargin', label: 'Operative Marge',
      value: data.operatingMargin, score: evaluateOperatingMargin(data.operatingMargin), formatType: 'percent',
      description: 'Gewinnspanne nach Betriebs- und Verwaltungskosten.',
      formula: 'Operative Marge = Betriebsgewinn (EBIT) ÷ Umsatz × 100',
      thresholds: { good: '> 15 % – stark', warn: '5–15 % – moderat', bad: '< 5 % – schwach' },
      interpretation: 'Gibt an, wie viel vom Umsatz nach allen operativen Kosten übrig bleibt. Zeigt die operative Effizienz des Unternehmens.',
    },
    {
      key: 'netMargin', label: 'Nettomarge',
      value: data.netMargin, score: evaluateNetMargin(data.netMargin), formatType: 'percent',
      description: 'Nettogewinn in Prozent des Umsatzes.',
      formula: 'Nettomarge = Nettogewinn ÷ Umsatz × 100',
      thresholds: { good: '> 10 % – sehr gut', warn: '3–10 % – solide', bad: '< 3 % – niedrig' },
      interpretation: 'Die endgültige Rentabilität nach allen Kosten inkl. Steuern und Zinsen. Eine der wichtigsten Kennzahlen für die Gesamtprofitabilität.',
    },
    {
      key: 'cashflow', label: 'Free Cashflow je Aktie',
      value: data.cashflow, score: evaluateCashflow(data.cashflow), formatType: 'currency',
      description: 'Frei verfügbarer Cashflow pro Aktie nach Investitionen.',
      formula: 'FCF je Aktie = (Operativer Cashflow − Investitionsausgaben) ÷ Aktien',
      thresholds: { good: '> 5 € – stark', warn: '0–5 € – positiv', bad: '< 0 € – negativ' },
      interpretation: 'Positiver freier Cashflow bedeutet, das Unternehmen generiert echtes Geld. Besonders wichtig, da er schwerer zu manipulieren ist als der Gewinn.',
    },
    {
      key: 'debt', label: 'Verschuldungsgrad',
      value: data.debt, score: evaluateDebt(data.debt), formatType: 'ratio',
      description: 'Verhältnis von Fremd- zu Eigenkapital.',
      formula: 'Verschuldungsgrad = Fremdkapital ÷ Eigenkapital',
      thresholds: { good: '< 0,5 – konservativ', warn: '0,5–1,5 – moderat', bad: '> 1,5 – hoch verschuldet' },
      interpretation: 'Zeigt die finanzielle Hebelwirkung. Eine hohe Verschuldung erhöht das Risiko, kann aber auch die Rendite steigern. In Krisenzeiten besonders kritisch.',
    },
    {
      key: 'currentRatio', label: 'Current Ratio (Liquidität)',
      value: data.currentRatio, score: evaluateCurrentRatio(data.currentRatio), formatType: 'ratio',
      description: 'Kurzfristige Zahlungsfähigkeit.',
      formula: 'Current Ratio = Umlaufvermögen ÷ Kurzfristige Verbindlichkeiten',
      thresholds: { good: '> 2 – sehr liquide', warn: '1–2 – ausreichend', bad: '< 1 – kritisch' },
      interpretation: 'Misst, ob das Unternehmen kurzfristige Verbindlichkeiten mit kurzfristigen Vermögenswerten decken kann. Unter 1 ist ein Warnsignal.',
    },
    {
      key: 'rsi', label: 'RSI (Relative Strength Index)',
      value: data.rsi, score: evaluateRSI(data.rsi), formatType: 'number',
      description: 'Technischer Indikator: < 30 überverkauft, > 70 überkauft.',
      formula: 'RSI = 100 − (100 ÷ (1 + Ø Kursgewinne / Ø Kursverluste)) über 14 Tage',
      thresholds: { good: '< 30 – überverkauft (Kaufgelegenheit)', warn: '30–70 – neutral', bad: '> 70 – überkauft (mögliche Korrektur)' },
      interpretation: 'Der RSI misst die Stärke und Geschwindigkeit von Kursbewegungen. Werte unter 30 deuten auf eine überverkaufte, Werte über 70 auf eine überkaufte Situation hin.',
    },
    {
      key: 'dividendYield', label: 'Dividendenrendite',
      value: data.dividendYield, score: evaluateDividendYield(data.dividendYield), formatType: 'percent',
      description: 'Jährliche Dividende im Verhältnis zum Aktienkurs.',
      formula: 'Dividendenrendite = Dividende je Aktie ÷ Aktienkurs × 100',
      thresholds: { good: '> 3 % – attraktiv', warn: '1–3 % – moderat', bad: 'Keine Dividende' },
      interpretation: 'Viele Wachstumsunternehmen zahlen keine Dividende, reinvestieren Gewinne stattdessen. Eine sehr hohe Rendite kann auch ein Warnsignal für einen fallenden Kurs sein.',
    },
    {
      key: 'revenueGrowth', label: 'Umsatzwachstum (YoY)',
      value: data.revenueGrowth, score: evaluateRevenueGrowth(data.revenueGrowth), formatType: 'percent',
      description: 'Umsatzwachstum im Vergleich zum Vorjahr.',
      formula: 'Umsatzwachstum = (Umsatz aktuell − Umsatz Vorjahr) ÷ Umsatz Vorjahr × 100',
      thresholds: { good: '> 10 % – starkes Wachstum', warn: '0–10 % – moderates Wachstum', bad: '< 0 % – Umsatzrückgang' },
      interpretation: 'Kontinuierliches Umsatzwachstum ist ein positives Signal. Wichtig ist dabei auch die Nachhaltigkeit des Wachstums und die Margenentwicklung.',
    },
    {
      key: 'earningsGrowth', label: 'Gewinnwachstum (YoY)',
      value: data.earningsGrowth, score: evaluateEarningsGrowth(data.earningsGrowth), formatType: 'percent',
      description: 'Gewinnwachstum im Vergleich zum Vorjahr.',
      formula: 'Gewinnwachstum = (Nettogewinn aktuell − Nettogewinn Vorjahr) ÷ Nettogewinn Vorjahr × 100',
      thresholds: { good: '> 10 % – starkes Wachstum', warn: '0–10 % – moderates Wachstum', bad: '< 0 % – Gewinnrückgang' },
      interpretation: 'Steigendes Gewinnwachstum ist ein starkes Signal für die Qualität des Unternehmens. Sollte idealerweise schneller wachsen als der Umsatz.',
    },
  ]
}

// ── Overall score ─────────────────────────────────────────────────
export function calculateOverallScore(metrics: MetricResult[]): {
  score: number; maxScore: number; label: string; color: string
} {
  const relevant = metrics.filter((m) => m.score !== 'neutral')
  const good  = relevant.filter((m) => m.score === 'good').length
  const warn  = relevant.filter((m) => m.score === 'warn').length
  const score = good * 2 + warn * 1
  const maxScore = relevant.length * 2
  const pct = maxScore > 0 ? score / maxScore : 0

  let label = 'Unzureichend', color = '#FF3B30'
  if      (pct >= 0.75) { label = 'Sehr gut';  color = '#00C853' }
  else if (pct >= 0.55) { label = 'Gut';        color = '#4CAF50' }
  else if (pct >= 0.4)  { label = 'Neutral';    color = '#FFCC00' }
  else if (pct >= 0.25) { label = 'Schwach';    color = '#FF9500' }

  return { score, maxScore, label, color }
}

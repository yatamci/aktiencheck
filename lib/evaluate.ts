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

export type Lang = 'de' | 'en'

export interface MetricResult {
  key: string
  label: string
  labelEn: string
  value: number | null | undefined
  score: Score
  description: string
  descriptionEn: string
  formatType?: 'number' | 'percent' | 'ratio' | 'currency'
  formula: string
  formulaEn: string
  thresholds: { good: string; warn: string; bad: string }
  thresholdsEn: { good: string; warn: string; bad: string }
  interpretation: string
  interpretationEn: string
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
    { key:'pe', label:'KGV (Kurs-Gewinn-Verhältnis)', labelEn:'P/E Ratio',
      value:data.pe, score:evaluatePE(data.pe), formatType:'ratio',
      description:'Wie viel zahlen Anleger pro Euro Gewinn?', descriptionEn:'How much investors pay per unit of earnings.',
      formula:'KGV = Aktienkurs ÷ Gewinn je Aktie (EPS)', formulaEn:'P/E = Stock Price ÷ Earnings Per Share (EPS)',
      thresholds:{good:'< 15 – günstig bewertet',warn:'15–25 – moderat bewertet',bad:'> 25 – teuer bewertet'},
      thresholdsEn:{good:'< 15 – undervalued',warn:'15–25 – moderate',bad:'> 25 – overvalued'},
      interpretation:'Ein niedriges KGV deutet auf eine günstige Bewertung hin, kann aber auch auf geringe Wachstumserwartungen hinweisen. Wachstumsunternehmen haben oft höhere KGVs.',
      interpretationEn:'A low P/E may indicate undervaluation, but can also reflect low growth expectations. Growth companies typically carry higher P/E ratios.'},
    { key:'ps', label:'KUV (Kurs-Umsatz-Verhältnis)', labelEn:'P/S Ratio',
      value:data.ps, score:evaluatePS(data.ps), formatType:'ratio',
      description:'Marktkapitalisierung im Verhältnis zum Umsatz.', descriptionEn:'Market cap relative to revenue.',
      formula:'KUV = Marktkapitalisierung ÷ Jahresumsatz', formulaEn:'P/S = Market Cap ÷ Annual Revenue',
      thresholds:{good:'< 2 – günstig',warn:'2–5 – moderat',bad:'> 5 – hoch bewertet'},
      thresholdsEn:{good:'< 2 – cheap',warn:'2–5 – moderate',bad:'> 5 – expensive'},
      interpretation:'Besonders nützlich für Unternehmen ohne Gewinn. Gibt an, wie viel Anleger pro Euro Umsatz zahlen.',
      interpretationEn:'Useful for companies without profit. Indicates how much investors pay per unit of revenue.'},
    { key:'pb', label:'KBV (Kurs-Buchwert-Verhältnis)', labelEn:'P/B Ratio',
      value:data.pb, score:evaluatePB(data.pb), formatType:'ratio',
      description:'Börsenwert verglichen mit dem Buchwert.', descriptionEn:'Market value compared to book value.',
      formula:'KBV = Aktienkurs ÷ Buchwert je Aktie', formulaEn:'P/B = Stock Price ÷ Book Value per Share',
      thresholds:{good:'< 1,5 – unter Buchwert',warn:'1,5–4 – moderat',bad:'> 4 – deutlich über Buchwert'},
      thresholdsEn:{good:'< 1.5 – below book',warn:'1.5–4 – moderate',bad:'> 4 – well above book'},
      interpretation:'Ein KBV unter 1 bedeutet, die Aktie ist günstiger als das Nettovermögen des Unternehmens.',
      interpretationEn:'A P/B below 1 means the stock is cheaper than the company’s net assets.'},
    { key:'roe', label:'ROE (Eigenkapitalrendite)', labelEn:'ROE (Return on Equity)',
      value:data.roe, score:evaluateROE(data.roe), formatType:'percent',
      description:'Wie effizient wird das Eigenkapital eingesetzt?', descriptionEn:'How efficiently is equity being used?',
      formula:'ROE = Nettogewinn ÷ Eigenkapital × 100', formulaEn:'ROE = Net Income ÷ Equity × 100',
      thresholds:{good:'> 20 % – sehr effizient',warn:'10–20 % – solide',bad:'< 10 % – schwach'},
      thresholdsEn:{good:'> 20% – very efficient',warn:'10–20% – solid',bad:'< 10% – weak'},
      interpretation:'Misst die Rentabilität des eingesetzten Eigenkapitals. Ein hoher ROE zeigt, dass das Management das Kapital der Aktionäre effektiv nutzt.',
      interpretationEn:'Measures how profitably a company uses shareholders’ equity. A high ROE shows management is effective.'},
    { key:'roa', label:'ROA (Gesamtkapitalrendite)', labelEn:'ROA (Return on Assets)',
      value:data.roa, score:evaluateROA(data.roa), formatType:'percent',
      description:'Rentabilität bezogen auf alle Aktiva.', descriptionEn:'Profitability relative to total assets.',
      formula:'ROA = Nettogewinn ÷ Gesamtvermögen × 100', formulaEn:'ROA = Net Income ÷ Total Assets × 100',
      thresholds:{good:'> 10 % – sehr gut',warn:'5–10 % – solide',bad:'< 5 % – schwach'},
      thresholdsEn:{good:'> 10% – very good',warn:'5–10% – solid',bad:'< 5% – weak'},
      interpretation:'Zeigt, wie profitabel ein Unternehmen im Verhältnis zu seinem Gesamtvermögen ist. Kapitalintensive Branchen haben naturgemäß niedrigere ROAs.',
      interpretationEn:'Shows how profitably a company uses all its assets. Capital-intensive industries naturally have lower ROAs.'},
    { key:'grossMargin', label:'Bruttomarge', labelEn:'Gross Margin',
      value:data.grossMargin, score:evaluateGrossMargin(data.grossMargin), formatType:'percent',
      description:'Umsatzanteil nach Herstellungskosten.', descriptionEn:'Revenue remaining after production costs.',
      formula:'Bruttomarge = (Umsatz − Herstellungskosten) ÷ Umsatz × 100', formulaEn:'Gross Margin = (Revenue − COGS) ÷ Revenue × 100',
      thresholds:{good:'> 40 % – sehr gut',warn:'20–40 % – solide',bad:'< 20 % – niedrig'},
      thresholdsEn:{good:'> 40% – excellent',warn:'20–40% – solid',bad:'< 20% – low'},
      interpretation:'Hohe Bruttomargen deuten auf Preismacht oder skalierbare Produkte hin.',
      interpretationEn:'High gross margins indicate pricing power or scalable products.'},
    { key:'operatingMargin', label:'Operative Marge', labelEn:'Operating Margin',
      value:data.operatingMargin, score:evaluateOperatingMargin(data.operatingMargin), formatType:'percent',
      description:'Gewinnspanne nach Betriebs- und Verwaltungskosten.', descriptionEn:'Profit margin after operating expenses.',
      formula:'Operative Marge = Betriebsgewinn (EBIT) ÷ Umsatz × 100', formulaEn:'Operating Margin = EBIT ÷ Revenue × 100',
      thresholds:{good:'> 15 % – stark',warn:'5–15 % – moderat',bad:'< 5 % – schwach'},
      thresholdsEn:{good:'> 15% – strong',warn:'5–15% – moderate',bad:'< 5% – weak'},
      interpretation:'Gibt an, wie viel vom Umsatz nach allen operativen Kosten übrig bleibt.',
      interpretationEn:'Shows how much revenue remains after all operating costs.'},
    { key:'netMargin', label:'Nettomarge', labelEn:'Net Margin',
      value:data.netMargin, score:evaluateNetMargin(data.netMargin), formatType:'percent',
      description:'Nettogewinn in Prozent des Umsatzes.', descriptionEn:'Net profit as percentage of revenue.',
      formula:'Nettomarge = Nettogewinn ÷ Umsatz × 100', formulaEn:'Net Margin = Net Income ÷ Revenue × 100',
      thresholds:{good:'> 10 % – sehr gut',warn:'3–10 % – solide',bad:'< 3 % – niedrig'},
      thresholdsEn:{good:'> 10% – excellent',warn:'3–10% – solid',bad:'< 3% – low'},
      interpretation:'Die endgültige Rentabilität nach allen Kosten inkl. Steuern und Zinsen.',
      interpretationEn:'Final profitability after all costs including taxes and interest.'},
    { key:'cashflow', label:'Free Cashflow je Aktie', labelEn:'Free Cash Flow per Share',
      value:data.cashflow, score:evaluateCashflow(data.cashflow), formatType:'currency',
      description:'Frei verfügbarer Cashflow pro Aktie nach Investitionen.', descriptionEn:'Available cash per share after investments.',
      formula:'FCF je Aktie = (Operativer Cashflow − Investitionsausgaben) ÷ Aktien', formulaEn:'FCF/Share = (Operating CF − CapEx) ÷ Shares',
      thresholds:{good:'> 5 – stark',warn:'0–5 – positiv',bad:'< 0 – negativ'},
      thresholdsEn:{good:'> 5 – strong',warn:'0–5 – positive',bad:'< 0 – negative'},
      interpretation:'Positiver freier Cashflow bedeutet, das Unternehmen generiert echtes Geld.',
      interpretationEn:'Positive free cash flow means the company generates real cash.'},
    { key:'debt', label:'Verschuldungsgrad', labelEn:'Debt-to-Equity',
      value:data.debt, score:evaluateDebt(data.debt), formatType:'ratio',
      description:'Verhältnis von Fremd- zu Eigenkapital.', descriptionEn:'Ratio of debt to equity.',
      formula:'Verschuldungsgrad = Fremdkapital ÷ Eigenkapital', formulaEn:'D/E = Total Debt ÷ Equity',
      thresholds:{good:'< 0,5 – konservativ',warn:'0,5–1,5 – moderat',bad:'> 1,5 – hoch verschuldet'},
      thresholdsEn:{good:'< 0.5 – conservative',warn:'0.5–1.5 – moderate',bad:'> 1.5 – highly leveraged'},
      interpretation:'Zeigt die finanzielle Hebelwirkung. Eine hohe Verschuldung erhöht das Risiko.',
      interpretationEn:'Shows financial leverage. High debt increases risk, especially in downturns.'},
    { key:'currentRatio', label:'Current Ratio (Liquidität)', labelEn:'Current Ratio (Liquidity)',
      value:data.currentRatio, score:evaluateCurrentRatio(data.currentRatio), formatType:'ratio',
      description:'Kurzfristige Zahlungsfähigkeit.', descriptionEn:'Short-term payment ability.',
      formula:'Current Ratio = Umlaufvermögen ÷ Kurzfristige Verbindlichkeiten', formulaEn:'Current Ratio = Current Assets ÷ Current Liabilities',
      thresholds:{good:'> 2 – sehr liquide',warn:'1–2 – ausreichend',bad:'< 1 – kritisch'},
      thresholdsEn:{good:'> 2 – very liquid',warn:'1–2 – adequate',bad:'< 1 – critical'},
      interpretation:'Misst, ob das Unternehmen kurzfristige Verbindlichkeiten mit kurzfristigen Vermögenswerten decken kann.',
      interpretationEn:'Measures if the company can cover short-term liabilities with short-term assets.'},
    { key:'rsi', label:'RSI (Relative Strength Index)', labelEn:'RSI (Relative Strength Index)',
      value:data.rsi, score:evaluateRSI(data.rsi), formatType:'number',
      description:'Technischer Indikator: < 30 überverkauft, > 70 überkauft.', descriptionEn:'Technical indicator: < 30 oversold, > 70 overbought.',
      formula:'RSI = 100 − (100 ÷ (1 + Ø Gewinne / Ø Verluste)) über 14 Tage', formulaEn:'RSI = 100 − (100 ÷ (1 + Avg Gains / Avg Losses)) over 14 days',
      thresholds:{good:'< 30 – überverkauft (Kaufgelegenheit)',warn:'30–70 – neutral',bad:'> 70 – überkauft (mögliche Korrektur)'},
      thresholdsEn:{good:'< 30 – oversold (buy opportunity)',warn:'30–70 – neutral',bad:'> 70 – overbought (possible correction)'},
      interpretation:'Der RSI misst die Stärke von Kursbewegungen. Werte unter 30 deuten auf überverkaufte, Werte über 70 auf überkaufte Situationen hin.',
      interpretationEn:'RSI measures price movement strength. Below 30 indicates oversold, above 70 indicates overbought conditions.'},
    { key:'dividendYield', label:'Dividendenrendite', labelEn:'Dividend Yield',
      value:data.dividendYield, score:evaluateDividendYield(data.dividendYield), formatType:'percent',
      description:'Jährliche Dividende im Verhältnis zum Aktienkurs.', descriptionEn:'Annual dividend relative to stock price.',
      formula:'Dividendenrendite = Dividende je Aktie ÷ Aktienkurs × 100', formulaEn:'Dividend Yield = Dividend per Share ÷ Stock Price × 100',
      thresholds:{good:'> 3 % – attraktiv',warn:'1–3 % – moderat',bad:'Keine Dividende'},
      thresholdsEn:{good:'> 3% – attractive',warn:'1–3% – moderate',bad:'No dividend'},
      interpretation:'Viele Wachstumsunternehmen zahlen keine Dividende, reinvestieren Gewinne stattdessen.',
      interpretationEn:'Many growth companies pay no dividend, reinvesting profits instead.'},
    { key:'revenueGrowth', label:'Umsatzwachstum (YoY)', labelEn:'Revenue Growth (YoY)',
      value:data.revenueGrowth, score:evaluateRevenueGrowth(data.revenueGrowth), formatType:'percent',
      description:'Umsatzwachstum im Vergleich zum Vorjahr.', descriptionEn:'Revenue growth compared to prior year.',
      formula:'Umsatzwachstum = (Umsatz aktuell − Umsatz Vorjahr) ÷ Umsatz Vorjahr × 100', formulaEn:'Revenue Growth = (Current − Prior Revenue) ÷ Prior Revenue × 100',
      thresholds:{good:'> 10 % – starkes Wachstum',warn:'0–10 % – moderates Wachstum',bad:'< 0 % – Umsatzrückgang'},
      thresholdsEn:{good:'> 10% – strong growth',warn:'0–10% – moderate growth',bad:'< 0% – revenue decline'},
      interpretation:'Kontinuierliches Umsatzwachstum ist ein positives Signal.',
      interpretationEn:'Continuous revenue growth is a positive signal for business health.'},
    { key:'earningsGrowth', label:'Gewinnwachstum (YoY)', labelEn:'Earnings Growth (YoY)',
      value:data.earningsGrowth, score:evaluateEarningsGrowth(data.earningsGrowth), formatType:'percent',
      description:'Gewinnwachstum im Vergleich zum Vorjahr.', descriptionEn:'Earnings growth compared to prior year.',
      formula:'Gewinnwachstum = (Nettogewinn aktuell − Nettogewinn Vorjahr) ÷ Nettogewinn Vorjahr × 100', formulaEn:'Earnings Growth = (Current − Prior Net Income) ÷ Prior Net Income × 100',
      thresholds:{good:'> 10 % – starkes Wachstum',warn:'0–10 % – moderates Wachstum',bad:'< 0 % – Gewinnrückgang'},
      thresholdsEn:{good:'> 10% – strong growth',warn:'0–10% – moderate growth',bad:'< 0% – earnings decline'},
      interpretation:'Steigendes Gewinnwachstum ist ein starkes Signal für die Qualität des Unternehmens.',
      interpretationEn:'Rising earnings growth is a strong signal for company quality.'},
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

  let label = 'Unzureichend', labelEn = 'Insufficient', color = '#FF3B30'
  if      (pct >= 0.75) { label = 'Sehr gut';  labelEn = 'Excellent'; color = '#00C853' }
  else if (pct >= 0.55) { label = 'Gut';        labelEn = 'Good';      color = '#4CAF50' }
  else if (pct >= 0.4)  { label = 'Neutral';    labelEn = 'Neutral';   color = '#FFCC00' }
  else if (pct >= 0.25) { label = 'Schwach';    labelEn = 'Weak';      color = '#FF9500' }

  return { score, maxScore, label, labelEn, color }
}

import { NextRequest, NextResponse } from 'next/server'

// ─── Metric shape ────────────────────────────────────────────────────────────
interface StockMetrics {
  name:        string | null
  sector:      string | null
  industry:    string | null
  description: string | null
  price:       number | null
  currency:    string | null
  ipoDate:     string | null
  city:        string | null
  country:     string | null
  employees:   string | null
  ceo:         string | null
  pe:          number | null
  ps:          number | null
  pb:          number | null
  roe:         number | null
  roa:         number | null
  grossMargin: number | null
  operatingMargin: number | null
  netMargin:   number | null
  cashflow:    number | null
  debt:        number | null
  currentRatio:number | null
  rsi:         number | null
  dividendYield: number | null
  revenueGrowth: number | null
  earningsGrowth:number | null
  hist: { date: string; close: number }[]
}

function empty(): StockMetrics {
  return { name:null, sector:null, industry:null, description:null, price:null, currency:null,
    ipoDate:null, city:null, country:null, employees:null, ceo:null,
    pe:null, ps:null, pb:null, roe:null, roa:null, grossMargin:null,
    operatingMargin:null, netMargin:null, cashflow:null, debt:null,
    currentRatio:null, rsi:null, dividendYield:null, revenueGrowth:null,
    earningsGrowth:null, hist:[] }
}

// ─── Merge: first non-null wins ───────────────────────────────────────────────
function merge(base: StockMetrics, patch: Partial<StockMetrics>): StockMetrics {
  const out = { ...base }
  for (const k of Object.keys(patch) as (keyof StockMetrics)[]) {
    const v = patch[k]
    if (v == null) continue
    if (k === 'hist') {
      if (out.hist.length === 0 && Array.isArray(v)) (out as StockMetrics).hist = v as StockMetrics['hist']
    } else if (out[k] == null) {
      (out as Record<string, unknown>)[k] = v
    }
  }
  return out
}

function isFull(m: StockMetrics): boolean {
  const needed: (keyof StockMetrics)[] = ['name','price','pe','ps','pb','roe','roa','grossMargin','operatingMargin','netMargin','debt','currentRatio','dividendYield','revenueGrowth','earningsGrowth']
  return needed.every(k => m[k] != null)
}

// ─── HTTP helper ──────────────────────────────────────────────────────────────
async function get(url: string): Promise<unknown> {
  try {
    const r = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(8000) })
    return await r.json()
  } catch { return null }
}

function first(v: unknown): Record<string,unknown> {
  if (!v) return {}
  if (Array.isArray(v)) return (v[0] ?? {}) as Record<string,unknown>
  if (typeof v === 'object') return v as Record<string,unknown>
  return {}
}

function num(obj: Record<string,unknown>, ...keys: string[]): number | null {
  for (const k of keys) {
    const v = obj[k]
    if (v != null && typeof v === 'number' && isFinite(v) && v !== 0) return v
    if (v != null && typeof v === 'string' && v.trim() !== '' && v !== 'None' && v !== '-'
        && isFinite(Number(v)) && Number(v) !== 0) return Number(v)
  }
  return null
}
function str(obj: Record<string,unknown>, ...keys: string[]): string | null {
  for (const k of keys) {
    const v = obj[k]
    if (v && typeof v === 'string' && v.trim() && v !== 'null' && v !== 'None' && v !== 'N/A') return v.trim()
  }
  return null
}
function isLimited(d: unknown): boolean {
  const s = JSON.stringify(d ?? '').toLowerCase()
  return s.includes('"limit') || s.includes('rate limit') || s.includes('upgrade') ||
         s.includes('429') || s.includes('too many') || s.includes('quota')
}

// ─── Name → Ticker map ────────────────────────────────────────────────────────
const NAME_MAP: Record<string, string> = {
  'apple':'AAPL','microsoft':'MSFT','google':'GOOGL','alphabet':'GOOGL',
  'amazon':'AMZN','tesla':'TSLA','meta':'META','facebook':'META',
  'nvidia':'NVDA','netflix':'NFLX','xiaomi':'1810.HK','sap':'SAP',
  'volkswagen':'VOW3.DE','vw':'VOW3.DE','bmw':'BMW.DE',
  'mercedes':'MBG.DE','siemens':'SIE.DE','adidas':'ADS.DE',
  'bayer':'BAYN.DE','basf':'BAS.DE','allianz':'ALV.DE',
  'lufthansa':'LHA.DE','deutsche telekom':'DTE.DE','telekom':'DTE.DE',
  'deutsche bank':'DBK.DE','alibaba':'BABA','tencent':'0700.HK',
  'samsung':'005930.KS','berkshire':'BRK.B','jpmorgan':'JPM',
  'visa':'V','mastercard':'MA','paypal':'PYPL','walmart':'WMT',
  'disney':'DIS','boeing':'BA','airbus':'AIR.PA','asml':'ASML',
  'lvmh':'MC.PA','ferrari':'RACE','coinbase':'COIN',
  'amd':'AMD','intel':'INTC','qualcomm':'QCOM','broadcom':'AVGO',
  'oracle':'ORCL','salesforce':'CRM','adobe':'ADBE','uber':'UBER',
  'spotify':'SPOT','airbnb':'ABNB','palantir':'PLTR','snowflake':'SNOW',
  'shopify':'SHOP','rivian':'RIVN','lucid':'LCID',
  'porsche':'P911.DE','continental':'CON.DE','infineon':'IFX.DE',
  'rheinmetall':'RHM.DE','henkel':'HEN3.DE','merck':'MRK.DE',
  'fresenius':'FRE.DE','eon':'EOAN.DE','rwe':'RWE.DE',
  'totalenergies':'TTE.PA','bnp paribas':'BNP.PA','loreal':'OR.PA',
  'hermes':'RMS.PA','kering':'KER.PA',
}

function scoreResult(row: Record<string,unknown>, query: string): number {
  const ql   = query.toLowerCase()
  const name = String(row.name ?? '').toLowerCase()
  const sym  = String(row.symbol ?? '').toUpperCase()
  const exch = String(row.exchangeShortName ?? '').toUpperCase()
  const major = ['NASDAQ','NYSE','XETRA','LSE','HKG','EURONEXT','AMEX','SHH','SHZ']
  let s = 0
  if (sym === query.toUpperCase()) s += 100
  if (name === ql) s += 90
  if (name.startsWith(ql)) s += 60
  if (name.includes(' ' + ql)) s += 40
  if (name.includes(ql)) s += 20
  if (major.includes(exch)) s += 15
  if (!sym.includes('.')) s += 5
  return s
}

async function resolveTicker(query: string, fmpKey: string): Promise<string> {
  const q  = query.trim()
  const ql = q.toLowerCase().replace(/[^a-z0-9\s.]/g, '')

  // 1. Local name map (instant, no API)
  for (const [n, t] of Object.entries(NAME_MAP)) {
    if (ql === n || ql.startsWith(n + ' ') || n.startsWith(ql)) return t
  }

  // 2. FMP search + NASDAQ screener in parallel for maximum coverage
  const [fmpRaw, nasdaqRaw] = await Promise.all([
    get(`https://financialmodelingprep.com/stable/search?query=${encodeURIComponent(q)}&limit=20&apikey=${fmpKey}`),
    fetch(
      `https://api.nasdaq.com/api/screener/stocks?tableonly=true&limit=10&download=true&keyword=${encodeURIComponent(q)}`,
      { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(4000) }
    ).then(r => r.json()).catch(() => null),
  ])

  const fmpRows = Array.isArray(fmpRaw) ? fmpRaw as Record<string,unknown>[] : []
  // Safe deep access for NASDAQ response
  const nasdaqData  = nasdaqRaw as Record<string,unknown> | null
  const nasdaqTable = nasdaqData?.data as Record<string,unknown> | undefined
  const nasdaqInner = nasdaqTable?.table as Record<string,unknown> | undefined
  const nasdaqRows  = (nasdaqInner?.rows ?? []) as Record<string,unknown>[]
  const nasdaqNorm  = nasdaqRows.map(r => ({ symbol: r.symbol, name: r.name, exchangeShortName: 'NASDAQ' }))

  const all = [...fmpRows, ...nasdaqNorm].filter(r => r.symbol && r.name)
  if (all.length === 0) return q.toUpperCase()

  const best = all
    .map(r => ({ r, s: scoreResult(r, q) }))
    .sort((a, b) => b.s - a.s)[0]

  return String(best.r.symbol ?? q.toUpperCase())
}
// ─── Source fetchers ──────────────────────────────────────────────────────────

async function fromFMP(ticker: string, key: string): Promise<Partial<StockMetrics>> {
  const [pR, rR, mR, gR, tR, hR] = await Promise.all([
    get(`https://financialmodelingprep.com/stable/profile?symbol=${ticker}&apikey=${key}`),
    get(`https://financialmodelingprep.com/stable/ratios-ttm?symbol=${ticker}&apikey=${key}`),
    get(`https://financialmodelingprep.com/stable/key-metrics-ttm?symbol=${ticker}&apikey=${key}`),
    get(`https://financialmodelingprep.com/stable/financial-growth?symbol=${ticker}&limit=1&apikey=${key}`),
    get(`https://financialmodelingprep.com/stable/technical-indicator/daily?symbol=${ticker}&type=rsi&period=14&apikey=${key}`),
    get(`https://financialmodelingprep.com/stable/historical-price-eod/full?symbol=${ticker}&limit=250&apikey=${key}`),
  ])
  if (isLimited(pR)) return {}
  const p = first(pR), r = first(rR), m = first(mR), g = first(gR)
  let rsi: number | null = null
  if (Array.isArray(tR) && tR.length > 0) rsi = num(tR[0] as Record<string,unknown>,'rsi','value')
  let hist: StockMetrics['hist'] = []
  if (Array.isArray(hR)) hist = hR as StockMetrics['hist']
  else { const h = (hR as Record<string,unknown>)?.historical; if (Array.isArray(h)) hist = h as StockMetrics['hist'] }
  return {
    name: str(p,'companyName','name'), sector: str(p,'sector'), industry: str(p,'industry'),
    description: str(p,'description'), price: num(p,'price'), currency: str(p,'currency'),
    ipoDate: str(p,'ipoDate'), city: str(p,'city'), country: str(p,'country'),
    employees: p.fullTimeEmployees != null ? String(p.fullTimeEmployees) : null,
    ceo: str(p,'ceo'),
    pe: num(r,'peRatioTTM','peRatio','priceEarningsRatio'),
    ps: num(r,'priceToSalesRatioTTM','priceToSalesRatio'),
    pb: num(r,'priceToBookRatioTTM','priceToBookRatio'),
    roe: num(r,'returnOnEquityTTM','returnOnEquity'),
    roa: num(r,'returnOnAssetsTTM','returnOnAssets'),
    grossMargin: num(r,'grossProfitMarginTTM','grossProfitMargin'),
    operatingMargin: num(r,'operatingProfitMarginTTM','operatingProfitMargin'),
    netMargin: num(r,'netProfitMarginTTM','netProfitMargin'),
    cashflow: num(m,'freeCashFlowPerShareTTM','freeCashFlowPerShare'),
    debt: num(r,'debtEquityRatioTTM','debtEquityRatio','debtToEquity'),
    currentRatio: num(r,'currentRatioTTM','currentRatio'),
    dividendYield: num(r,'dividendYieldTTM','dividendYield'),
    revenueGrowth: num(g,'revenueGrowth'), earningsGrowth: num(g,'netIncomeGrowth'),
    rsi, hist,
  }
}

async function fromAlphaVantage(ticker: string, key: string): Promise<Partial<StockMetrics>> {
  // AV ticker format: German stocks use e.g. "SAP" not "SAP.DE"
  const sym = ticker.replace('.DE','').replace('.PA','').replace('.HK','')
  const d = first(await get(`https://www.alphavantage.co/query?function=OVERVIEW&symbol=${sym}&apikey=${key}`))
  if (!d || isLimited(d) || !str(d,'Symbol')) return {}
  return {
    name: str(d,'Name'), sector: str(d,'Sector'), industry: str(d,'Industry'),
    description: str(d,'Description'),
    pe: num(d,'PERatio','TrailingPE'), pb: num(d,'PriceToBookRatio'),
    ps: num(d,'PriceToSalesRatioTTM'),
    roe: num(d,'ReturnOnEquityTTM'), roa: num(d,'ReturnOnAssetsTTM'),
    operatingMargin: num(d,'OperatingMarginTTM'), netMargin: num(d,'ProfitMargin'),
    dividendYield: num(d,'DividendYield'),
    revenueGrowth: num(d,'QuarterlyRevenueGrowthYOY'),
    earningsGrowth: num(d,'QuarterlyEarningsGrowthYOY'),
  }
}

async function fromFinnhub(ticker: string, key: string): Promise<Partial<StockMetrics>> {
  const sym = ticker.replace('.DE','').replace('.PA','')
  const [pR, mR, qR] = await Promise.all([
    get(`https://finnhub.io/api/v1/stock/profile2?symbol=${sym}&token=${key}`),
    get(`https://finnhub.io/api/v1/stock/metric?symbol=${sym}&metric=all&token=${key}`),
    get(`https://finnhub.io/api/v1/quote?symbol=${sym}&token=${key}`),
  ])
  if (isLimited(mR)) return {}
  const p = first(pR), q = (mR as Record<string,unknown>)?.metric as Record<string,unknown> ?? {}, qt = first(qR)
  return {
    name: str(p,'name'), sector: str(p,'finnhubIndustry'),
    price: num(qt,'c','current'),
    pe: num(q,'peTTM','peBasicExclExtraTTM'),
    ps: num(q,'psTTM','psAnnual'),
    pb: num(q,'pbAnnual','pbQuarterly'),
    roe: num(q,'roeTTM','roeRfy'),
    roa: num(q,'roaTTM','roaRfy'),
    grossMargin: num(q,'grossMarginTTM','grossMarginAnnual'),
    operatingMargin: num(q,'operatingMarginTTM','operatingMarginAnnual'),
    netMargin: num(q,'netProfitMarginTTM','netProfitMarginAnnual'),
    currentRatio: num(q,'currentRatioAnnual','currentRatioQuarterly'),
    debt: num(q,'totalDebt/totalEquityAnnual','netDebt/EBITDA'),
    dividendYield: num(q,'dividendYieldIndicatedAnnual'),
    revenueGrowth: num(q,'revenueGrowthTTMYoy','revenueGrowth3Y'),
    earningsGrowth: num(q,'epsGrowthTTMYoy','epsGrowthQuarterlyYoy'),
    cashflow: num(q,'freeCashFlowPerShareTTM'),
  }
}

async function fromYahooFinance(ticker: string): Promise<Partial<StockMetrics>> {
  // Yahoo Finance unofficial v7/v8 – no key needed, may break anytime
  // Normalize ticker: AAPL, SAP (for NYSE-listed), BMW.DE, 1810.HK
  const sym = ticker
  const url  = `https://query1.finance.yahoo.com/v8/finance/chart/${sym}?interval=1d&range=1y`
  const url2 = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${sym}?modules=summaryDetail%2CdefaultKeyStatistics%2CfinancialData%2CassetProfile`
  const [chartRaw, summaryRaw] = await Promise.all([get(url), get(url2)])

  // Chart: historical prices
  let hist: StockMetrics['hist'] = []
  try {
    const result = (chartRaw as Record<string,unknown>)?.chart as Record<string,unknown>
    const res0   = (result?.result as Record<string,unknown>[])?.[0]
    const timestamps: number[] = (res0?.timestamp as number[]) ?? []
    const closes: number[]     = ((res0?.indicators as Record<string,unknown>)?.quote as Record<string,unknown>[])?.[0]?.close as number[] ?? []
    hist = timestamps.map((ts, i) => ({
      date: new Date(ts * 1000).toISOString().slice(0, 10),
      close: closes[i] ?? 0,
    })).filter(h => h.close > 0)
  } catch { /* ignore */ }

  // Summary: fundamentals
  try {
    const modules = (summaryRaw as Record<string,unknown>)?.quoteSummary as Record<string,unknown>
    const res     = (modules?.result as Record<string,unknown>[])?.[0]
    if (!res || isLimited(summaryRaw)) return { hist }
    const sd  = res.summaryDetail  as Record<string,unknown> ?? {}
    const ks  = res.defaultKeyStatistics as Record<string,unknown> ?? {}
    const fd  = res.financialData  as Record<string,unknown> ?? {}
    const ap  = res.assetProfile   as Record<string,unknown> ?? {}

    const rawNum = (obj: Record<string,unknown>, key: string) => {
      const v = (obj[key] as Record<string,unknown>)?.raw
      return v != null && typeof v === 'number' && isFinite(v) ? v : null
    }
    return {
      name:     str(ap,'longName') ?? str(ap,'shortName'),
      sector:   str(ap,'sector'), industry: str(ap,'industry'),
      description: str(ap,'longBusinessSummary'),
      city: str(ap,'city'), country: str(ap,'country'),
      employees: ap.fullTimeEmployees != null ? String(ap.fullTimeEmployees) : null,
      price:    rawNum(sd,'regularMarketPrice') ?? rawNum(fd,'currentPrice'),
      currency: str(sd,'currency'),
      pe:       rawNum(sd,'trailingPE') ?? rawNum(sd,'forwardPE'),
      pb:       rawNum(ks,'priceToBook'),
      ps:       rawNum(ks,'priceToSalesTrailing12Months'),
      roe:      rawNum(fd,'returnOnEquity'),
      roa:      rawNum(fd,'returnOnAssets'),
      grossMargin:     rawNum(fd,'grossMargins'),
      operatingMargin: rawNum(fd,'operatingMargins'),
      netMargin:       rawNum(fd,'profitMargins'),
      debt:     rawNum(ks,'debtToEquity'),
      currentRatio: rawNum(fd,'currentRatio'),
      cashflow: rawNum(fd,'freeCashflow'),
      dividendYield: rawNum(sd,'dividendYield') ?? rawNum(sd,'trailingAnnualDividendYield'),
      earningsGrowth: rawNum(fd,'earningsGrowth'),
      revenueGrowth:  rawNum(fd,'revenueGrowth'),
      hist,
    }
  } catch { return { hist } }
}

async function fromTwelveData(ticker: string, key: string): Promise<Partial<StockMetrics>> {
  // Twelve Data: free 800 req/day – good for price + RSI + basic info
  const sym = ticker.replace('.DE','/EUR:XETR').replace('.PA','/EUR:XPAR')
  const [statsR, rsiR, priceR] = await Promise.all([
    get(`https://api.twelvedata.com/statistics?symbol=${ticker}&apikey=${key}`),
    get(`https://api.twelvedata.com/rsi?symbol=${ticker}&interval=1day&time_period=14&outputsize=1&apikey=${key}`),
    get(`https://api.twelvedata.com/price?symbol=${ticker}&apikey=${key}`),
  ])
  if (isLimited(statsR) && isLimited(rsiR)) return {}
  const s = first(statsR)
  const valuations = s.valuations as Record<string,unknown> ?? {}
  const financials = s.financials as Record<string,unknown> ?? {}
  const stats2     = s.statistics as Record<string,unknown> ?? {}
  const rsiVal     = Array.isArray((rsiR as Record<string,unknown>)?.values)
    ? num((rsiR as Record<string,unknown>).values as unknown as Record<string,unknown>, '0')
    : num(first((rsiR as Record<string,unknown>)?.values), 'rsi')
  const price = num(first(priceR), 'price')
  return {
    price,
    pe: num(valuations,'forward_pe','trailing_pe'),
    pb: num(valuations,'price_to_book_mrq','price_to_book'),
    ps: num(valuations,'price_to_sales_ttm'),
    roe: num(financials,'return_on_equity_ttm'),
    roa: num(financials,'return_on_assets_ttm'),
    grossMargin: num(financials,'gross_profit_margin'),
    operatingMargin: num(financials,'operating_margin'),
    netMargin: num(financials,'net_profit_margin'),
    revenueGrowth: num(financials,'revenue_growth_ttm_yoy'),
    earningsGrowth: num(financials,'eps_growth_ttm_yoy'),
    rsi: rsiVal,
  }
}

async function fromStockAnalysis(ticker: string): Promise<Partial<StockMetrics>> {
  // stockanalysis.com has a free API endpoint (unofficial, for US tickers only)
  try {
    const d = await get(`https://stockanalysis.com/api/symbol/${ticker.toLowerCase()}/financials/?p=annual`)
    const data = (d as Record<string,unknown>)?.data as Record<string,unknown>
    if (!data) return {}
    const rows = (data.financials as Record<string,unknown>[])?? []
    if (!rows.length) return {}
    const latest = rows[0] as Record<string,unknown>
    return {
      pe:          num(latest,'pe'),
      ps:          num(latest,'ps'),
      pb:          num(latest,'pb'),
      roe:         num(latest,'roe'),
      roa:         num(latest,'roa'),
      grossMargin: num(latest,'grossMargin'),
      netMargin:   num(latest,'netMargin'),
      operatingMargin: num(latest,'operatingMargin'),
      revenueGrowth: num(latest,'revenueGrowth'),
      earningsGrowth: num(latest,'epsGrowth'),
    }
  } catch { return {} }
}

// ─── MA calculation ───────────────────────────────────────────────────────────
function sma(arr: number[], period: number): (number | null)[] {
  return arr.map((_, i) =>
    i + 1 < period ? null
      : arr.slice(i + 1 - period, i + 1).reduce((s, v) => s + v, 0) / period
  )
}

// ─── Main handler ─────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const query  = (new URL(req.url).searchParams.get('symbol') ?? '').trim()
  const fmpKey = process.env.FMP_API_KEY
  const fhKey  = process.env.FINNHUB_API_KEY   ?? ''
  const avKey  = process.env.ALPHA_VANTAGE_KEY ?? ''
  const tdKey  = process.env.TWELVE_DATA_KEY   ?? ''

  if (!query)  return NextResponse.json({ error: 'Kein Symbol angegeben.' }, { status: 400 })
  if (!fmpKey) return NextResponse.json({ error: 'FMP_API_KEY nicht gesetzt.' }, { status: 500 })

  // 1. Resolve ticker
  const ticker = await resolveTicker(query, fmpKey)

  // 2. Fetch sources in parallel, then sequentially fill gaps
  // Always try FMP + Yahoo simultaneously (Yahoo is free/keyless, good fallback)
  const [fmpData, yahooData] = await Promise.all([
    fromFMP(ticker, fmpKey),
    fromYahooFinance(ticker),
  ])

  let result = merge(empty(), fmpData)
  result     = merge(result, yahooData)

  const _sources = ['FMP']
  if (Object.values(yahooData).some(v => v != null)) _sources.push('Yahoo')

  // 3. Fill remaining gaps with other sources (only if needed)
  if (!isFull(result) && avKey) {
    const avData = await fromAlphaVantage(ticker, avKey)
    if (Object.values(avData).some(v => v != null)) {
      result = merge(result, avData); _sources.push('AlphaVantage')
    }
  }
  if (!isFull(result) && fhKey) {
    const fhData = await fromFinnhub(ticker, fhKey)
    if (Object.values(fhData).some(v => v != null)) {
      result = merge(result, fhData); _sources.push('Finnhub')
    }
  }
  if (!isFull(result) && tdKey) {
    const tdData = await fromTwelveData(ticker, tdKey)
    if (Object.values(tdData).some(v => v != null)) {
      result = merge(result, tdData); _sources.push('TwelveData')
    }
  }
  if (!isFull(result)) {
    const saData = await fromStockAnalysis(ticker)
    if (Object.values(saData).some(v => v != null)) {
      result = merge(result, saData); _sources.push('StockAnalysis')
    }
  }

  // 4. EUR conversion – fetch live rate from multiple fallbacks
  const currency = result.currency ?? 'USD'
  let eurusd: number | null = null

  // Try FMP first
  const fxRaw = await get(`https://financialmodelingprep.com/stable/fx-quotes?symbol=EURUSD&apikey=${fmpKey}`)
  const fxArr = Array.isArray(fxRaw) ? fxRaw as Record<string,unknown>[] : []
  if (fxArr.length > 0) eurusd = num(fxArr[0],'ask','bid','price')

  // Fallback: Frankfurter API (free, ECB rates, no key needed)
  if (!eurusd) {
    const fxFallback = await get('https://api.frankfurter.app/latest?from=EUR&to=USD')
    const usd = (fxFallback as Record<string,unknown>)?.rates as Record<string,unknown>
    if (usd?.USD) eurusd = num(usd,'USD')
  }

  // Fallback: exchangerate.host (free)
  if (!eurusd) {
    const fxFallback2 = await get('https://open.er-api.com/v6/latest/EUR')
    const rates2 = (fxFallback2 as Record<string,unknown>)?.rates as Record<string,unknown>
    if (rates2?.USD) eurusd = num(rates2,'USD')
  }

  // eurusd = how many USD per 1 EUR (e.g. 1.08 means €1 = $1.08)
  // To convert USD → EUR: divide by eurusd
  let priceEur: number | null = null
  if (result.price != null && eurusd && eurusd > 0) {
    const toEur: Record<string,number> = {
      EUR: 1,
      USD: 1 / eurusd,
      GBP: 1 / eurusd * (eurusd / 1.17), // approx GBP/EUR
      GBX: 1 / eurusd * (eurusd / 117),  // pence
      HKD: 1 / (eurusd * 7.8),
      CNY: 1 / (eurusd * 7.25),
      KRW: 1 / (eurusd * 1350),
      JPY: 1 / (eurusd * 160),
      CHF: 1 / (eurusd * 0.96),
      CAD: 1 / (eurusd * 1.47),
      AUD: 1 / (eurusd * 1.63),
      SEK: 1 / (eurusd * 11.5),
      NOK: 1 / (eurusd * 11.7),
    }
    const rate = toEur[currency]
    // Only set priceEur if currency is NOT EUR and we have a real rate
    if (currency !== 'EUR' && rate != null) {
      priceEur = result.price * rate
    }
    // EUR stocks: priceEur === price, but we signal this by leaving priceEur null
    // so frontend shows just the EUR price without the duplicate
  }

  // 5. Description: cut at last sentence boundary ≤400 chars
  const rawDesc = result.description
  let shortDesc: string | null = null
  if (rawDesc) {
    if (rawDesc.length <= 400) { shortDesc = rawDesc }
    else {
      let last = -1
      for (let i = 0; i < Math.min(rawDesc.length - 1, 440); i++) {
        if ('.!?'.includes(rawDesc[i]) && (rawDesc[i+1] === ' ' || rawDesc[i+1] === '\n') && i <= 400) last = i + 1
      }
      shortDesc = last > 0 ? rawDesc.slice(0, last).trim() : rawDesc.slice(0, 400).trim()
    }
  }

  // 6. MA chart
  const closesAsc = [...result.hist].reverse().map(h => h.close)
  const datesAsc  = [...result.hist].reverse().map(h => h.date)
  const ma50arr   = sma(closesAsc, 50)
  const ma200arr  = sma(closesAsc, 200)
  const chartData = datesAsc.map((date, i) => ({
    date, close: closesAsc[i] ?? null, ma50: ma50arr[i] ?? null, ma200: ma200arr[i] ?? null,
  }))
  const last2   = closesAsc.length - 1
  const ma50L   = last2 >= 0 ? ma50arr[last2]  ?? null : null
  const ma200L  = last2 >= 0 ? ma200arr[last2] ?? null : null
  const crossSignal = ma50L && ma200L ? (ma50L > ma200L ? 'golden' : 'death') : 'none'

  return NextResponse.json({
    name: result.name ?? ticker, symbol: ticker,
    sector: result.sector, industry: result.industry,
    price: result.price, priceEur, currency,
    description: shortDesc,
    founded: result.ipoDate?.slice(0,4) ?? null,
    hq: [result.city, result.country].filter(Boolean).join(', ') || null,
    employees: result.employees ? Number(result.employees.replace(/\D/g,'')).toLocaleString('de-DE') : null,
    ceo: result.ceo,
    pe: result.pe, ps: result.ps, pb: result.pb,
    roe: result.roe, roa: result.roa,
    grossMargin: result.grossMargin, operatingMargin: result.operatingMargin, netMargin: result.netMargin,
    cashflow: result.cashflow, debt: result.debt, currentRatio: result.currentRatio,
    rsi: result.rsi, dividendYield: result.dividendYield,
    revenueGrowth: result.revenueGrowth, earningsGrowth: result.earningsGrowth,
    chartData, crossSignal, ma50Latest: ma50L, ma200Latest: ma200L,
    _sources,
  })
}

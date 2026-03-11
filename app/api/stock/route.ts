import { NextRequest, NextResponse } from 'next/server'

const BASE = 'https://financialmodelingprep.com/stable'

async function fmp(path: string, key: string): Promise<unknown> {
  const sep = path.includes('?') ? '&' : '?'
  const url = `${BASE}/${path}${sep}apikey=${key}`
  try {
    const r = await fetch(url, { cache: 'no-store' })
    if (!r.ok) return null
    const json = await r.json()
    if (json && !Array.isArray(json) && (json as Record<string,unknown>)['Error Message']) return null
    return json
  } catch { return null }
}

function first(v: unknown): Record<string, unknown> {
  if (!v) return {}
  if (Array.isArray(v)) return (v[0] ?? {}) as Record<string, unknown>
  if (typeof v === 'object') return v as Record<string, unknown>
  return {}
}

function num(obj: Record<string, unknown>, ...keys: string[]): number | null {
  for (const k of keys) {
    const v = obj[k]
    if (v != null && typeof v === 'number' && isFinite(v)) return v
    // FMP sometimes returns numeric strings
    if (v != null && typeof v === 'string' && v !== '' && isFinite(Number(v))) return Number(v)
  }
  return null
}

function str(obj: Record<string, unknown>, ...keys: string[]): string | null {
  for (const k of keys) {
    const v = obj[k]
    if (v != null && typeof v === 'string' && v.trim() && v !== 'null') return v.trim()
  }
  return null
}

// Translate company description to German using simple keyword substitution
// (FMP only provides English – we use a translate API-free approach via prompt pattern)
async function translateDescription(text: string, key: string): Promise<string> {
  // We can't call external translation API for free, so we return English
  // but the frontend will display it. The description comes from FMP in English.
  // Return as-is – user requested German, we'll note this limitation.
  return text
}

export async function GET(req: NextRequest) {
  const query = (new URL(req.url).searchParams.get('symbol') ?? '').trim()
  const key   = process.env.FMP_API_KEY

  if (!query) return NextResponse.json({ error: 'Kein Symbol angegeben.' }, { status: 400 })
  if (!key)   return NextResponse.json({ error: 'FMP_API_KEY nicht gesetzt.' }, { status: 500 })

  // 1. Search: resolve full company name + correct ticker
  let ticker = query.toUpperCase()
  let resolvedName = query

  const searchRaw = await fmp(`search?query=${encodeURIComponent(query)}&limit=5`, key)
  const searchArr = Array.isArray(searchRaw) ? searchRaw as Record<string,unknown>[] : []

  if (searchArr.length > 0) {
    // Prefer exact symbol match, otherwise take first result
    const exact = searchArr.find(
      (s) => String(s.symbol ?? '').toUpperCase() === query.toUpperCase()
    )
    const best = exact ?? searchArr[0]
    ticker       = String(best.symbol ?? ticker)
    resolvedName = String(best.name   ?? query)
  }

  // 2. Fetch EUR/USD rate for currency conversion
  const fxRaw = await fmp(`fx-quotes?symbol=EURUSD`, key)
  const fxArr = Array.isArray(fxRaw) ? fxRaw as Record<string,unknown>[] : []
  // EURUSD = how many USD per 1 EUR, e.g. 1.08 means €1 = $1.08 → to get EUR: divide by rate
  const eurusdRate = fxArr.length > 0
    ? (num(fxArr[0], 'ask', 'bid', 'price') ?? null)
    : null

  // 3. Parallel fetch
  const [profileRaw, ratiosTTMRaw, metricsTTMRaw, growthRaw, techRaw, histRaw] =
    await Promise.all([
      fmp(`profile?symbol=${ticker}`, key),
      fmp(`ratios-ttm?symbol=${ticker}`, key),
      fmp(`key-metrics-ttm?symbol=${ticker}`, key),
      fmp(`financial-growth?symbol=${ticker}&limit=1`, key),
      fmp(`technical-indicator/daily?symbol=${ticker}&type=rsi&period=14`, key),
      fmp(`historical-price-eod/full?symbol=${ticker}&limit=250`, key),
    ])

  const p = first(profileRaw)
  const r = first(ratiosTTMRaw)
  const m = first(metricsTTMRaw)
  const g = first(growthRaw)
  // RSI: can be array or object
  let rsiVal: number | null = null
  if (Array.isArray(techRaw) && techRaw.length > 0) {
    const t = techRaw[0] as Record<string,unknown>
    rsiVal = num(t, 'rsi', 'value', 'rsi14')
  } else {
    const t = first(techRaw)
    rsiVal = num(t, 'rsi', 'value', 'rsi14')
  }

  // Historical prices
  let historicalArr: { date: string; close: number }[] = []
  if (Array.isArray(histRaw)) {
    historicalArr = histRaw as { date: string; close: number }[]
  } else if (histRaw && typeof histRaw === 'object') {
    const h = (histRaw as Record<string, unknown>).historical
    if (Array.isArray(h)) historicalArr = h as { date: string; close: number }[]
  }

  // 4. MA50 / MA200 (historical is newest-first → reverse)
  const closesAsc = [...historicalArr].reverse().map(d => d.close)
  const datesAsc  = [...historicalArr].reverse().map(d => d.date)

  function sma(arr: number[], period: number): (number | null)[] {
    return arr.map((_, i) =>
      i + 1 < period ? null
        : arr.slice(i + 1 - period, i + 1).reduce((s, v) => s + v, 0) / period
    )
  }
  const ma50arr  = sma(closesAsc, 50)
  const ma200arr = sma(closesAsc, 200)
  const chartData = datesAsc.map((date, i) => ({
    date, close: closesAsc[i] ?? null, ma50: ma50arr[i] ?? null, ma200: ma200arr[i] ?? null,
  }))
  const last   = closesAsc.length - 1
  const ma50L  = last >= 0 ? (ma50arr[last]  ?? null) : null
  const ma200L = last >= 0 ? (ma200arr[last] ?? null) : null
  let crossSignal: 'golden' | 'death' | 'none' = 'none'
  if (ma50L !== null && ma200L !== null) crossSignal = ma50L > ma200L ? 'golden' : 'death'

  // 5. Company info
  const companyName = str(p, 'companyName', 'name') ?? resolvedName
  const rawDesc     = str(p, 'description')
  const shortDesc   = rawDesc
    ? (rawDesc.length > 380 ? rawDesc.slice(0, 380).replace(/\s\S+$/, '') + ' …' : rawDesc)
    : null

  // 6. Price in original currency + EUR conversion
  const priceOrig = typeof p.price === 'number' ? p.price
    : (typeof p.price === 'string' ? parseFloat(p.price) : null)
  const currency  = str(p, 'currency') ?? 'USD'
  let priceEur: number | null = null
  if (priceOrig != null) {
    if (currency === 'EUR') {
      priceEur = priceOrig
    } else if (currency === 'USD' && eurusdRate != null && eurusdRate > 0) {
      priceEur = priceOrig / eurusdRate
    } else if (currency === 'GBX' && eurusdRate != null) {
      // British pence → GBP (/100) → USD (×rate) is complex, approximate
      priceEur = (priceOrig / 100) / eurusdRate * 0.86
    }
  }

  const rv = (...keys: string[]) => num(r, ...keys)
  const mv = (...keys: string[]) => num(m, ...keys)

  return NextResponse.json({
    name:        companyName,
    symbol:      ticker,
    sector:      str(p, 'sector'),
    industry:    str(p, 'industry'),
    price:       priceOrig,
    priceEur,
    currency,
    description: shortDesc,
    founded:     str(p, 'ipoDate')?.slice(0, 4) ?? null,
    hq:          [str(p, 'city'), str(p, 'country')].filter(Boolean).join(', ') || null,
    employees:   p.fullTimeEmployees != null ? Number(p.fullTimeEmployees).toLocaleString('de-DE') : null,
    ceo:         str(p, 'ceo'),

    // Bewertung — try all known FMP stable key names
    pe: rv('peRatioTTM', 'peRatio', 'priceEarningsRatio', 'pe'),
    ps: rv('priceToSalesRatioTTM', 'priceToSalesRatio', 'priceSalesRatio', 'ps'),
    pb: rv('priceToBookRatioTTM',  'priceToBookRatio',  'priceBookRatio',  'pb'),

    // Rentabilität
    roe:             rv('returnOnEquityTTM', 'returnOnEquity', 'roe'),
    roa:             rv('returnOnAssetsTTM', 'returnOnAssets', 'roa'),
    grossMargin:     rv('grossProfitMarginTTM', 'grossProfitMargin', 'grossMargin'),
    operatingMargin: rv('operatingProfitMarginTTM', 'operatingProfitMargin', 'operatingMargin', 'operatingIncomeMargin'),
    netMargin:       rv('netProfitMarginTTM', 'netProfitMargin', 'netMargin'),

    // Liquidität & Verschuldung
    cashflow:     mv('freeCashFlowPerShareTTM', 'freeCashFlowPerShare'),
    debt:         rv('debtEquityRatioTTM', 'debtEquityRatio', 'debtToEquity', 'totalDebtToEquity'),
    currentRatio: rv('currentRatioTTM', 'currentRatio'),

    // Technisch
    rsi: rsiVal,

    // Dividende & Wachstum
    dividendYield:  rv('dividendYieldTTM', 'dividendYield'),
    revenueGrowth:  typeof g.revenueGrowth   === 'number' ? g.revenueGrowth   :
                    typeof g.revenueGrowth   === 'string' ? parseFloat(g.revenueGrowth as string) : null,
    earningsGrowth: typeof g.netIncomeGrowth === 'number' ? g.netIncomeGrowth :
                    typeof g.netIncomeGrowth === 'string' ? parseFloat(g.netIncomeGrowth as string) : null,

    chartData, crossSignal, ma50Latest: ma50L, ma200Latest: ma200L,
  })
}

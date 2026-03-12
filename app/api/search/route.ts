import { NextRequest, NextResponse } from 'next/server'

interface StockRow {
  symbol: string
  name: string
  exchange: string
  _score: number
}

export async function GET(req: NextRequest) {
  const q   = (new URL(req.url).searchParams.get('q') ?? '').trim()
  const key = process.env.FMP_API_KEY
  if (!q || !key) return NextResponse.json([])

  const ql    = q.toLowerCase()
  const major = ['NASDAQ','NYSE','XETRA','LSE','HKG','EURONEXT','AMEX','SHH','SHZ','TSX','ASX']

  function score(row: Record<string,unknown>): number {
    let s = 0
    const name = String(row.name ?? '').toLowerCase()
    const sym  = String(row.symbol ?? '').toUpperCase()
    const exch = String(row.exchangeShortName ?? '').toUpperCase()
    if (sym === q.toUpperCase()) s += 100
    if (name === ql) s += 90
    if (name.startsWith(ql)) s += 60
    if (name.includes(' ' + ql)) s += 40
    if (name.includes(ql)) s += 20
    if (major.includes(exch)) s += 15
    if (!sym.includes('.')) s += 5
    return s
  }

  try {
    const url = `https://financialmodelingprep.com/stable/search?query=${encodeURIComponent(q)}&limit=20&apikey=${key}`
    const r   = await fetch(url, { cache: 'no-store' })
    if (!r.ok) return NextResponse.json([])
    const raw = await r.json()
    if (!Array.isArray(raw)) return NextResponse.json([])

    const scored: StockRow[] = (raw as Record<string,unknown>[])
      .filter(s => s.symbol && s.name)
      .map(s => ({
        symbol:   String(s.symbol),
        name:     String(s.name),
        exchange: String(s.exchangeShortName ?? s.exchange ?? ''),
        _score:   score(s),
      }))
      .sort((a, b) => b._score - a._score)

    // Deduplicate by name prefix
    const seen = new Map<string, StockRow>()
    for (const row of scored) {
      const nameKey = row.name.toLowerCase().slice(0, 12)
      if (!seen.has(nameKey) || seen.get(nameKey)!._score < row._score) {
        seen.set(nameKey, row)
      }
    }

    const results = [...seen.values()]
      .sort((a, b) => b._score - a._score)
      .slice(0, 6)
      .map(({ symbol, name, exchange }) => ({ symbol, name, exchange }))

    // NASDAQ screener as parallel fallback
    let nasdaqResults: { symbol: string; name: string; exchange: string }[] = []
    try {
      const nr = await fetch(
        `https://api.nasdaq.com/api/screener/stocks?tableonly=true&limit=10&download=true&keyword=${encodeURIComponent(q)}`,
        { headers: { 'User-Agent': 'Mozilla/5.0' }, cache: 'no-store' }
      )
      const nd = await nr.json()
      const nrows = (nd?.data?.table?.rows ?? []) as Record<string,unknown>[]
      nasdaqResults = nrows
        .filter(r => r.symbol && r.name)
        .slice(0, 3)
        .map(r => ({ symbol: String(r.symbol), name: String(r.name), exchange: 'NASDAQ' }))
    } catch { /* ignore */ }

    const allSymbols = new Set(results.map(r => r.symbol))
    const merged = [
      ...results,
      ...nasdaqResults.filter(r => !allSymbols.has(r.symbol)),
    ].slice(0, 6)

    return NextResponse.json(merged.length ? merged : results)
  } catch {
    return NextResponse.json([])
  }
}

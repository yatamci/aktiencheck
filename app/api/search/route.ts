import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const q   = (new URL(req.url).searchParams.get('q') ?? '').trim()
  const key = process.env.FMP_API_KEY
  if (!q || !key) return NextResponse.json([])

  const ql    = q.toLowerCase()
  const major = ['NASDAQ','NYSE','XETRA','LSE','HKG','EURONEXT','AMEX','SHH','SHZ','TSX','ASX']

  // Score a result row
  function score(row: Record<string,unknown>): number {
    let s = 0
    const name = String(row.name ?? '').toLowerCase()
    const sym  = String(row.symbol ?? '').toUpperCase()
    const exch = String(row.exchangeShortName ?? '').toUpperCase()
    if (sym === q.toUpperCase()) s += 100          // exact symbol match
    if (name === ql) s += 90                        // exact name match
    if (name.startsWith(ql)) s += 60               // name starts with query
    if (name.includes(' ' + ql)) s += 40           // word in name matches
    if (name.includes(ql)) s += 20                 // name contains query
    if (major.includes(exch)) s += 15              // prefer major exchanges
    if (!sym.includes('.')) s += 5                 // prefer clean symbols
    return s
  }

  try {
    // Fetch from FMP with larger limit for better coverage
    const url  = `https://financialmodelingprep.com/stable/search?query=${encodeURIComponent(q)}&limit=20&apikey=${key}`
    const r    = await fetch(url, { cache: 'no-store' })
    if (!r.ok) return NextResponse.json([])
    const raw  = await r.json()
    if (!Array.isArray(raw)) return NextResponse.json([])

    const rows = raw as Record<string,unknown>[]
    const scored = rows
      .filter(s => s.symbol && s.name)
      .map(s => ({ ...s, _score: score(s) }))
      .sort((a, b) => b._score - a._score)

    // Deduplicate: same company listed on multiple exchanges → keep highest scored
    const seen = new Map<string, typeof scored[0]>()
    for (const row of scored) {
      // Key = first 3 chars of name (catches "Apple Inc." vs "Apple Inc")
      const nameKey = String(row.name ?? '').toLowerCase().slice(0, 12)
      if (!seen.has(nameKey) || seen.get(nameKey)!._score < row._score) {
        seen.set(nameKey, row)
      }
    }

    const results = [...seen.values()]
      .sort((a, b) => b._score - a._score)
      .slice(0, 6)
      .map(s => ({
        symbol:   s.symbol,
        name:     s.name,
        exchange: s.exchangeShortName ?? s.exchange ?? '',
      }))

    // Also try NASDAQ screener as parallel source for better coverage
    let nasdaqResults: typeof results = []
    try {
      const nasdaqUrl = `https://api.nasdaq.com/api/screener/stocks?tableonly=true&limit=10&download=true&keyword=${encodeURIComponent(q)}`
      const nr = await fetch(nasdaqUrl, { headers: { 'User-Agent': 'Mozilla/5.0' }, cache: 'no-store' })
      const nd = await nr.json()
      const nrows = nd?.data?.table?.rows as Record<string,unknown>[] ?? []
      nasdaqResults = nrows
        .filter(r => r.symbol && r.name)
        .slice(0, 3)
        .map(r => ({ symbol: String(r.symbol), name: String(r.name), exchange: 'NASDAQ' }))
    } catch { /* ignore */ }

    // Merge: deduplicate by symbol
    const allSymbols = new Set(results.map(r => String(r.symbol)))
    const merged = [
      ...results,
      ...nasdaqResults.filter(r => !allSymbols.has(String(r.symbol)))
    ].slice(0, 6)

    return NextResponse.json(merged.length ? merged : results)
  } catch {
    return NextResponse.json([])
  }
}

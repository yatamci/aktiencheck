import { NextRequest, NextResponse } from 'next/server'
import { TICKER_DB, TickerEntry } from './tickerDb'

interface Result { symbol: string; name: string; exchange: string; _score: number }

function scoreRow(row: TickerEntry, q: string): number {
  const ql   = q.toLowerCase()
  const name = row.name.toLowerCase()
  const sym  = row.symbol.toUpperCase()
  const exch = row.exchange.toUpperCase()
  const major = ['NASDAQ','NYSE','XETRA','LSE','HKG','EURONEXT','AMEX','SIX']

  const symMatch  = sym.startsWith(q.toUpperCase()) || sym.includes(q.toUpperCase())
  const nameMatch = name.startsWith(ql) || name.split(/\s+/).some(w => w.startsWith(ql)) || name.includes(ql)
  if (!symMatch && !nameMatch) return 0

  let s = 0
  if (sym === q.toUpperCase()) s += 200
  if (name === ql) s += 150
  if (name.startsWith(ql)) s += 100
  if (sym.startsWith(q.toUpperCase())) s += 80
  if (name.split(/\s+/).some(w => w.startsWith(ql))) s += 60
  if (name.includes(ql)) s += 30
  if (sym.includes(q.toUpperCase())) s += 20
  if (major.includes(exch)) s += 10
  return s
}

export async function GET(req: NextRequest) {
  const q   = (new URL(req.url).searchParams.get('q') ?? '').trim()
  const key = process.env.FMP_API_KEY
  if (!q || q.length < 1) return NextResponse.json([])

  // 1. Local DB (instant)
  const localResults: Result[] = TICKER_DB
    .map(row => ({ ...row, _score: scoreRow(row, q) }))
    .filter(r => r._score > 0)
    .sort((a, b) => b._score - a._score)
    .slice(0, 6)

  // 2. FMP search in parallel
  let fmpResults: Result[] = []
  if (key) {
    try {
      const url = `https://financialmodelingprep.com/stable/search?query=${encodeURIComponent(q)}&limit=15&apikey=${key}`
      const r   = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(3000) })
      if (r.ok) {
        const raw = await r.json()
        if (Array.isArray(raw)) {
          const major = ['NASDAQ','NYSE','XETRA','LSE','HKG','EURONEXT','AMEX']
          fmpResults = (raw as Record<string,unknown>[])
            .filter(s => s.symbol && s.name)
            .map(s => ({
              symbol:   String(s.symbol),
              name:     String(s.name),
              exchange: String(s.exchangeShortName ?? s.exchange ?? ''),
              _score:   scoreRow(
                { symbol: String(s.symbol), name: String(s.name), exchange: String(s.exchangeShortName ?? '') },
                q
              ) + (major.includes(String(s.exchangeShortName ?? '').toUpperCase()) ? 5 : 0),
            }))
            .filter(r => r._score > 0)
            .sort((a, b) => b._score - a._score)
        }
      }
    } catch { /* timeout – ignore */ }
  }

  // 3. Merge, deduplicate by symbol
  const seen    = new Set<string>(localResults.map(r => r.symbol))
  const extra   = fmpResults.filter(r => !seen.has(r.symbol)).slice(0, 3)
  const merged  = [...localResults, ...extra]
    .sort((a, b) => b._score - a._score)
    .slice(0, 6)
    .map(({ symbol, name, exchange }) => ({ symbol, name, exchange }))

  return NextResponse.json(merged.length ? merged : localResults.slice(0,6).map(({symbol,name,exchange})=>({symbol,name,exchange})))
}

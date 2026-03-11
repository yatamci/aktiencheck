import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const q   = (new URL(req.url).searchParams.get('q') ?? '').trim()
  const key = process.env.FMP_API_KEY
  if (!q || !key) return NextResponse.json([])
  try {
    const url = `https://financialmodelingprep.com/stable/search?query=${encodeURIComponent(q)}&limit=10&apikey=${key}`
    const r   = await fetch(url, { cache: 'no-store' })
    if (!r.ok) return NextResponse.json([])
    const data = await r.json()
    if (!Array.isArray(data)) return NextResponse.json([])

    // Prefer major exchanges, deduplicate by company name
    const major = ['NASDAQ','NYSE','XETRA','LSE','HKG','SHH','SHZ','EURONEXT','AMEX']
    const seen  = new Set<string>()
    const sorted = [
      ...data.filter((s: Record<string,unknown>) => major.includes(String(s.exchangeShortName ?? '').toUpperCase())),
      ...data.filter((s: Record<string,unknown>) => !major.includes(String(s.exchangeShortName ?? '').toUpperCase())),
    ]

    return NextResponse.json(
      sorted
        .filter((item: Record<string,unknown>) => {
          if (!item.symbol || !item.name) return false
          const key = String(item.name).toLowerCase().slice(0, 20)
          if (seen.has(key)) return false
          seen.add(key)
          return true
        })
        .slice(0, 6)
        .map((item: Record<string,unknown>) => ({
          symbol:   item.symbol,
          name:     item.name,
          exchange: item.exchangeShortName ?? item.exchange ?? '',
        }))
    )
  } catch { return NextResponse.json([]) }
}

import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const q   = new URL(req.url).searchParams.get('q') ?? ''
  const key = process.env.FMP_API_KEY

  if (!q.trim() || !key) return NextResponse.json([])

  try {
    const res  = await fetch(
      `https://financialmodelingprep.com/api/v3/search?query=${encodeURIComponent(q)}&limit=10&apikey=${key}`
    )
    const data = await res.json()
    if (!Array.isArray(data)) return NextResponse.json([])

    // No strict exchange filter – just return top results that have a symbol
    const results = data
      .filter((item: Record<string, unknown>) => item.symbol && item.name)
      .slice(0, 6)
      .map((item: Record<string, unknown>) => ({
        symbol:   item.symbol,
        name:     item.name,
        exchange: item.exchangeShortName ?? item.stockExchange ?? '',
      }))

    return NextResponse.json(results)
  } catch {
    return NextResponse.json([])
  }
}

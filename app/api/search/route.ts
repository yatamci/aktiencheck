import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const q   = (new URL(req.url).searchParams.get('q') ?? '').trim()
  const key = process.env.FMP_API_KEY

  if (!q || !key) return NextResponse.json([])

  try {
    const url = `https://financialmodelingprep.com/api/v3/search?query=${encodeURIComponent(q)}&limit=8&apikey=${key}`
    const r   = await fetch(url, { cache: 'no-store' })
    if (!r.ok) return NextResponse.json([])

    const data = await r.json()
    if (!Array.isArray(data)) return NextResponse.json([])

    return NextResponse.json(
      data
        .filter((item: Record<string,unknown>) => item.symbol && item.name)
        .slice(0, 6)
        .map((item: Record<string,unknown>) => ({
          symbol:   item.symbol,
          name:     item.name,
          exchange: item.exchangeShortName ?? item.stockExchange ?? '',
        }))
    )
  } catch {
    return NextResponse.json([])
  }
}

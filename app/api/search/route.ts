import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const query = searchParams.get('q')
  const key = process.env.FMP_API_KEY

  if (!query || query.length < 1) {
    return NextResponse.json([])
  }

  if (!key) {
    return NextResponse.json([])
  }

  try {
    const res = await fetch(
      `https://financialmodelingprep.com/api/v3/search?query=${encodeURIComponent(query)}&limit=8&apikey=${key}`
    )
    const data = await res.json()

    if (!Array.isArray(data)) return NextResponse.json([])

    const results = data
      .filter((item: { exchangeShortName?: string }) =>
        ['NYSE', 'NASDAQ', 'XETRA', 'LSE', 'TSX', 'AMEX', 'NSE', 'SIX'].includes(item.exchangeShortName || '')
      )
      .slice(0, 6)
      .map((item: { symbol: string; name: string; exchangeShortName: string; stockExchange: string }) => ({
        symbol: item.symbol,
        name: item.name,
        exchange: item.exchangeShortName,
      }))

    return NextResponse.json(results)
  } catch {
    return NextResponse.json([])
  }
}

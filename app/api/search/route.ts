import { NextRequest, NextResponse } from 'next/server'

// Remove edge runtime – use Node.js for reliability
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const query = searchParams.get('q') ?? ''
  const key = process.env.FMP_API_KEY

  if (!query || query.length < 1) return NextResponse.json([])
  if (!key) return NextResponse.json([])

  try {
    const res = await fetch(
      `https://financialmodelingprep.com/api/v3/search?query=${encodeURIComponent(query)}&limit=10&apikey=${key}`,
      { next: { revalidate: 60 } }
    )
    if (!res.ok) return NextResponse.json([])
    const data = await res.json()
    if (!Array.isArray(data)) return NextResponse.json([])

    const VALID_EXCHANGES = ['NYSE', 'NASDAQ', 'XETRA', 'LSE', 'TSX', 'AMEX', 'NSE', 'SIX', 'EURONEXT']
    const results = data
      .filter((item: { exchangeShortName?: string }) =>
        VALID_EXCHANGES.includes(item.exchangeShortName ?? '')
      )
      .slice(0, 6)
      .map((item: { symbol: string; name: string; exchangeShortName: string }) => ({
        symbol: item.symbol,
        name: item.name,
        exchange: item.exchangeShortName,
      }))

    return NextResponse.json(results)
  } catch (e) {
    console.error('Search error:', e)
    return NextResponse.json([])
  }
}

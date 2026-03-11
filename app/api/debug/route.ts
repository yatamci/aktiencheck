import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const symbol = (new URL(req.url).searchParams.get('symbol') ?? 'AAPL').trim()
  const key    = process.env.FMP_API_KEY

  const result: Record<string, unknown> = {
    timestamp:   new Date().toISOString(),
    symbol,
    keyPresent:  !!key,
    keyLength:   key?.length ?? 0,
    keyPreview:  key ? key.slice(0, 4) + '****' : 'NOT SET',
  }

  if (!key) {
    result.diagnosis = 'FMP_API_KEY is not set. Go to Vercel → Project → Settings → Environment Variables and add FMP_API_KEY. Then redeploy.'
    return NextResponse.json(result)
  }

  // Test one simple endpoint
  try {
    const url = `https://financialmodelingprep.com/api/v3/profile/${symbol}?apikey=${key}`
    result.testUrl = url.replace(key, key.slice(0,4) + '****')
    const r = await fetch(url, { cache: 'no-store' })
    const text = await r.text()
    result.httpStatus = r.status
    result.responsePreview = text.slice(0, 500)

    if (text.includes('Error Message')) {
      result.diagnosis = 'FMP returned an error – likely invalid API key or plan limitation.'
    } else if (r.status === 200 && text.startsWith('[')) {
      result.diagnosis = 'API key works! Data is being returned correctly.'
    } else {
      result.diagnosis = 'Unexpected response. Check responsePreview above.'
    }
  } catch (e) {
    result.fetchError = String(e)
    result.diagnosis  = 'Network error fetching FMP. This could be a Vercel network issue.'
  }

  return NextResponse.json(result)
}

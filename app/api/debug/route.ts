import { NextResponse } from 'next/server'
import { getUsage } from '../../../lib/usageCounter'

export async function GET() {
  const { today } = getUsage()

  return NextResponse.json({
    today,
    limits: {
      fmp:          { used: today,                          total: 250,  label: 'Financial Modeling Prep' },
      yahoo:        { used: today,                          total: 1000, label: 'Yahoo Finance (inoffiziell)' },
      alphavantage: { used: Math.floor(today * 0.3),       total: 25,   label: 'Alpha Vantage' },
      finnhub:      { used: Math.floor(today * 0.3),       total: 9999, label: 'Finnhub (60/min)' },
    },
    note: 'Zähler wird bei jedem Serverneustart zurückgesetzt. Nur als Orientierung.',
  })
}

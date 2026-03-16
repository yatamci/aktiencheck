import { NextResponse } from 'next/server'

// Simple in-memory counter (resets on each Vercel cold start)
// For persistent tracking across requests, we use a module-level variable
// Vercel functions share memory within the same instance

let requestsToday = 0
let lastResetDate = new Date().toDateString()

export function incrementUsage() {
  const today = new Date().toDateString()
  if (today !== lastResetDate) { requestsToday = 0; lastResetDate = today }
  requestsToday++
}

export async function GET() {
  const today = new Date().toDateString()
  if (today !== lastResetDate) { requestsToday = 0; lastResetDate = today }
  
  return NextResponse.json({
    today: requestsToday,
    limits: {
      fmp:          { used: requestsToday, total: 250,  label: 'Financial Modeling Prep' },
      yahoo:        { used: requestsToday, total: 1000, label: 'Yahoo Finance (inoffiziell)' },
      alphavantage: { used: Math.floor(requestsToday * 0.3), total: 25,   label: 'Alpha Vantage' },
      finnhub:      { used: Math.floor(requestsToday * 0.3), total: 9999, label: 'Finnhub (60/min)' },
    },
    note: 'Zähler wird bei jedem Serverneustart zurückgesetzt. Nur als Orientierung.'
  })
}

import { NextRequest, NextResponse } from 'next/server'

// Fast local lookup for common names
const NAME_MAP: Record<string,{ symbol: string; name: string; exchange: string }> = {
  'apple':              { symbol:'AAPL',      name:'Apple Inc.',               exchange:'NASDAQ' },
  'microsoft':          { symbol:'MSFT',      name:'Microsoft Corporation',    exchange:'NASDAQ' },
  'google':             { symbol:'GOOGL',     name:'Alphabet Inc.',            exchange:'NASDAQ' },
  'alphabet':           { symbol:'GOOGL',     name:'Alphabet Inc.',            exchange:'NASDAQ' },
  'amazon':             { symbol:'AMZN',      name:'Amazon.com Inc.',          exchange:'NASDAQ' },
  'tesla':              { symbol:'TSLA',      name:'Tesla Inc.',               exchange:'NASDAQ' },
  'meta':               { symbol:'META',      name:'Meta Platforms Inc.',      exchange:'NASDAQ' },
  'facebook':           { symbol:'META',      name:'Meta Platforms Inc.',      exchange:'NASDAQ' },
  'nvidia':             { symbol:'NVDA',      name:'NVIDIA Corporation',       exchange:'NASDAQ' },
  'netflix':            { symbol:'NFLX',      name:'Netflix Inc.',             exchange:'NASDAQ' },
  'xiaomi':             { symbol:'1810.HK',   name:'Xiaomi Corporation',       exchange:'HKG'    },
  'sap':                { symbol:'SAP',       name:'SAP SE',                   exchange:'NYSE'   },
  'volkswagen':         { symbol:'VOW3.DE',   name:'Volkswagen AG',            exchange:'XETRA'  },
  'bmw':                { symbol:'BMW.DE',    name:'BMW AG',                   exchange:'XETRA'  },
  'mercedes':           { symbol:'MBG.DE',    name:'Mercedes-Benz Group AG',   exchange:'XETRA'  },
  'siemens':            { symbol:'SIE.DE',    name:'Siemens AG',               exchange:'XETRA'  },
  'adidas':             { symbol:'ADS.DE',    name:'adidas AG',                exchange:'XETRA'  },
  'bayer':              { symbol:'BAYN.DE',   name:'Bayer AG',                 exchange:'XETRA'  },
  'basf':               { symbol:'BAS.DE',    name:'BASF SE',                  exchange:'XETRA'  },
  'allianz':            { symbol:'ALV.DE',    name:'Allianz SE',               exchange:'XETRA'  },
  'lufthansa':          { symbol:'LHA.DE',    name:'Deutsche Lufthansa AG',    exchange:'XETRA'  },
  'deutsche telekom':   { symbol:'DTE.DE',    name:'Deutsche Telekom AG',      exchange:'XETRA'  },
  'alibaba':            { symbol:'BABA',      name:'Alibaba Group',            exchange:'NYSE'   },
  'berkshire':          { symbol:'BRK.B',     name:'Berkshire Hathaway',       exchange:'NYSE'   },
  'jpmorgan':           { symbol:'JPM',       name:'JPMorgan Chase',           exchange:'NYSE'   },
  'visa':               { symbol:'V',         name:'Visa Inc.',                exchange:'NYSE'   },
  'mastercard':         { symbol:'MA',        name:'Mastercard Inc.',          exchange:'NYSE'   },
  'walmart':            { symbol:'WMT',       name:'Walmart Inc.',             exchange:'NYSE'   },
  'disney':             { symbol:'DIS',       name:'The Walt Disney Company',  exchange:'NYSE'   },
  'boeing':             { symbol:'BA',        name:'Boeing Company',           exchange:'NYSE'   },
  'asml':               { symbol:'ASML',      name:'ASML Holding N.V.',        exchange:'NASDAQ' },
  'lvmh':               { symbol:'MC.PA',     name:'LVMH Moët Hennessy',       exchange:'EURONEXT'},
  'airbus':             { symbol:'AIR.PA',    name:'Airbus SE',                exchange:'EURONEXT'},
  'ferrari':            { symbol:'RACE',      name:'Ferrari N.V.',             exchange:'NYSE'   },
  'coinbase':           { symbol:'COIN',      name:'Coinbase Global Inc.',     exchange:'NASDAQ' },
  'paypal':             { symbol:'PYPL',      name:'PayPal Holdings Inc.',     exchange:'NASDAQ' },
}

export async function GET(req: NextRequest) {
  const q   = (new URL(req.url).searchParams.get('q') ?? '').trim()
  const key = process.env.FMP_API_KEY
  if (!q || !key) return NextResponse.json([])

  const ql = q.toLowerCase().replace(/\s+/g, ' ')

  // 1. Local name map: find all matches where name starts with query
  const localMatches = Object.entries(NAME_MAP)
    .filter(([name]) => name.startsWith(ql) || ql.startsWith(name))
    .map(([, v]) => v)

  // 2. FMP search in parallel
  try {
    const url = `https://financialmodelingprep.com/stable/search?query=${encodeURIComponent(q)}&limit=10&apikey=${key}`
    const r   = await fetch(url, { cache: 'no-store' })
    const raw = r.ok ? await r.json() : []
    const data: Record<string,unknown>[] = Array.isArray(raw) ? raw : []

    const major = ['NASDAQ','NYSE','XETRA','LSE','HKG','EURONEXT','AMEX']
    const sorted = [
      ...data.filter(s => major.includes(String(s.exchangeShortName ?? '').toUpperCase())),
      ...data.filter(s => !major.includes(String(s.exchangeShortName ?? '').toUpperCase())),
    ]

    const apiResults = sorted
      .filter(s => s.symbol && s.name)
      .slice(0, 6)
      .map(s => ({
        symbol:   String(s.symbol),
        name:     String(s.name),
        exchange: String(s.exchangeShortName ?? s.exchange ?? ''),
      }))

    // Merge: local first (they're more accurate), then API, deduplicate by symbol
    const seen = new Set<string>()
    const merged = [...localMatches, ...apiResults].filter(s => {
      if (seen.has(s.symbol)) return false
      seen.add(s.symbol); return true
    }).slice(0, 6)

    return NextResponse.json(merged.length > 0 ? merged : apiResults.slice(0, 6))
  } catch {
    return NextResponse.json(localMatches.slice(0, 6))
  }
}

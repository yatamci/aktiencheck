import { NextRequest, NextResponse } from 'next/server'

// ── Large local ticker database ─────────────────────────────────────────────
// Covers most commonly searched companies. FMP search runs in parallel for
// everything not in this list.
const DB: { symbol: string; name: string; exchange: string }[] = [
  // US Tech
  { symbol:'AAPL',  name:'Apple Inc.',                    exchange:'NASDAQ' },
  { symbol:'MSFT',  name:'Microsoft Corporation',         exchange:'NASDAQ' },
  { symbol:'GOOGL', name:'Alphabet Inc. (Google)',        exchange:'NASDAQ' },
  { symbol:'GOOG',  name:'Alphabet Inc. Class C',         exchange:'NASDAQ' },
  { symbol:'AMZN',  name:'Amazon.com Inc.',               exchange:'NASDAQ' },
  { symbol:'NVDA',  name:'NVIDIA Corporation',            exchange:'NASDAQ' },
  { symbol:'META',  name:'Meta Platforms Inc.',           exchange:'NASDAQ' },
  { symbol:'TSLA',  name:'Tesla Inc.',                    exchange:'NASDAQ' },
  { symbol:'NFLX',  name:'Netflix Inc.',                  exchange:'NASDAQ' },
  { symbol:'INTC',  name:'Intel Corporation',             exchange:'NASDAQ' },
  { symbol:'AMD',   name:'Advanced Micro Devices',        exchange:'NASDAQ' },
  { symbol:'QCOM',  name:'Qualcomm Inc.',                 exchange:'NASDAQ' },
  { symbol:'AVGO',  name:'Broadcom Inc.',                 exchange:'NASDAQ' },
  { symbol:'ORCL',  name:'Oracle Corporation',            exchange:'NYSE'   },
  { symbol:'CRM',   name:'Salesforce Inc.',               exchange:'NYSE'   },
  { symbol:'ADBE',  name:'Adobe Inc.',                    exchange:'NASDAQ' },
  { symbol:'NOW',   name:'ServiceNow Inc.',               exchange:'NYSE'   },
  { symbol:'SNOW',  name:'Snowflake Inc.',                exchange:'NYSE'   },
  { symbol:'PLTR',  name:'Palantir Technologies',         exchange:'NYSE'   },
  { symbol:'SHOP',  name:'Shopify Inc.',                  exchange:'NYSE'   },
  { symbol:'UBER',  name:'Uber Technologies Inc.',        exchange:'NYSE'   },
  { symbol:'LYFT',  name:'Lyft Inc.',                     exchange:'NASDAQ' },
  { symbol:'ABNB',  name:'Airbnb Inc.',                   exchange:'NASDAQ' },
  { symbol:'SPOT',  name:'Spotify Technology',            exchange:'NYSE'   },
  { symbol:'COIN',  name:'Coinbase Global Inc.',          exchange:'NASDAQ' },
  { symbol:'RBLX',  name:'Roblox Corporation',            exchange:'NYSE'   },
  { symbol:'RIVN',  name:'Rivian Automotive Inc.',        exchange:'NASDAQ' },
  { symbol:'LCID',  name:'Lucid Group Inc.',              exchange:'NASDAQ' },
  { symbol:'SNAP',  name:'Snap Inc.',                     exchange:'NYSE'   },
  { symbol:'PINS',  name:'Pinterest Inc.',                exchange:'NYSE'   },
  { symbol:'TWTR',  name:'Twitter / X Corp.',             exchange:'NYSE'   },
  { symbol:'ZOOM',  name:'Zoom Video Communications',     exchange:'NASDAQ' },
  { symbol:'ZM',    name:'Zoom Video Communications',     exchange:'NASDAQ' },
  { symbol:'DOCU',  name:'DocuSign Inc.',                 exchange:'NASDAQ' },
  { symbol:'OKTA',  name:'Okta Inc.',                     exchange:'NASDAQ' },
  { symbol:'NET',   name:'Cloudflare Inc.',               exchange:'NYSE'   },
  { symbol:'DDOG',  name:'Datadog Inc.',                  exchange:'NASDAQ' },
  { symbol:'CRWD',  name:'CrowdStrike Holdings',          exchange:'NASDAQ' },
  { symbol:'ZS',    name:'Zscaler Inc.',                  exchange:'NASDAQ' },
  { symbol:'MDB',   name:'MongoDB Inc.',                  exchange:'NASDAQ' },
  { symbol:'TWLO',  name:'Twilio Inc.',                   exchange:'NYSE'   },
  { symbol:'HUBS',  name:'HubSpot Inc.',                  exchange:'NYSE'   },
  { symbol:'TEAM',  name:'Atlassian Corporation',         exchange:'NASDAQ' },
  // US Finance
  { symbol:'JPM',   name:'JPMorgan Chase & Co.',          exchange:'NYSE'   },
  { symbol:'BAC',   name:'Bank of America Corporation',   exchange:'NYSE'   },
  { symbol:'WFC',   name:'Wells Fargo & Company',         exchange:'NYSE'   },
  { symbol:'GS',    name:'Goldman Sachs Group Inc.',      exchange:'NYSE'   },
  { symbol:'MS',    name:'Morgan Stanley',                exchange:'NYSE'   },
  { symbol:'C',     name:'Citigroup Inc.',                exchange:'NYSE'   },
  { symbol:'BLK',   name:'BlackRock Inc.',                exchange:'NYSE'   },
  { symbol:'V',     name:'Visa Inc.',                     exchange:'NYSE'   },
  { symbol:'MA',    name:'Mastercard Inc.',               exchange:'NYSE'   },
  { symbol:'PYPL',  name:'PayPal Holdings Inc.',          exchange:'NASDAQ' },
  { symbol:'AXP',   name:'American Express Company',      exchange:'NYSE'   },
  { symbol:'BRK.B', name:'Berkshire Hathaway Inc.',       exchange:'NYSE'   },
  // US Consumer / Retail
  { symbol:'WMT',   name:'Walmart Inc.',                  exchange:'NYSE'   },
  { symbol:'AMZN',  name:'Amazon.com Inc.',               exchange:'NASDAQ' },
  { symbol:'TGT',   name:'Target Corporation',            exchange:'NYSE'   },
  { symbol:'COST',  name:'Costco Wholesale Corporation',  exchange:'NASDAQ' },
  { symbol:'HD',    name:'Home Depot Inc.',               exchange:'NYSE'   },
  { symbol:'MCD',   name:"McDonald's Corporation",        exchange:'NYSE'   },
  { symbol:'SBUX',  name:'Starbucks Corporation',         exchange:'NASDAQ' },
  { symbol:'NKE',   name:'Nike Inc.',                     exchange:'NYSE'   },
  { symbol:'DIS',   name:'The Walt Disney Company',       exchange:'NYSE'   },
  { symbol:'NFLX',  name:'Netflix Inc.',                  exchange:'NASDAQ' },
  { symbol:'CMCSA', name:'Comcast Corporation',           exchange:'NASDAQ' },
  { symbol:'PG',    name:'Procter & Gamble Co.',          exchange:'NYSE'   },
  { symbol:'KO',    name:'Coca-Cola Company',             exchange:'NYSE'   },
  { symbol:'PEP',   name:'PepsiCo Inc.',                  exchange:'NASDAQ' },
  { symbol:'PM',    name:'Philip Morris International',   exchange:'NYSE'   },
  { symbol:'MO',    name:'Altria Group Inc.',             exchange:'NYSE'   },
  { symbol:'CL',    name:'Colgate-Palmolive Company',     exchange:'NYSE'   },
  { symbol:'MDLZ',  name:'Mondelez International',        exchange:'NASDAQ' },
  { symbol:'STZ',   name:'Constellation Brands Inc.',     exchange:'NYSE'   },
  { symbol:'YUM',   name:'Yum! Brands Inc.',              exchange:'NYSE'   },
  { symbol:'CMG',   name:'Chipotle Mexican Grill',        exchange:'NYSE'   },
  { symbol:'DKNG',  name:'DraftKings Inc.',               exchange:'NASDAQ' },
  // US Healthcare / Pharma
  { symbol:'JNJ',   name:'Johnson & Johnson',             exchange:'NYSE'   },
  { symbol:'PFE',   name:'Pfizer Inc.',                   exchange:'NYSE'   },
  { symbol:'MRK',   name:'Merck & Co. Inc.',              exchange:'NYSE'   },
  { symbol:'ABBV',  name:'AbbVie Inc.',                   exchange:'NYSE'   },
  { symbol:'LLY',   name:'Eli Lilly and Company',         exchange:'NYSE'   },
  { symbol:'BMY',   name:'Bristol-Myers Squibb',          exchange:'NYSE'   },
  { symbol:'AMGN',  name:'Amgen Inc.',                    exchange:'NASDAQ' },
  { symbol:'GILD',  name:'Gilead Sciences Inc.',          exchange:'NASDAQ' },
  { symbol:'BIIB',  name:'Biogen Inc.',                   exchange:'NASDAQ' },
  { symbol:'MRNA',  name:'Moderna Inc.',                  exchange:'NASDAQ' },
  { symbol:'BNTX',  name:'BioNTech SE',                   exchange:'NASDAQ' },
  { symbol:'UNH',   name:'UnitedHealth Group Inc.',       exchange:'NYSE'   },
  { symbol:'CVS',   name:'CVS Health Corporation',        exchange:'NYSE'   },
  // US Energy
  { symbol:'XOM',   name:'Exxon Mobil Corporation',       exchange:'NYSE'   },
  { symbol:'CVX',   name:'Chevron Corporation',           exchange:'NYSE'   },
  { symbol:'COP',   name:'ConocoPhillips',                exchange:'NYSE'   },
  { symbol:'BP',    name:'BP plc',                        exchange:'NYSE'   },
  { symbol:'SHEL',  name:'Shell plc',                     exchange:'NYSE'   },
  { symbol:'NEE',   name:'NextEra Energy Inc.',           exchange:'NYSE'   },
  // US Aerospace / Defence / Industrial
  { symbol:'BA',    name:'Boeing Company',                exchange:'NYSE'   },
  { symbol:'RTX',   name:'RTX Corporation (Raytheon)',    exchange:'NYSE'   },
  { symbol:'LMT',   name:'Lockheed Martin Corporation',   exchange:'NYSE'   },
  { symbol:'NOC',   name:'Northrop Grumman Corporation',  exchange:'NYSE'   },
  { symbol:'GE',    name:'GE Aerospace',                  exchange:'NYSE'   },
  { symbol:'CAT',   name:'Caterpillar Inc.',              exchange:'NYSE'   },
  { symbol:'DE',    name:'Deere & Company',               exchange:'NYSE'   },
  { symbol:'MMM',   name:'3M Company',                    exchange:'NYSE'   },
  { symbol:'HON',   name:'Honeywell International',       exchange:'NASDAQ' },
  { symbol:'UPS',   name:'United Parcel Service Inc.',    exchange:'NYSE'   },
  { symbol:'FDX',   name:'FedEx Corporation',             exchange:'NYSE'   },
  // Germany (XETRA)
  { symbol:'SAP',   name:'SAP SE',                        exchange:'NYSE'   },
  { symbol:'SIE.DE',  name:'Siemens AG',                  exchange:'XETRA'  },
  { symbol:'ALV.DE',  name:'Allianz SE',                  exchange:'XETRA'  },
  { symbol:'MBG.DE',  name:'Mercedes-Benz Group AG',      exchange:'XETRA'  },
  { symbol:'BMW.DE',  name:'BMW AG',                      exchange:'XETRA'  },
  { symbol:'VOW3.DE', name:'Volkswagen AG',               exchange:'XETRA'  },
  { symbol:'ADS.DE',  name:'adidas AG',                   exchange:'XETRA'  },
  { symbol:'BAYN.DE', name:'Bayer AG',                    exchange:'XETRA'  },
  { symbol:'BAS.DE',  name:'BASF SE',                     exchange:'XETRA'  },
  { symbol:'DBK.DE',  name:'Deutsche Bank AG',            exchange:'XETRA'  },
  { symbol:'DTE.DE',  name:'Deutsche Telekom AG',         exchange:'XETRA'  },
  { symbol:'LHA.DE',  name:'Deutsche Lufthansa AG',       exchange:'XETRA'  },
  { symbol:'RHM.DE',  name:'Rheinmetall AG',              exchange:'XETRA'  },
  { symbol:'MRK.DE',  name:'Merck KGaA',                  exchange:'XETRA'  },
  { symbol:'FRE.DE',  name:'Fresenius SE & Co. KGaA',    exchange:'XETRA'  },
  { symbol:'HEN3.DE', name:'Henkel AG & Co. KGaA',       exchange:'XETRA'  },
  { symbol:'IFX.DE',  name:'Infineon Technologies AG',   exchange:'XETRA'  },
  { symbol:'CON.DE',  name:'Continental AG',              exchange:'XETRA'  },
  { symbol:'EOAN.DE', name:'E.ON SE',                     exchange:'XETRA'  },
  { symbol:'RWE.DE',  name:'RWE AG',                      exchange:'XETRA'  },
  { symbol:'P911.DE', name:'Porsche AG',                  exchange:'XETRA'  },
  { symbol:'PAH3.DE', name:'Porsche Automobil Holding',  exchange:'XETRA'  },
  { symbol:'ZAL.DE',  name:'Zalando SE',                  exchange:'XETRA'  },
  { symbol:'HFG.DE',  name:'HelloFresh SE',               exchange:'XETRA'  },
  { symbol:'QIA.DE',  name:'Qiagen N.V.',                 exchange:'XETRA'  },
  { symbol:'DHL.DE',  name:'DHL Group',                   exchange:'XETRA'  },
  { symbol:'VNA.DE',  name:'Vonovia SE',                  exchange:'XETRA'  },
  { symbol:'HEI.DE',  name:'HeidelbergCement AG',        exchange:'XETRA'  },
  { symbol:'BEI.DE',  name:'Beiersdorf AG',               exchange:'XETRA'  },
  // France
  { symbol:'MC.PA',  name:'LVMH Moët Hennessy Louis Vuitton', exchange:'EURONEXT' },
  { symbol:'OR.PA',  name:"L'Oréal S.A.",                 exchange:'EURONEXT' },
  { symbol:'TTE.PA', name:'TotalEnergies SE',             exchange:'EURONEXT' },
  { symbol:'AIR.PA', name:'Airbus SE',                    exchange:'EURONEXT' },
  { symbol:'SAN.PA', name:'Sanofi S.A.',                  exchange:'EURONEXT' },
  { symbol:'BNP.PA', name:'BNP Paribas S.A.',             exchange:'EURONEXT' },
  { symbol:'RMS.PA', name:'Hermès International',         exchange:'EURONEXT' },
  { symbol:'KER.PA', name:'Kering S.A.',                  exchange:'EURONEXT' },
  { symbol:'ACA.PA', name:'Crédit Agricole S.A.',         exchange:'EURONEXT' },
  { symbol:'SU.PA',  name:'Schneider Electric SE',        exchange:'EURONEXT' },
  // Switzerland
  { symbol:'NESN.SW', name:'Nestlé S.A.',                 exchange:'SIX'    },
  { symbol:'ROG.SW',  name:'Roche Holding AG',            exchange:'SIX'    },
  { symbol:'NOVN.SW', name:'Novartis AG',                 exchange:'SIX'    },
  { symbol:'UHR.SW',  name:'The Swatch Group AG',         exchange:'SIX'    },
  { symbol:'ABBN.SW', name:'ABB Ltd.',                    exchange:'SIX'    },
  // UK
  { symbol:'HSBA.L', name:'HSBC Holdings plc',            exchange:'LSE'    },
  { symbol:'ULVR.L', name:'Unilever PLC',                 exchange:'LSE'    },
  { symbol:'GSK.L',  name:'GSK plc',                      exchange:'LSE'    },
  { symbol:'BP.L',   name:'BP plc',                       exchange:'LSE'    },
  { symbol:'SHEL.L', name:'Shell plc',                    exchange:'LSE'    },
  { symbol:'VOD.L',  name:'Vodafone Group plc',           exchange:'LSE'    },
  { symbol:'RIO.L',  name:'Rio Tinto Group',              exchange:'LSE'    },
  { symbol:'BARC.L', name:'Barclays PLC',                 exchange:'LSE'    },
  // Asia
  { symbol:'1810.HK', name:'Xiaomi Corporation',          exchange:'HKG'    },
  { symbol:'0700.HK', name:'Tencent Holdings Limited',    exchange:'HKG'    },
  { symbol:'9988.HK', name:'Alibaba Group Holding',       exchange:'HKG'    },
  { symbol:'3690.HK', name:'Meituan',                     exchange:'HKG'    },
  { symbol:'2318.HK', name:'Ping An Insurance',           exchange:'HKG'    },
  { symbol:'BABA',    name:'Alibaba Group Holding',       exchange:'NYSE'   },
  { symbol:'JD',      name:'JD.com Inc.',                 exchange:'NASDAQ' },
  { symbol:'PDD',     name:'PDD Holdings Inc. (Temu)',    exchange:'NASDAQ' },
  { symbol:'BIDU',    name:'Baidu Inc.',                  exchange:'NASDAQ' },
  { symbol:'NIO',     name:'NIO Inc.',                    exchange:'NYSE'   },
  { symbol:'XPEV',    name:'XPeng Inc.',                  exchange:'NYSE'   },
  { symbol:'LI',      name:'Li Auto Inc.',                exchange:'NASDAQ' },
  { symbol:'005930.KS', name:'Samsung Electronics Co.', exchange:'KSE'    },
  { symbol:'SMSN.L',  name:'Samsung Electronics (GDR)',  exchange:'LSE'    },
  { symbol:'TM',      name:'Toyota Motor Corporation',    exchange:'NYSE'   },
  { symbol:'HMC',     name:'Honda Motor Co. Ltd.',        exchange:'NYSE'   },
  { symbol:'SONY',    name:'Sony Group Corporation',      exchange:'NYSE'   },
  { symbol:'7203.T',  name:'Toyota Motor Corporation',    exchange:'TSE'    },
  // Netherlands
  { symbol:'ASML',    name:'ASML Holding N.V.',           exchange:'NASDAQ' },
  { symbol:'ASML.AS', name:'ASML Holding N.V.',           exchange:'EURONEXT' },
  { symbol:'PHIA.AS', name:'Philips N.V.',                exchange:'EURONEXT' },
  { symbol:'HEIA.AS', name:'Heineken N.V.',               exchange:'EURONEXT' },
  { symbol:'REN.AS',  name:'RELX PLC',                    exchange:'EURONEXT' },
  // Italy / Spain
  { symbol:'ENI.MI',  name:'Eni S.p.A.',                  exchange:'BIT'    },
  { symbol:'ENEL.MI', name:'Enel S.p.A.',                 exchange:'BIT'    },
  { symbol:'ISP.MI',  name:'Intesa Sanpaolo S.p.A.',     exchange:'BIT'    },
  { symbol:'UCG.MI',  name:'UniCredit S.p.A.',            exchange:'BIT'    },
  { symbol:'RACE',    name:'Ferrari N.V.',                exchange:'NYSE'   },
  { symbol:'IBE.MC',  name:'Iberdrola S.A.',              exchange:'BME'    },
  { symbol:'SAN.MC',  name:'Banco Santander S.A.',        exchange:'BME'    },
  { symbol:'ITX.MC',  name:'Inditex (Zara)',              exchange:'BME'    },
  // Other well-known
  { symbol:'TSM',     name:'Taiwan Semiconductor (TSMC)', exchange:'NYSE'   },
  { symbol:'ERICB.ST',name:'Ericsson',                    exchange:'STO'    },
  { symbol:'ERIC',    name:'Ericsson (ADR)',               exchange:'NASDAQ' },
  { symbol:'NOK',     name:'Nokia Corporation',           exchange:'NYSE'   },
  { symbol:'TLSN',    name:'Tele2 AB',                    exchange:'STO'    },
]

// Deduplicate by symbol
const TICKER_DB = Array.from(new Map(DB.map(r => [r.symbol, r])).values())

interface Result { symbol: string; name: string; exchange: string; _score: number }

function scoreRow(row: { symbol: string; name: string; exchange: string }, q: string): number {
  const ql   = q.toLowerCase()
  const name = row.name.toLowerCase()
  const sym  = row.symbol.toUpperCase()
  const exch = row.exchange.toUpperCase()
  const major = ['NASDAQ','NYSE','XETRA','LSE','HKG','EURONEXT','AMEX','SIX']

  // HARD FILTER: must match symbol or name in some meaningful way
  const symMatch  = sym.startsWith(q.toUpperCase()) || sym.includes(q.toUpperCase())
  const nameMatch = name.startsWith(ql) || name.split(/\s+/).some(w => w.startsWith(ql)) || name.includes(ql)
  if (!symMatch && !nameMatch) return 0   // ← strict gate: no match = score 0

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

  // 1. Local DB search (instant, no API)
  const localResults: Result[] = TICKER_DB
    .map(row => ({ ...row, _score: scoreRow(row, q) }))
    .filter(r => r._score > 0)
    .sort((a, b) => b._score - a._score)
    .slice(0, 6)

  // 2. FMP search in parallel (catches everything not in local DB)
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
            .sort((a, b) => b._score - a._score)
        }
      }
    } catch { /* ignore timeout */ }
  }

  // 3. Merge: deduplicate by symbol, local DB takes priority for same symbol
  const seen  = new Set<string>(localResults.map(r => r.symbol))
  const extra = fmpResults.filter(r => !seen.has(r.symbol)).slice(0, 4)
  const all   = [...localResults, ...extra]
    .sort((a, b) => b._score - a._score)
    .slice(0, 6)
    .map(({ symbol, name, exchange }) => ({ symbol, name, exchange }))

  return NextResponse.json(all)
}

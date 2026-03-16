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


  // More US Tech
  { symbol:'AAPL',  name:'Apple Inc.',                    exchange:'NASDAQ' },
  { symbol:'HPQ',   name:'HP Inc.',                       exchange:'NYSE'   },
  { symbol:'HPE',   name:'Hewlett Packard Enterprise',    exchange:'NYSE'   },
  { symbol:'DELL',  name:'Dell Technologies Inc.',        exchange:'NYSE'   },
  { symbol:'IBM',   name:'IBM Corporation',               exchange:'NYSE'   },
  { symbol:'CSCO',  name:'Cisco Systems Inc.',            exchange:'NASDAQ' },
  { symbol:'ACN',   name:'Accenture plc',                 exchange:'NYSE'   },
  { symbol:'INFY',  name:'Infosys Limited',               exchange:'NYSE'   },
  { symbol:'WIT',   name:'Wipro Limited',                 exchange:'NYSE'   },
  { symbol:'CTSH',  name:'Cognizant Technology Solutions',exchange:'NASDAQ' },
  { symbol:'EPAM',  name:'EPAM Systems Inc.',             exchange:'NYSE'   },
  { symbol:'GLOB',  name:'Globant S.A.',                  exchange:'NYSE'   },
  { symbol:'MSTR',  name:'MicroStrategy Inc.',            exchange:'NASDAQ' },
  { symbol:'PATH',  name:'UiPath Inc.',                   exchange:'NYSE'   },
  { symbol:'AI',    name:'C3.ai Inc.',                    exchange:'NYSE'   },
  { symbol:'SOUN',  name:'SoundHound AI Inc.',            exchange:'NASDAQ' },
  { symbol:'IONQ',  name:'IonQ Inc.',                     exchange:'NYSE'   },
  { symbol:'QUBT',  name:'Quantum Computing Inc.',        exchange:'NASDAQ' },
  { symbol:'RKLB',  name:'Rocket Lab USA Inc.',           exchange:'NASDAQ' },
  { symbol:'SPCE',  name:'Virgin Galactic Holdings',      exchange:'NYSE'   },
  { symbol:'ASTS',  name:'AST SpaceMobile Inc.',          exchange:'NASDAQ' },
  // Semiconductors
  { symbol:'TSM',   name:'Taiwan Semiconductor (TSMC)',   exchange:'NYSE'   },
  { symbol:'AMAT',  name:'Applied Materials Inc.',        exchange:'NASDAQ' },
  { symbol:'LRCX',  name:'Lam Research Corporation',      exchange:'NASDAQ' },
  { symbol:'KLAC',  name:'KLA Corporation',               exchange:'NASDAQ' },
  { symbol:'MRVL',  name:'Marvell Technology Inc.',       exchange:'NASDAQ' },
  { symbol:'ON',    name:'ON Semiconductor Corporation',  exchange:'NASDAQ' },
  { symbol:'STM',   name:'STMicroelectronics N.V.',       exchange:'NYSE'   },
  { symbol:'TXN',   name:'Texas Instruments Inc.',        exchange:'NASDAQ' },
  { symbol:'ADI',   name:'Analog Devices Inc.',           exchange:'NASDAQ' },
  { symbol:'MCHP',  name:'Microchip Technology Inc.',     exchange:'NASDAQ' },
  { symbol:'SWKS',  name:'Skyworks Solutions Inc.',       exchange:'NASDAQ' },
  // Fintech
  { symbol:'SQ',    name:'Block Inc. (Square)',           exchange:'NYSE'   },
  { symbol:'AFRM',  name:'Affirm Holdings Inc.',          exchange:'NASDAQ' },
  { symbol:'UPST',  name:'Upstart Holdings Inc.',         exchange:'NASDAQ' },
  { symbol:'SOFI',  name:'SoFi Technologies Inc.',        exchange:'NASDAQ' },
  { symbol:'HOOD',  name:'Robinhood Markets Inc.',        exchange:'NASDAQ' },
  { symbol:'NU',    name:'Nu Holdings Ltd.',              exchange:'NYSE'   },
  { symbol:'TOST',  name:'Toast Inc.',                    exchange:'NYSE'   },
  { symbol:'FOUR',  name:'Shift4 Payments Inc.',          exchange:'NYSE'   },
  { symbol:'GPN',   name:'Global Payments Inc.',          exchange:'NYSE'   },
  { symbol:'FIS',   name:'Fidelity National Information', exchange:'NYSE'   },
  { symbol:'FISV',  name:'Fiserv Inc.',                   exchange:'NASDAQ' },
  // Streaming & Media
  { symbol:'WBD',   name:'Warner Bros. Discovery Inc.',   exchange:'NASDAQ' },
  { symbol:'PARA',  name:'Paramount Global',              exchange:'NASDAQ' },
  { symbol:'FOX',   name:'Fox Corporation',               exchange:'NASDAQ' },
  { symbol:'NYT',   name:'New York Times Company',        exchange:'NYSE'   },
  { symbol:'ROKU',  name:'Roku Inc.',                     exchange:'NASDAQ' },
  { symbol:'FUBO',  name:'FuboTV Inc.',                   exchange:'NYSE'   },
  { symbol:'LGF.A', name:'Lions Gate Entertainment',      exchange:'NYSE'   },
  // E-Commerce
  { symbol:'EBAY',  name:'eBay Inc.',                     exchange:'NASDAQ' },
  { symbol:'ETSY',  name:'Etsy Inc.',                     exchange:'NASDAQ' },
  { symbol:'W',     name:'Wayfair Inc.',                  exchange:'NYSE'   },
  { symbol:'CHWY',  name:'Chewy Inc.',                    exchange:'NYSE'   },
  { symbol:'CVNA',  name:'Carvana Co.',                   exchange:'NYSE'   },
  { symbol:'VTRS',  name:'Viatris Inc.',                  exchange:'NASDAQ' },
  // US Healthcare devices
  { symbol:'MDT',   name:'Medtronic plc',                 exchange:'NYSE'   },
  { symbol:'SYK',   name:'Stryker Corporation',           exchange:'NYSE'   },
  { symbol:'BSX',   name:'Boston Scientific Corporation', exchange:'NYSE'   },
  { symbol:'EW',    name:'Edwards Lifesciences',          exchange:'NYSE'   },
  { symbol:'ISRG',  name:'Intuitive Surgical Inc.',       exchange:'NASDAQ' },
  { symbol:'DXCM',  name:'Dexcom Inc.',                   exchange:'NASDAQ' },
  { symbol:'ABT',   name:'Abbott Laboratories',           exchange:'NYSE'   },
  { symbol:'BAX',   name:'Baxter International Inc.',     exchange:'NYSE'   },
  { symbol:'ZBH',   name:'Zimmer Biomet Holdings',        exchange:'NYSE'   },
  { symbol:'TFX',   name:'Teleflex Incorporated',         exchange:'NYSE'   },
  // More Pharma
  { symbol:'REGN',  name:'Regeneron Pharmaceuticals',     exchange:'NASDAQ' },
  { symbol:'VRTX',  name:'Vertex Pharmaceuticals',        exchange:'NASDAQ' },
  { symbol:'ILMN',  name:'Illumina Inc.',                 exchange:'NASDAQ' },
  { symbol:'ALNY',  name:'Alnylam Pharmaceuticals',       exchange:'NASDAQ' },
  { symbol:'INCY',  name:'Incyte Corporation',            exchange:'NASDAQ' },
  { symbol:'SGEN',  name:'Seagen Inc.',                   exchange:'NASDAQ' },
  { symbol:'HZNP',  name:'Horizon Therapeutics',          exchange:'NASDAQ' },
  { symbol:'EXEL',  name:'Exelixis Inc.',                 exchange:'NASDAQ' },
  // US Real Estate
  { symbol:'AMT',   name:'American Tower Corporation',    exchange:'NYSE'   },
  { symbol:'PLD',   name:'Prologis Inc.',                 exchange:'NYSE'   },
  { symbol:'EQIX',  name:'Equinix Inc.',                  exchange:'NASDAQ' },
  { symbol:'CCI',   name:'Crown Castle Inc.',             exchange:'NYSE'   },
  { symbol:'SPG',   name:'Simon Property Group Inc.',     exchange:'NYSE'   },
  { symbol:'O',     name:'Realty Income Corporation',     exchange:'NYSE'   },
  { symbol:'WELL',  name:'Welltower Inc.',                exchange:'NYSE'   },
  { symbol:'DLR',   name:'Digital Realty Trust Inc.',     exchange:'NYSE'   },
  // Food & Beverage
  { symbol:'MCD',   name:"McDonald's Corporation",        exchange:'NYSE'   },
  { symbol:'SBUX',  name:'Starbucks Corporation',         exchange:'NASDAQ' },
  { symbol:'QSR',   name:'Restaurant Brands International',exchange:'NYSE'  },
  { symbol:'DPZ',   name:"Domino's Pizza Inc.",           exchange:'NYSE'   },
  { symbol:'WEN',   name:"Wendy's Company",               exchange:'NASDAQ' },
  { symbol:'JACK',  name:"Jack in the Box Inc.",          exchange:'NASDAQ' },
  { symbol:'DNUT',  name:"Krispy Kreme Inc.",             exchange:'NASDAQ' },
  { symbol:'CAKE',  name:"Cheesecake Factory Inc.",       exchange:'NASDAQ' },
  { symbol:'TXRH',  name:"Texas Roadhouse Inc.",          exchange:'NASDAQ' },
  { symbol:'DINE',  name:"Dine Brands Global Inc.",       exchange:'NYSE'   },
  // Auto
  { symbol:'F',     name:'Ford Motor Company',            exchange:'NYSE'   },
  { symbol:'GM',    name:'General Motors Company',        exchange:'NYSE'   },
  { symbol:'TM',    name:'Toyota Motor Corporation',      exchange:'NYSE'   },
  { symbol:'HMC',   name:'Honda Motor Co. Ltd.',          exchange:'NYSE'   },
  { symbol:'STLA',  name:'Stellantis N.V.',               exchange:'NYSE'   },
  { symbol:'RACE',  name:'Ferrari N.V.',                  exchange:'NYSE'   },
  { symbol:'NIO',   name:'NIO Inc.',                      exchange:'NYSE'   },
  { symbol:'XPEV',  name:'XPeng Inc.',                    exchange:'NYSE'   },
  { symbol:'LI',    name:'Li Auto Inc.',                  exchange:'NASDAQ' },
  { symbol:'LCID',  name:'Lucid Group Inc.',              exchange:'NASDAQ' },
  // Airlines & Travel
  { symbol:'DAL',   name:'Delta Air Lines Inc.',          exchange:'NYSE'   },
  { symbol:'UAL',   name:'United Airlines Holdings',      exchange:'NASDAQ' },
  { symbol:'AAL',   name:'American Airlines Group',       exchange:'NASDAQ' },
  { symbol:'LUV',   name:'Southwest Airlines Co.',        exchange:'NYSE'   },
  { symbol:'JBLU',  name:'JetBlue Airways Corporation',   exchange:'NASDAQ' },
  { symbol:'ALK',   name:'Alaska Air Group Inc.',         exchange:'NYSE'   },
  { symbol:'RCL',   name:'Royal Caribbean Group',         exchange:'NYSE'   },
  { symbol:'CCL',   name:'Carnival Corporation',          exchange:'NYSE'   },
  { symbol:'NCLH',  name:'Norwegian Cruise Line Holdings',exchange:'NYSE'   },
  { symbol:'MAR',   name:'Marriott International Inc.',   exchange:'NASDAQ' },
  { symbol:'HLT',   name:'Hilton Worldwide Holdings',     exchange:'NYSE'   },
  { symbol:'H',     name:'Hyatt Hotels Corporation',      exchange:'NYSE'   },
  { symbol:'BKNG',  name:'Booking Holdings Inc.',         exchange:'NASDAQ' },
  { symbol:'EXPE',  name:'Expedia Group Inc.',            exchange:'NASDAQ' },
  { symbol:'TRIP',  name:'TripAdvisor Inc.',              exchange:'NASDAQ' },
  // More Germany
  { symbol:'MTX.DE',  name:'MTU Aero Engines AG',         exchange:'XETRA'  },
  { symbol:'HAB.DE',  name:'Hapag-Lloyd AG',              exchange:'XETRA'  },
  { symbol:'SRT.DE',  name:'Sartorius AG',                exchange:'XETRA'  },
  { symbol:'EVT.DE',  name:'Evotec SE',                   exchange:'XETRA'  },
  { symbol:'BNR.DE',  name:'Brenntag SE',                 exchange:'XETRA'  },
  { symbol:'SHL.DE',  name:'Siemens Healthineers AG',     exchange:'XETRA'  },
  { symbol:'ENR.DE',  name:'Siemens Energy AG',           exchange:'XETRA'  },
  { symbol:'PUM.DE',  name:'PUMA SE',                     exchange:'XETRA'  },
  { symbol:'AIXA.DE', name:'Aixtron SE',                  exchange:'XETRA'  },
  { symbol:'NDX1.DE', name:'Nordex SE',                   exchange:'XETRA'  },
  { symbol:'DWS.DE',  name:'DWS Group GmbH & Co. KGaA',  exchange:'XETRA'  },
  { symbol:'AF.DE',   name:'Air France-KLM',              exchange:'XETRA'  },
  // More Asia
  { symbol:'BABA',    name:'Alibaba Group Holding',       exchange:'NYSE'   },
  { symbol:'9988.HK', name:'Alibaba Group (HK)',          exchange:'HKG'    },
  { symbol:'0941.HK', name:'China Mobile Limited',        exchange:'HKG'    },
  { symbol:'0762.HK', name:'China Unicom (Hong Kong)',    exchange:'HKG'    },
  { symbol:'2020.HK', name:'ANTA Sports Products',        exchange:'HKG'    },
  { symbol:'9999.HK', name:'NetEase Inc.',                exchange:'HKG'    },
  { symbol:'3888.HK', name:'Kingsoft Corporation',        exchange:'HKG'    },
  { symbol:'0175.HK', name:'Geely Automobile Holdings',   exchange:'HKG'    },
  { symbol:'2382.HK', name:'Sunny Optical Technology',    exchange:'HKG'    },
  { symbol:'6862.HK', name:'Haidilao International',      exchange:'HKG'    },
  { symbol:'BIDU',    name:'Baidu Inc.',                  exchange:'NASDAQ' },
  { symbol:'JD',      name:'JD.com Inc.',                 exchange:'NASDAQ' },
  { symbol:'PDD',     name:'PDD Holdings Inc. (Temu/Pinduoduo)', exchange:'NASDAQ' },
  { symbol:'VIPS',    name:'Vipshop Holdings Limited',    exchange:'NYSE'   },
  { symbol:'TAL',     name:'TAL Education Group',         exchange:'NYSE'   },
  { symbol:'EDU',     name:'New Oriental Education',      exchange:'NYSE'   },
  // Japan
  { symbol:'7203.T',  name:'Toyota Motor Corporation',    exchange:'TSE'    },
  { symbol:'6758.T',  name:'Sony Group Corporation',      exchange:'TSE'    },
  { symbol:'9984.T',  name:'SoftBank Group Corp.',        exchange:'TSE'    },
  { symbol:'6501.T',  name:'Hitachi Ltd.',                exchange:'TSE'    },
  { symbol:'6702.T',  name:'Fujitsu Limited',             exchange:'TSE'    },
  { symbol:'9432.T',  name:'Nippon Telegraph & Telephone',exchange:'TSE'    },
  { symbol:'4519.T',  name:'Chugai Pharmaceutical',       exchange:'TSE'    },
  { symbol:'SONY',    name:'Sony Group Corporation (ADR)',exchange:'NYSE'   },
  { symbol:'9434.T',  name:'SoftBank Corp.',              exchange:'TSE'    },
  // India
  { symbol:'RELIANCE.NS', name:'Reliance Industries',     exchange:'NSE'    },
  { symbol:'TCS.NS',      name:'Tata Consultancy Services',exchange:'NSE'   },
  { symbol:'INFY',        name:'Infosys Limited (ADR)',   exchange:'NYSE'   },
  { symbol:'HDB',         name:'HDFC Bank Limited (ADR)', exchange:'NYSE'   },
  { symbol:'WIT',         name:'Wipro Limited (ADR)',     exchange:'NYSE'   },
  // Brazil
  { symbol:'VALE',  name:'Vale S.A.',                     exchange:'NYSE'   },
  { symbol:'PBR',   name:'Petrobras',                     exchange:'NYSE'   },
  { symbol:'ITUB',  name:'Itaú Unibanco Holding S.A.',   exchange:'NYSE'   },
  { symbol:'BBD',   name:'Banco Bradesco S.A.',           exchange:'NYSE'   },
  // Mining & Materials
  { symbol:'BHP',   name:'BHP Group Limited',             exchange:'NYSE'   },
  { symbol:'RIO',   name:'Rio Tinto Group (ADR)',         exchange:'NYSE'   },
  { symbol:'GOLD',  name:'Barrick Gold Corporation',      exchange:'NYSE'   },
  { symbol:'NEM',   name:'Newmont Corporation',           exchange:'NYSE'   },
  { symbol:'FCX',   name:'Freeport-McMoRan Inc.',         exchange:'NYSE'   },
  { symbol:'AA',    name:'Alcoa Corporation',             exchange:'NYSE'   },
  { symbol:'NUE',   name:'Nucor Corporation',             exchange:'NYSE'   },
  { symbol:'X',     name:'United States Steel Corporation',exchange:'NYSE'  },
  { symbol:'CLF',   name:'Cleveland-Cliffs Inc.',         exchange:'NYSE'   },
  // Crypto-related
  { symbol:'MSTR',  name:'MicroStrategy Inc.',            exchange:'NASDAQ' },
  { symbol:'MARA',  name:'Marathon Digital Holdings',     exchange:'NASDAQ' },
  { symbol:'RIOT',  name:'Riot Platforms Inc.',           exchange:'NASDAQ' },
  { symbol:'HUT',   name:'Hut 8 Mining Corp.',            exchange:'NASDAQ' },
  { symbol:'BTBT',  name:'Bit Digital Inc.',              exchange:'NASDAQ' },
  // Insurance  
  { symbol:'MET',   name:'MetLife Inc.',                  exchange:'NYSE'   },
  { symbol:'PRU',   name:'Prudential Financial Inc.',     exchange:'NYSE'   },
  { symbol:'AFL',   name:'Aflac Inc.',                    exchange:'NYSE'   },
  { symbol:'ALL',   name:'Allstate Corporation',          exchange:'NYSE'   },
  { symbol:'CB',    name:'Chubb Limited',                 exchange:'NYSE'   },
  { symbol:'HIG',   name:'Hartford Financial Services',   exchange:'NYSE'   },
  { symbol:'TRV',   name:'Travelers Companies Inc.',      exchange:'NYSE'   },
  { symbol:'PGR',   name:'Progressive Corporation',       exchange:'NYSE'   },
  // Telecom
  { symbol:'T',     name:'AT&T Inc.',                     exchange:'NYSE'   },
  { symbol:'VZ',    name:'Verizon Communications Inc.',   exchange:'NYSE'   },
  { symbol:'TMUS',  name:'T-Mobile US Inc.',              exchange:'NASDAQ' },
  { symbol:'LUMN',  name:'Lumen Technologies Inc.',       exchange:'NYSE'   },
  { symbol:'DISH',  name:'DISH Network Corporation',      exchange:'NASDAQ' },
  { symbol:'AMX',   name:'América Móvil S.A.B.',          exchange:'NYSE'   },
  // Utilities
  { symbol:'DUK',   name:'Duke Energy Corporation',       exchange:'NYSE'   },
  { symbol:'SO',    name:'Southern Company',              exchange:'NYSE'   },
  { symbol:'D',     name:'Dominion Energy Inc.',          exchange:'NYSE'   },
  { symbol:'AEP',   name:'American Electric Power',       exchange:'NASDAQ' },
  { symbol:'EXC',   name:'Exelon Corporation',            exchange:'NASDAQ' },
  { symbol:'PCG',   name:'PG&E Corporation',              exchange:'NYSE'   },
  { symbol:'SRE',   name:'Sempra Energy',                 exchange:'NYSE'   },

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

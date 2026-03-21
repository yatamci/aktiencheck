import { NextRequest, NextResponse } from 'next/server'
import { incrementUsage } from '../../../lib/usageCounter'

// ─── Types ────────────────────────────────────────────────────────────────────
interface StockMetrics {
  name:string|null; sector:string|null; industry:string|null; description:string|null
  price:number|null; currency:string|null; ipoDate:string|null; city:string|null
  country:string|null; employees:string|null; ceo:string|null
  pe:number|null; ps:number|null; pb:number|null; roe:number|null; roa:number|null
  grossMargin:number|null; operatingMargin:number|null; netMargin:number|null
  cashflow:number|null; debt:number|null; currentRatio:number|null; rsi:number|null
  dividendYield:number|null; revenueGrowth:number|null; earningsGrowth:number|null
  hist:{ date:string; close:number }[]
  historicalRatios?: Record<string,unknown>[]
}
function empty(): StockMetrics {
  return { name:null,sector:null,industry:null,description:null,price:null,currency:null,
    ipoDate:null,city:null,country:null,employees:null,ceo:null,pe:null,ps:null,pb:null,
    roe:null,roa:null,grossMargin:null,operatingMargin:null,netMargin:null,cashflow:null,
    debt:null,currentRatio:null,rsi:null,dividendYield:null,revenueGrowth:null,
    earningsGrowth:null,hist:[],historicalRatios:[] }
}
function merge(base:StockMetrics, patch:Partial<StockMetrics>): StockMetrics {
  const out={...base}
  for (const k of Object.keys(patch) as (keyof StockMetrics)[]) {
    const v=patch[k]; if(v==null) continue
    if(k==='hist'){ if(out.hist.length===0&&Array.isArray(v)) out.hist=v as StockMetrics['hist'] }
    else if(k==='historicalRatios'){ if((!out.historicalRatios||out.historicalRatios.length===0)&&Array.isArray(v)) out.historicalRatios=v as Record<string,unknown>[] }
    else if(out[k]==null)(out as Record<string,unknown>)[k]=v
  }
  return out
}
function isFull(m:StockMetrics):boolean {
  return ['name','price','pe','ps','pb','roe','roa','grossMargin','operatingMargin','netMargin','debt','currentRatio','dividendYield','revenueGrowth','earningsGrowth']
    .every(k=>m[k as keyof StockMetrics]!=null)
}

// ─── HTTP ─────────────────────────────────────────────────────────────────────
async function get(url:string):Promise<unknown> {
  try{const r=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(8000)});return await r.json()}
  catch{return null}
}
function first(v:unknown):Record<string,unknown> {
  if(!v) return {}; if(Array.isArray(v)) return(v[0]??{}) as Record<string,unknown>
  if(typeof v==='object') return v as Record<string,unknown>; return {}
}
function num(obj:Record<string,unknown>,...keys:string[]):number|null {
  for(const k of keys){const v=obj[k]
    if(v!=null&&typeof v==='number'&&isFinite(v)&&v!==0) return v
    if(v!=null&&typeof v==='string'&&v.trim()&&v!=='None'&&v!=='-'&&isFinite(Number(v))&&Number(v)!==0) return Number(v)
  }; return null
}
function str(obj:Record<string,unknown>,...keys:string[]):string|null {
  for(const k of keys){const v=obj[k]; if(v&&typeof v==='string'&&v.trim()&&v!=='null'&&v!=='None'&&v!=='N/A') return v.trim()}
  return null
}
function isLimited(d:unknown):boolean {
  const s=JSON.stringify(d??'').toLowerCase()
  return s.includes('"limit')||s.includes('rate limit')||s.includes('upgrade')||s.includes('429')||s.includes('too many')||s.includes('quota')
}

// ─── Name map ─────────────────────────────────────────────────────────────────
const NAME_MAP:Record<string,string> = {
  'apple':'AAPL','microsoft':'MSFT','google':'GOOGL','alphabet':'GOOGL',
  'amazon':'AMZN','tesla':'TSLA','meta':'META','facebook':'META','instagram':'META',
  'nvidia':'NVDA','netflix':'NFLX','intel':'INTC','amd':'AMD','qualcomm':'QCOM',
  'broadcom':'AVGO','oracle':'ORCL','salesforce':'CRM','adobe':'ADBE',
  'servicenow':'NOW','snowflake':'SNOW','palantir':'PLTR','shopify':'SHOP',
  'uber':'UBER','lyft':'LYFT','airbnb':'ABNB','spotify':'SPOT','coinbase':'COIN',
  'zoom':'ZM','docusign':'DOCU','okta':'OKTA','cloudflare':'NET','datadog':'DDOG',
  'crowdstrike':'CRWD','zscaler':'ZS','mongodb':'MDB','twilio':'TWLO','hubspot':'HUBS',
  'atlassian':'TEAM','roblox':'RBLX','rivian':'RIVN','lucid':'LCID','snap':'SNAP',
  'pinterest':'PINS',
  'jpmorgan':'JPM','jp morgan':'JPM','bank of america':'BAC','wells fargo':'WFC',
  'goldman sachs':'GS','morgan stanley':'MS','citigroup':'C','blackrock':'BLK',
  'visa':'V','mastercard':'MA','paypal':'PYPL','american express':'AXP','amex':'AXP',
  'berkshire':'BRK.B','berkshire hathaway':'BRK.B',
  'walmart':'WMT','target':'TGT','costco':'COST','home depot':'HD',
  'mcdonalds':'MCD',"mcdonald's":'MCD','starbucks':'SBUX','nike':'NKE',
  'disney':'DIS','procter gamble':'PG','procter & gamble':'PG','coca cola':'KO',
  'coca-cola':'KO','pepsi':'PEP','pepsico':'PEP','philip morris':'PM',
  'altria':'MO','colgate':'CL','mondelez':'MDLZ','chipotle':'CMG','yum brands':'YUM',
  'johnson':'JNJ','johnson & johnson':'JNJ','pfizer':'PFE','merck':'MRK',
  'abbvie':'ABBV','eli lilly':'LLY','lilly':'LLY','bristol myers':'BMY',
  'amgen':'AMGN','gilead':'GILD','biogen':'BIIB','moderna':'MRNA','biontech':'BNTX',
  'unitedhealth':'UNH','cvs':'CVS',
  'exxon':'XOM','exxonmobil':'XOM','chevron':'CVX','conocophillips':'COP',
  'bp':'BP','shell':'SHEL','nextera':'NEE',
  'boeing':'BA','raytheon':'RTX','rtx':'RTX','lockheed':'LMT','lockheed martin':'LMT',
  'northrop':'NOC','ge':'GE','caterpillar':'CAT','deere':'DE','john deere':'DE',
  '3m':'MMM','honeywell':'HON','ups':'UPS','fedex':'FDX',
  'sap':'SAP','siemens':'SIE.DE','allianz':'ALV.DE','mercedes':'MBG.DE',
  'mercedes-benz':'MBG.DE','bmw':'BMW.DE','volkswagen':'VOW3.DE','vw':'VOW3.DE',
  'adidas':'ADS.DE','bayer':'BAYN.DE','basf':'BAS.DE','deutsche bank':'DBK.DE',
  'deutsche telekom':'DTE.DE','telekom':'DTE.DE','lufthansa':'LHA.DE',
  'rheinmetall':'RHM.DE','merck kgaa':'MRK.DE','fresenius':'FRE.DE',
  'henkel':'HEN3.DE','infineon':'IFX.DE','continental':'CON.DE',
  'eon':'EOAN.DE','e.on':'EOAN.DE','rwe':'RWE.DE','porsche':'P911.DE',
  'zalando':'ZAL.DE','hellofresh':'HFG.DE','dhl':'DHL.DE','vonovia':'VNA.DE','beiersdorf':'BEI.DE',
  'lvmh':'MC.PA','loreal':'OR.PA',"l'oreal":'OR.PA','totalenergies':'TTE.PA',
  'total':'TTE.PA','airbus':'AIR.PA','sanofi':'SAN.PA','bnp paribas':'BNP.PA',
  'hermes':'RMS.PA','hermès':'RMS.PA','kering':'KER.PA','schneider':'SU.PA',
  'nestle':'NESN.SW','nestlé':'NESN.SW','roche':'ROG.SW','novartis':'NOVN.SW','swatch':'UHR.SW','abb':'ABBN.SW',
  'hsbc':'HSBA.L','unilever':'ULVR.L','gsk':'GSK.L','vodafone':'VOD.L','rio tinto':'RIO.L','barclays':'BARC.L',
  'xiaomi':'1810.HK','tencent':'0700.HK','alibaba':'BABA','jd.com':'JD','jd':'JD',
  'pinduoduo':'PDD','temu':'PDD','pdd':'PDD','baidu':'BIDU','nio':'NIO',
  'xpeng':'XPEV','li auto':'LI','samsung':'005930.KS','toyota':'TM','honda':'HMC',
  'sony':'SONY','tsmc':'TSM','taiwan semiconductor':'TSM','meituan':'3690.HK',
  'asml':'ASML','philips':'PHIA.AS','heineken':'HEIA.AS',
  'ferrari':'RACE','ericsson':'ERIC','nokia':'NOK',
  'eni':'ENI.MI','enel':'ENEL.MI','intesa':'ISP.MI','unicredit':'UCG.MI',
  'iberdrola':'IBE.MC','santander':'SAN.MC','inditex':'ITX.MC','zara':'ITX.MC',
  // Asian additions
  'huawei':'0941.HK', // Note: Huawei is private, China Mobile as proxy
  'netease':'9999.HK','net ease':'9999.HK',
  'geely':'0175.HK','hkex':'0388.HK','hong kong exchange':'0388.HK',
  'aia':'1299.HK','ping an':'2318.HK','icbc':'1398.HK',
  'ccb':'0939.HK','byd':'1211.HK','byd electronic':'0285.HK',
  'li auto':'LI','xpeng':'XPEV','kuaishou':'1024.HK',
  'kingsoft':'3888.HK','anta':'2020.HK','haidilao':'6862.HK',
  'sk hynix':'000660.KS','hynix':'000660.KS','lg chem':'051910.KS',
  'hyundai':'005380.KS','naver':'035420.KS','kakao':'035720.KS',
  'samsung sdi':'006400.KS','kia':'000270.KS',
  'hitachi':'6501.T','fujitsu':'6702.T','ntt':'9432.T',
  'recruit':'6098.T','shin-etsu':'4063.T','daikin':'6367.T',
  'uniqlo':'9983.T','fast retailing':'9983.T','takeda':'4502.T',
  'canon':'7751.T','keyence':'6861.T','tokyo electron':'8035.T',
  'daiichi sankyo':'4568.T',
  'reliance':'RELIANCE.NS','tcs':'TCS.NS','hdfc':'HDFCBANK.NS',
  'infosys':'INFY.NS','wipro':'WIPRO.NS','icici':'ICICIBANK.NS',
  'bajaj':'BAJFINANCE.NS','titan':'TITAN.NS',
  // Australian
  'commonwealth bank':'CBA.AX','cba':'CBA.AX','bhp':'BHP.AX',
  'csl':'CSL.AX','nab':'NAB.AX','macquarie':'MQG.AX','wesfarmers':'WES.AX',
  // Canadian
  'royal bank':'RY','royal bank canada':'RY','td bank':'TD',
  'enbridge':'ENB','canadian national':'CNR','bank of montreal':'BMO',
  'nova scotia bank':'BNS','canadian pacific':'CP','manulife':'MFC',
  // Brazilian  
  'vale':'VALE','petrobras':'PBR','itau':'ITUB','bradesco':'BBD',
  'ambev':'ABEV','embraer':'ERJ',
  // Nordic
  'novo nordisk':'NVO','novozymes':'NVO','volvo':'VOLV-B.ST',
  'atlas copco':'ATCO-A.ST','equinor':'EQNR','statoil':'EQNR',
  'dnb':'DNB.OL',
  // Swiss
  'nestle':'NESN.SW','nestlé':'NESN.SW','lonza':'LONN.SW','ubs':'UBSG.SW',
  'richemont':'CFR.SW','cartier':'CFR.SW',
  // Dutch
  'philips':'PHIA.AS','heineken':'HEIA.AS','ing':'INGA.AS',
  // Italian
  'eni':'ENI.MI','enel':'ENEL.MI','intesa sanpaolo':'ISP.MI',
  'unicredit':'UCG.MI','stellantis':'STLAM.MI','pirelli':'PIRC.MI',
  // Spanish
  'telefonica':'TEF.MC','telefónica':'TEF.MC','amadeus':'AMS.MC',
  // UK extras
  'astrazeneca':'AZN.L','lloyds':'LLOY.L','national grid':'NG.L',
  'bt group':'BT-A.L','relx':'REL.L','diageo':'DGE.L','experian':'EXPN.L',
  'burberry':'BRBY.L',
  // US extras  
  'applied materials':'AMAT','lam research':'LRCX','kla':'KLAC',
  'texas instruments':'TXN','analog devices':'ADI','marvell':'MRVL',
  'on semiconductor':'ON','monolithic power':'MPWR',
  'lockheed':'LMT','raytheon':'RTX','northrop grumman':'NOC',
  'general dynamics':'GD','huntington ingalls':'HII',
  'regeneron':'REGN','vertex pharma':'VRTX','vertex':'VRTX',
  'intuitive surgical':'ISRG','medtronic':'MDT','stryker':'SYK',
  'boston scientific':'BSX','abbott':'ABT','dexcom':'DXCM','idexx':'IDXX',
  'block':'SQ','affirm':'AFRM','sofi':'SOFI','nu bank':'NU','nubank':'NU',
  'mercadolibre':'MELI','sea limited':'SE',
  'american tower':'AMT','prologis':'PLD','equinix':'EQIX',
  'crown castle':'CCI','realty income':'O','digital realty':'DLR',
  'metlife':'MET','prudential':'PRU','aflac':'AFL','chubb':'CB',
  'progressive':'PGR','munich re':'MUV2.DE','munich reinsurance':'MUV2.DE',
  'microstrategy':'MSTR','marathon digital':'MARA','riot platforms':'RIOT',
  'ge aerospace':'GE','illinois tool':'ITW','rockwell':'ROK',
  'parker hannifin':'PH','eaton':'ETN','danaher':'DHR','fortive':'FTV',
  'carrier':'CARR','otis':'OTIS','ecolab':'ECL','sherwin williams':'SHW',
  'ppg':'PPG','dupont':'DD','lyondellbasell':'LYB','albemarle':'ALB',
  'freeport':'FCX','newmont':'NEM','barrick':'GOLD','kinross':'KGC',
  'lululemon':'LULU','crocs':'CROX','under armour':'UAA','birkenstock':'BIRK',
  'rivian':'RIVN','lucid motors':'LCID','nextera':'NEE','enphase':'ENPH',
  'first solar':'FSLR','solaredge':'SEDG',
  'at&t':'T','verizon':'VZ','t-mobile':'TMUS','tmobile':'TMUS',
  'america movil':'AMX','orange telecom':'ORAN',
}

// ─── Ticker resolution ────────────────────────────────────────────────────────
function scoreResult(row:Record<string,unknown>,query:string):number {
  const ql=query.toLowerCase(); const name=String(row.name??'').toLowerCase()
  const sym=String(row.symbol??'').toUpperCase(); const exch=String(row.exchangeShortName??'').toUpperCase()
  const major=['NASDAQ','NYSE','XETRA','LSE','HKG','EURONEXT','AMEX','SHH','SHZ']
  let s=0
  if(sym===query.toUpperCase()) s+=100; if(name===ql) s+=90
  if(name.startsWith(ql)) s+=60; if(name.includes(' '+ql)) s+=40
  if(name.includes(ql)) s+=20; if(major.includes(exch)) s+=15
  if(!sym.includes('.')) s+=5; return s
}

async function resolveTicker(query:string,fmpKey:string):Promise<string> {
  const q=query.trim(); const ql=q.toLowerCase().replace(/[^a-z0-9\s.]/g,'')
  for(const [n,t] of Object.entries(NAME_MAP)){
    if(ql===n||ql.startsWith(n+' ')||n.startsWith(ql)) return t
  }
  const [fmpRaw,nasdaqRaw]=await Promise.all([
    get(`https://financialmodelingprep.com/stable/search?query=${encodeURIComponent(q)}&limit=20&apikey=${fmpKey}`),
    fetch(`https://api.nasdaq.com/api/screener/stocks?tableonly=true&limit=10&download=true&keyword=${encodeURIComponent(q)}`,
      {headers:{'User-Agent':'Mozilla/5.0'},signal:AbortSignal.timeout(4000)}).then(r=>r.json()).catch(()=>null),
  ])
  const fmpRows=Array.isArray(fmpRaw)?fmpRaw as Record<string,unknown>[]:[]
  const nasdaqData=nasdaqRaw as Record<string,unknown>|null
  const nasdaqTable=nasdaqData?.data as Record<string,unknown>|undefined
  const nasdaqInner=nasdaqTable?.table as Record<string,unknown>|undefined
  const nasdaqRows=(nasdaqInner?.rows??[]) as Record<string,unknown>[]
  const nasdaqNorm=nasdaqRows.map(r=>({symbol:r.symbol,name:r.name,exchangeShortName:'NASDAQ'}))
  const all=[...fmpRows,...nasdaqNorm].filter(r=>r.symbol&&r.name)
  if(all.length===0) return q.toUpperCase()
  const best=all.map(r=>({r,s:scoreResult(r,q)})).sort((a,b)=>b.s-a.s)[0]
  return String(best.r.symbol??q.toUpperCase())
}

// ─── Source fetchers ──────────────────────────────────────────────────────────
async function fromFMP(ticker:string,key:string):Promise<Partial<StockMetrics>> {
  // For HK stocks like 1810.HK, FMP may need the ticker without exchange suffix
  // Try both formats
  const [pR,rR,mR,gR,tR,hR,rAnn]=await Promise.all([
    get(`https://financialmodelingprep.com/stable/profile?symbol=${ticker}&apikey=${key}`),
    get(`https://financialmodelingprep.com/stable/ratios-ttm?symbol=${ticker}&apikey=${key}`),
    get(`https://financialmodelingprep.com/stable/key-metrics-ttm?symbol=${ticker}&apikey=${key}`),
    get(`https://financialmodelingprep.com/stable/financial-growth?symbol=${ticker}&limit=1&apikey=${key}`),
    get(`https://financialmodelingprep.com/stable/technical-indicator/daily?symbol=${ticker}&type=rsi&period=14&apikey=${key}`),
    get(`https://financialmodelingprep.com/stable/historical-price-eod/full?symbol=${ticker}&limit=1300&apikey=${key}`),
    get(`https://financialmodelingprep.com/stable/ratios?symbol=${ticker}&limit=10&apikey=${key}`),
  ])
  if(isLimited(pR)) return {}
  const p=first(pR),r=first(rR),m=first(mR),g=first(gR)
  let rsi:number|null=null
  if(Array.isArray(tR)&&tR.length>0) rsi=num(tR[0] as Record<string,unknown>,'rsi','value')
  else rsi=num(first(tR),'rsi','value')
  let hist:StockMetrics['hist']=[]
  if(Array.isArray(hR)) hist=hR as StockMetrics['hist']
  else{const h=(hR as Record<string,unknown>)?.historical; if(Array.isArray(h)) hist=h as StockMetrics['hist']}
  return {
    name:str(p,'companyName','name'),sector:str(p,'sector'),industry:str(p,'industry'),
    description:str(p,'description'),price:num(p,'price'),currency:str(p,'currency'),
    ipoDate:str(p,'ipoDate'),city:str(p,'city'),country:str(p,'country'),
    employees:p.fullTimeEmployees!=null?String(p.fullTimeEmployees):null,ceo:str(p,'ceo'),
    pe:num(r,'peRatioTTM','peRatio','priceEarningsRatio'),
    ps:num(r,'priceToSalesRatioTTM','priceToSalesRatio'),
    pb:num(r,'priceToBookRatioTTM','priceToBookRatio'),
    roe:num(r,'returnOnEquityTTM','returnOnEquity'),roa:num(r,'returnOnAssetsTTM','returnOnAssets'),
    grossMargin:num(r,'grossProfitMarginTTM','grossProfitMargin'),
    operatingMargin:num(r,'operatingProfitMarginTTM','operatingProfitMargin'),
    netMargin:num(r,'netProfitMarginTTM','netProfitMargin'),
    cashflow:num(m,'freeCashFlowPerShareTTM','freeCashFlowPerShare'),
    debt:num(r,'debtEquityRatioTTM','debtEquityRatio','debtToEquity'),
    currentRatio:num(r,'currentRatioTTM','currentRatio'),
    dividendYield:num(r,'dividendYieldTTM','dividendYield'),
    revenueGrowth:num(g,'revenueGrowth'),earningsGrowth:num(g,'netIncomeGrowth'),rsi,hist,
    historicalRatios: Array.isArray(rAnn) ? (rAnn as Record<string,unknown>[]).slice().reverse() : [],
  }
}

async function fromAlphaVantage(ticker:string,key:string):Promise<Partial<StockMetrics>> {
  // AV only covers US/NYSE/NASDAQ stocks well; skip HK/DE/PA
  if(ticker.includes('.HK')||ticker.includes('.KS')||ticker.includes('.T')) return {}
  const sym=ticker.replace('.DE','').replace('.PA','').replace('.SW','').replace('.AS','')
  const d=first(await get(`https://www.alphavantage.co/query?function=OVERVIEW&symbol=${sym}&apikey=${key}`))
  if(!d||isLimited(d)||!str(d,'Symbol')) return {}
  return {
    name:str(d,'Name'),sector:str(d,'Sector'),industry:str(d,'Industry'),description:str(d,'Description'),
    pe:num(d,'PERatio','TrailingPE'),pb:num(d,'PriceToBookRatio'),ps:num(d,'PriceToSalesRatioTTM'),
    roe:num(d,'ReturnOnEquityTTM'),roa:num(d,'ReturnOnAssetsTTM'),
    operatingMargin:num(d,'OperatingMarginTTM'),netMargin:num(d,'ProfitMargin'),
    dividendYield:num(d,'DividendYield'),revenueGrowth:num(d,'QuarterlyRevenueGrowthYOY'),
    earningsGrowth:num(d,'QuarterlyEarningsGrowthYOY'),
  }
}

async function fromFinnhub(ticker:string,key:string):Promise<Partial<StockMetrics>> {
  // Finnhub HK stocks use format like "1810.HK" unchanged
  // For European exchanges: remove .DE .PA etc for Finnhub which uses XETRA: prefix
  const sym = ticker.includes('.HK') ? ticker :
              ticker.includes('.DE') ? ticker.replace('.DE','') :
              ticker.includes('.PA') ? ticker.replace('.PA','') :
              ticker.replace('.SW','').replace('.AS','').replace('.MI','').replace('.MC','')
  const [pR,mR,qR]=await Promise.all([
    get(`https://finnhub.io/api/v1/stock/profile2?symbol=${sym}&token=${key}`),
    get(`https://finnhub.io/api/v1/stock/metric?symbol=${sym}&metric=all&token=${key}`),
    get(`https://finnhub.io/api/v1/quote?symbol=${sym}&token=${key}`),
  ])
  if(isLimited(mR)) return {}
  const p=first(pR),q=(mR as Record<string,unknown>)?.metric as Record<string,unknown>??{},qt=first(qR)
  return {
    name:str(p,'name'),sector:str(p,'finnhubIndustry'),price:num(qt,'c','current'),
    pe:num(q,'peTTM','peBasicExclExtraTTM'),ps:num(q,'psTTM','psAnnual'),
    pb:num(q,'pbAnnual','pbQuarterly'),roe:num(q,'roeTTM','roeRfy'),roa:num(q,'roaTTM','roaRfy'),
    grossMargin:num(q,'grossMarginTTM','grossMarginAnnual'),
    operatingMargin:num(q,'operatingMarginTTM','operatingMarginAnnual'),
    netMargin:num(q,'netProfitMarginTTM','netProfitMarginAnnual'),
    currentRatio:num(q,'currentRatioAnnual','currentRatioQuarterly'),
    debt:num(q,'totalDebt/totalEquityAnnual'),
    dividendYield:num(q,'dividendYieldIndicatedAnnual'),
    revenueGrowth:num(q,'revenueGrowthTTMYoy','revenueGrowth3Y'),
    earningsGrowth:num(q,'epsGrowthTTMYoy','epsGrowthQuarterlyYoy'),
    cashflow:num(q,'freeCashFlowPerShareTTM'),
  }
}

async function fromYahooFinance(ticker:string):Promise<Partial<StockMetrics>> {
  // Yahoo uses 1810.HK, 005930.KS, 7203.T etc. directly
  // Add User-Agent to avoid 429 from Vercel IPs
  const headers = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
  const summaryModules = 'summaryDetail%2CdefaultKeyStatistics%2CfinancialData%2CassetProfile'
  const url2a = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(ticker)}?modules=${summaryModules}`
  const url2b = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(ticker)}?modules=${summaryModules}`
  const [chartRaw, summaryRaw] = await Promise.all([
    fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=5y`,{headers,signal:AbortSignal.timeout(8000),cache:'no-store'}).then(r=>r.json()).catch(()=>null),
    fetch(url2a,{headers,signal:AbortSignal.timeout(8000),cache:'no-store'}).then(r=>r.json())
      .catch(()=>fetch(url2b,{headers,signal:AbortSignal.timeout(8000),cache:'no-store'}).then(r=>r.json()).catch(()=>null)),
  ])
  let hist:StockMetrics['hist']=[]
  try {
    const res0=((chartRaw as Record<string,unknown>)?.chart as Record<string,unknown>)?.result as Record<string,unknown>[]
    const r0=res0?.[0]; const ts=r0?.timestamp as number[]??[]
    const closes=((r0?.indicators as Record<string,unknown>)?.quote as Record<string,unknown>[])?.[0]?.close as number[]??[]
    hist=ts.map((t,i)=>({date:new Date(t*1000).toISOString().slice(0,10),close:closes[i]??0})).filter(h=>h.close>0)
  } catch{/* */}
  try {
    const res=((summaryRaw as Record<string,unknown>)?.quoteSummary as Record<string,unknown>)?.result as Record<string,unknown>[]
    const r=res?.[0]; if(!r||isLimited(summaryRaw)) return{hist}
    const sd=r.summaryDetail as Record<string,unknown>??{}
    const ks=r.defaultKeyStatistics as Record<string,unknown>??{}
    const fd=r.financialData as Record<string,unknown>??{}
    const ap=r.assetProfile as Record<string,unknown>??{}
    const rn=(o:Record<string,unknown>,k:string)=>{const v=(o[k] as Record<string,unknown>)?.raw; return v!=null&&typeof v==='number'&&isFinite(v)?v:null}
    return {
      name:str(ap,'longName')??str(ap,'shortName'),sector:str(ap,'sector'),industry:str(ap,'industry'),
      description:str(ap,'longBusinessSummary'),city:str(ap,'city'),country:str(ap,'country'),
      employees:ap.fullTimeEmployees!=null?String(ap.fullTimeEmployees):null,
      price:rn(sd,'regularMarketPrice')??rn(fd,'currentPrice'),currency:str(sd,'currency'),
      pe:rn(sd,'trailingPE')??rn(sd,'forwardPE'),pb:rn(ks,'priceToBook'),
      ps:rn(ks,'priceToSalesTrailing12Months'),roe:rn(fd,'returnOnEquity'),roa:rn(fd,'returnOnAssets'),
      grossMargin:rn(fd,'grossMargins'),operatingMargin:rn(fd,'operatingMargins'),netMargin:rn(fd,'profitMargins'),
      debt:rn(ks,'debtToEquity'),currentRatio:rn(fd,'currentRatio'),cashflow:(() => {
        const fcf = rn(fd,'freeCashflow')
        const shares = rn(ks,'sharesOutstanding') ?? rn(sd,'sharesOutstanding')
        if (fcf != null && shares != null && shares > 0) return fcf / shares
        return null
      })(),
      dividendYield:rn(sd,'dividendYield')??rn(sd,'trailingAnnualDividendYield'),
      earningsGrowth:rn(fd,'earningsGrowth'),revenueGrowth:rn(fd,'revenueGrowth'),hist,
      ipoDate:str(ks,'lastSplitDate')??null,  // rough proxy
    }
  } catch{return{hist}}
}

async function fromStooq(ticker: string): Promise<Partial<StockMetrics>> {
  // Stooq: free, no key, covers international stocks
  // Format: AAPL.US, 1810.HK, BMW.DE, 7203.JP, 005930.KS
  let sym = ticker
  if (!ticker.includes('.')) sym = ticker + '.US'
  else if (ticker.endsWith('.DE')) sym = ticker  // BMW.DE → BMW.DE ✓
  else if (ticker.endsWith('.HK')) sym = ticker  // 1810.HK ✓
  else if (ticker.endsWith('.KS')) sym = ticker  // 005930.KS ✓
  else if (ticker.endsWith('.T'))  sym = ticker.replace('.T', '.JP') // 7203.T → 7203.JP

  try {
    const url = `https://stooq.com/q/d/l/?s=${sym.toLowerCase()}&i=d`
    const r   = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(5000) })
    const text = await r.text()
    if (!text || text.includes('No data')) return {}
    // Parse CSV: Date,Open,High,Low,Close,Volume
    const lines = text.trim().split('\n').filter(l => !l.startsWith('Date'))
    if (lines.length === 0) return {}
    const latest = lines[lines.length - 1].split(',')
    const close  = parseFloat(latest[4])
    if (!isFinite(close)) return {}
    // Build hist from CSV
    const hist = lines
      .map(l => { const p = l.split(','); return { date: p[0], close: parseFloat(p[4]) } })
      .filter(h => isFinite(h.close) && h.close > 0)
    return { price: close, hist }
  } catch { return {} }
}

async function fromTwelveData(ticker:string,key:string):Promise<Partial<StockMetrics>> {
  const [statsR,rsiR]=await Promise.all([
    get(`https://api.twelvedata.com/statistics?symbol=${ticker}&apikey=${key}`),
    get(`https://api.twelvedata.com/rsi?symbol=${ticker}&interval=1day&time_period=14&outputsize=1&apikey=${key}`),
  ])
  if(isLimited(statsR)&&isLimited(rsiR)) return {}
  const s=first(statsR)
  const val=s.valuations as Record<string,unknown>??{}
  const fin=s.financials as Record<string,unknown>??{}
  const rsiValues=(rsiR as Record<string,unknown>)?.values as Record<string,unknown>[]
  const rsiVal=rsiValues?.length>0?num(rsiValues[0],'rsi'):null
  return {
    pe:num(val,'forward_pe','trailing_pe'),pb:num(val,'price_to_book_mrq'),
    ps:num(val,'price_to_sales_ttm'),roe:num(fin,'return_on_equity_ttm'),
    roa:num(fin,'return_on_assets_ttm'),grossMargin:num(fin,'gross_profit_margin'),
    operatingMargin:num(fin,'operating_margin'),netMargin:num(fin,'net_profit_margin'),
    revenueGrowth:num(fin,'revenue_growth_ttm_yoy'),earningsGrowth:num(fin,'eps_growth_ttm_yoy'),
    rsi:rsiVal,
  }
}

// ─── MA ──────────────────────────────────────────────────────────────────────
function sma(arr:number[],period:number):(number|null)[] {
  return arr.map((_,i)=>i+1<period?null:arr.slice(i+1-period,i+1).reduce((s,v)=>s+v,0)/period)
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export async function GET(req:NextRequest) {
  const query=  (new URL(req.url).searchParams.get('symbol')?? '').trim()
  const fmpKey= process.env.FMP_API_KEY
  const fhKey=  process.env.FINNHUB_API_KEY??''
  const avKey=  process.env.ALPHA_VANTAGE_KEY??''
  const tdKey=  process.env.TWELVE_DATA_KEY??''

  incrementUsage()
  if(!query)  return NextResponse.json({error:'Kein Symbol angegeben.'},{status:400})
  if(!fmpKey) return NextResponse.json({error:'FMP_API_KEY nicht gesetzt.'},{status:500})

  // Special case: private companies not listed on any exchange
  const queryLower = query.toLowerCase().trim()
  const PRIVATE_COMPANIES: Record<string,string> = {
    'huawei': 'Huawei Technologies ist nicht börsennotiert (privates Unternehmen). Öffentlich verfügbare Alternativen: Xiaomi (1810.HK), Tencent (0700.HK).',
    '华为': 'Huawei Technologies ist nicht börsennotiert (privates Unternehmen).',
  }
  if (PRIVATE_COMPANIES[queryLower]) {
    return NextResponse.json({ error: PRIVATE_COMPANIES[queryLower] }, { status: 404 })
  }

  const ticker=await resolveTicker(query,fmpKey)

  // For HK/Asian stocks, Yahoo is more reliable as primary
  const isHK = ticker.endsWith('.HK') || ticker.endsWith('.KS') || ticker.endsWith('.T') || ticker.endsWith('.SS') || ticker.endsWith('.SZ')
  const [fmpData,yahooData]=await Promise.all([fromFMP(ticker,fmpKey),fromYahooFinance(ticker)])
  // For HK stocks, prefer Yahoo data over FMP (FMP often has incomplete HK data)
  let result = isHK
    ? merge(merge(empty(), yahooData), fmpData)  // Yahoo first, FMP fills gaps
    : merge(merge(empty(), fmpData), yahooData)   // FMP first, Yahoo fills gaps
  const _sources: string[] = []
  if(Object.values(fmpData).some(v=>v!=null)) _sources.push('FMP')
  if(Object.values(yahooData).some(v=>v!=null)) _sources.push('Yahoo')

  if(!isFull(result)&&avKey){
    const d=await fromAlphaVantage(ticker,avKey)
    if(Object.values(d).some(v=>v!=null)){result=merge(result,d);_sources.push('AlphaVantage')}
  }
  if(!isFull(result)&&fhKey){
    const d=await fromFinnhub(ticker,fhKey)
    if(Object.values(d).some(v=>v!=null)){result=merge(result,d);_sources.push('Finnhub')}
  }
  // Fetch Yahoo Finance annual timeseries for historical metrics if FMP didn't provide them
  if (!result.historicalRatios || result.historicalRatios.length === 0) {
    try {
      const types = 'annualPeRatio,annualPriceToBook,annualPriceToSales,annualRevenueGrowth,annualNetIncomeMargin,annualReturnOnEquity'
      const tsUrl = `https://query1.finance.yahoo.com/ws/fundamentals-timeseries/v1/finance/timeseries/${encodeURIComponent(ticker)}?type=${types}&period1=1104537600&period2=9999999999`
      const headers = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
      const tsRaw = await fetch(tsUrl, { headers, signal: AbortSignal.timeout(5000), cache: 'no-store' }).then(r=>r.json()).catch(()=>null)
      const tsResult = (tsRaw as Record<string,unknown>)?.timeseries?.result as Record<string,unknown>[] | undefined
      if (tsResult && tsResult.length > 0) {
        // Convert Yahoo timeseries to our format
        const yahooHist: Record<string,unknown>[] = []
        const typeMap: Record<string,string> = {
          annualPeRatio: 'peRatio', annualPriceToBook: 'priceToBookRatio',
          annualPriceToSales: 'priceToSalesRatio', annualRevenueGrowth: 'revenueGrowth',
          annualNetIncomeMargin: 'netProfitMargin', annualReturnOnEquity: 'returnOnEquity',
        }
        const dateMap: Record<string,Record<string,unknown>> = {}
        for (const series of tsResult) {
          const typeName = String(series.meta ? (series.meta as Record<string,unknown>).type?.[0] ?? '' : '')
          const fieldName = typeMap[typeName]
          if (!fieldName) continue
          const dataPoints = (series[typeName] as Record<string,unknown>[]) ?? []
          for (const pt of dataPoints) {
            const date = String(pt.asOfDate ?? '').slice(0,4)
            if (!date) continue
            if (!dateMap[date]) dateMap[date] = { date }
            dateMap[date][fieldName] = (pt.reportedValue as Record<string,unknown>)?.raw ?? pt.reportedValue
          }
        }
        result.historicalRatios = Object.values(dateMap).sort((a,b)=>String(a.date).localeCompare(String(b.date)))
        _sources.push('YahooTimeseries')
      }
    } catch { /* ignore */ }
  }

  if(!isFull(result)&&tdKey){
    const d=await fromTwelveData(ticker,tdKey)
    if(Object.values(d).some(v=>v!=null)){result=merge(result,d);_sources.push('TwelveData')}
  }
  // Stooq: free international fallback (no key needed), good for HK/DE/JP stocks
  if(result.hist.length===0 || result.price==null){
    const d=await fromStooq(ticker)
    if(Object.values(d).some(v=>v!=null)){result=merge(result,d);_sources.push('Stooq')}
  }

  // EUR conversion with multiple fallbacks
  const currency=result.currency??'USD'
  let eurusd:number|null=null
  const fxRaw=await get(`https://financialmodelingprep.com/stable/fx-quotes?symbol=EURUSD&apikey=${fmpKey}`)
  const fxArr=Array.isArray(fxRaw)?fxRaw as Record<string,unknown>[]:[]
  if(fxArr.length>0) eurusd=num(fxArr[0],'ask','bid','price')
  if(!eurusd){
    const fb=await get('https://api.frankfurter.app/latest?from=EUR&to=USD')
    const r=(fb as Record<string,unknown>)?.rates as Record<string,unknown>
    if(r?.USD) eurusd=num(r,'USD')
  }
  if(!eurusd){
    const fb2=await get('https://open.er-api.com/v6/latest/EUR')
    const r2=(fb2 as Record<string,unknown>)?.rates as Record<string,unknown>
    if(r2?.USD) eurusd=num(r2,'USD')
  }
  let priceEur:number|null=null
  if(result.price!=null&&eurusd&&eurusd>0&&currency!=='EUR'){
    const toEur:Record<string,number>={
      USD:1/eurusd,GBP:1/eurusd*0.86,GBX:0.0086/eurusd,
      HKD:1/(eurusd*7.8),CNY:1/(eurusd*7.25),KRW:1/(eurusd*1350),
      JPY:1/(eurusd*160),CHF:1/(eurusd*0.96),CAD:1/(eurusd*1.47),
      AUD:1/(eurusd*1.63),SEK:1/(eurusd*11.5),NOK:1/(eurusd*11.7),
    }
    const rate=toEur[currency]
    if(rate!=null) priceEur=result.price*rate
  }

  // Description trim at sentence boundary
  const rawDesc=result.description
  let shortDesc:string|null=null
  if(rawDesc){
    if(rawDesc.length<=400){shortDesc=rawDesc}
    else{
      let last=-1
      for(let i=0;i<Math.min(rawDesc.length-1,440);i++){
        if('.!?'.includes(rawDesc[i])&&(rawDesc[i+1]===' '||rawDesc[i+1]==='\n')&&i<=400) last=i+1
      }
      shortDesc=last>0?rawDesc.slice(0,last).trim():rawDesc.slice(0,400).trim()
    }
  }

  // MA chart
  // Always sort oldest→newest regardless of source (FMP=newest-first, Yahoo=oldest-first)
  const histOldestFirst = [...result.hist].sort((a,b) => a.date.localeCompare(b.date))
  const closesAsc = histOldestFirst.map(h=>h.close)
  const datesAsc  = histOldestFirst.map(h=>h.date)
  const ma50arr=sma(closesAsc,50),ma200arr=sma(closesAsc,200)
  const chartData=datesAsc.map((date,i)=>({date,close:closesAsc[i]??null,ma50:ma50arr[i]??null,ma200:ma200arr[i]??null}))
  const lastIdx=closesAsc.length-1
  const ma50L=lastIdx>=0?ma50arr[lastIdx]??null:null,ma200L=lastIdx>=0?ma200arr[lastIdx]??null:null
  const crossSignal: 'golden'|'death'|'none' = ma50L&&ma200L ? (ma50L>ma200L ? 'golden' : 'death') : 'none'

  return NextResponse.json({
    name:result.name??ticker,symbol:ticker,sector:result.sector,industry:result.industry,
    priceDate: result.hist.length > 0 ? [...result.hist].sort((a,b)=>b.date.localeCompare(a.date))[0].date + 'T16:00:00' : new Date().toISOString(),
    price:result.price,priceEur,currency,description:shortDesc,
    founded:result.ipoDate?.slice(0,4)??null,
    hq:[result.city,result.country].filter(Boolean).join(', ')||null,
    employees:result.employees?Number(result.employees.replace(/\D/g,'')).toLocaleString('de-DE'):null,
    ceo:result.ceo,
    pe:result.pe,ps:result.ps,pb:result.pb,roe:result.roe,roa:result.roa,
    grossMargin:result.grossMargin,operatingMargin:result.operatingMargin,netMargin:result.netMargin,
    cashflow:result.cashflow,debt:result.debt,currentRatio:result.currentRatio,
    rsi: (() => {
      if (result.rsi != null) return result.rsi
      // Calculate RSI from price history if not available
      const closes = result.hist.slice(-15).map((h:{close:number})=>h.close)
      if (closes.length < 14) return null
      let gains=0, losses=0
      for(let i=1;i<closes.length;i++){
        const d=closes[i]-closes[i-1]
        if(d>0) gains+=d; else losses+=Math.abs(d)
      }
      const n=closes.length-1
      const rs=(gains/n)/((losses/n)||0.0001)
      return Math.round(100-(100/(1+rs)))
    })(),dividendYield:result.dividendYield,
    revenueGrowth:result.revenueGrowth,earningsGrowth:result.earningsGrowth,
    chartData,crossSignal,ma50Latest:ma50L,ma200Latest:ma200L,
    _sources:[..._sources, `histRatios:${result.historicalRatios?.length??0}`],
    // If FMP historical is empty, try Yahoo Finance timeseries
    ...(result.historicalRatios?.length === 0 ? { _noHistFromFMP: true } : {}),
    historicalMetrics: (() => {
      const rows = result.historicalRatios ?? []
      const mapRow = (key: string) => rows
        .filter((r:Record<string,unknown>) => r.date && r[key] != null && isFinite(Number(r[key])))
        .map((r:Record<string,unknown>) => ({ date: String(r.date).slice(0,4), value: Number(r[key]) }))
      const mapRowMulti = (...keys: string[]) => {
        for (const key of keys) {
          const result = mapRow(key)
          if (result.length > 0) return result
        }
        return []
      }
      return {
        pe:            mapRowMulti('peRatio','priceEarningsRatio','pe','priceEarningsRatioTTM'),
        ps:            mapRowMulti('priceToSalesRatio','psRatio','ps','priceToSalesRatioTTM'),
        pb:            mapRowMulti('priceToBookRatio','pbRatio','pb','priceToBookRatioTTM'),
        roe:           mapRowMulti('returnOnEquity','roe','returnOnEquityTTM'),
        netMargin:     mapRowMulti('netProfitMargin','netMargin','netProfitMarginTTM'),
        revenueGrowth: mapRowMulti('revenueGrowth','revenue_growth','revenueGrowthTTM'),
      }
    })(),
  })
}

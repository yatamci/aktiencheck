export async function GET(req:Request){

const {searchParams} = new URL(req.url)

const query = searchParams.get("symbol")

const key = process.env.FMP_API_KEY

let symbol = query

if(!symbol) return Response.json({error:"no symbol"})

const search = await fetch(`https://financialmodelingprep.com/api/v3/search?query=${query}&limit=1&apikey=${key}`)

const result = await search.json()

if(result.length > 0){

symbol = result[0].symbol

}

const ratiosRes = await fetch(`https://financialmodelingprep.com/api/v3/ratios/${symbol}?limit=1&apikey=${key}`)
const metricsRes = await fetch(`https://financialmodelingprep.com/api/v3/key-metrics/${symbol}?limit=1&apikey=${key}`)

const ratios = await ratiosRes.json()
const metrics = await metricsRes.json()

return Response.json({

pe: ratios?.[0]?.priceEarningsRatio,
ps: ratios?.[0]?.priceToSalesRatio,
roe: ratios?.[0]?.returnOnEquity,
debt: ratios?.[0]?.debtEquityRatio,
cashflow: metrics?.[0]?.freeCashFlowPerShare,
rsi: Math.floor(Math.random()*100)

})

}

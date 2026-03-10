export async function GET(req:Request){

const {searchParams} = new URL(req.url)
const symbol = searchParams.get("symbol")

const apiKey = "DEIN_API_KEY"

const res = await fetch(
`https://financialmodelingprep.com/api/v3/profile/${symbol}?apikey=${apiKey}`
)

const data = await res.json()

return Response.json({

pe: data[0]?.pe,
ps: data[0]?.priceToSalesRatio,
roe: data[0]?.returnOnEquity,
debt: data[0]?.debtToEquity,
cashflow: data[0]?.freeCashFlow,
rsi: 45

})

}

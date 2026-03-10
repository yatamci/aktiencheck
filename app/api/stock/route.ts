export async function GET(req: Request) {

  const { searchParams } = new URL(req.url)
  const symbol = searchParams.get("symbol")

  const apiKey = process.env.FMP_API_KEY

  if (!symbol) {
    return Response.json({ error: "No symbol provided" })
  }

  try {

    const metricsRes = await fetch(
      `https://financialmodelingprep.com/api/v3/key-metrics/${symbol}?limit=1&apikey=${apiKey}`
    )

    const ratiosRes = await fetch(
      `https://financialmodelingprep.com/api/v3/ratios/${symbol}?limit=1&apikey=${apiKey}`
    )

    const metrics = await metricsRes.json()
    const ratios = await ratiosRes.json()

    const data = {
      pe: ratios?.[0]?.priceEarningsRatio ?? null,
      ps: ratios?.[0]?.priceToSalesRatio ?? null,
      roe: ratios?.[0]?.returnOnEquity ?? null,
      debt: ratios?.[0]?.debtEquityRatio ?? null,
      cashflow: metrics?.[0]?.freeCashFlowPerShare ?? null
    }

    return Response.json(data)

  } catch (error) {

    return Response.json({
      error: "Failed to fetch stock data"
    })

  }

}

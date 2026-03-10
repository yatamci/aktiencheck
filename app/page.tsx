"use client"

import { useState } from "react"
import SearchBar from "../components/SearchBar"
import MetricRow from "../components/MetricRow"
import ThemeToggle from "../components/ThemeToggle"

export default function Home() {

  const [data,setData] = useState<any>(null)

  const searchStock = async(symbol:string)=>{

    const res = await fetch(`/api/stock?symbol=${symbol}`)
    const json = await res.json()

    setData(json)
  }

  return(
    <main className="max-w-3xl mx-auto p-6">

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Aktiencheck</h1>
        <ThemeToggle/>
      </div>

      <SearchBar onSearch={searchStock}/>

      {data && (
        <div className="mt-8 space-y-3">

          <MetricRow label="KGV" value={data.pe}/>
          <MetricRow label="KUV" value={data.ps}/>
          <MetricRow label="ROE" value={data.roe}/>
          <MetricRow label="Verschuldung" value={data.debt}/>
          <MetricRow label="Cashflow" value={data.cashflow}/>
          <MetricRow label="RSI" value={data.rsi}/>

        </div>
      )}

      <footer className="text-xs text-zinc-500 mt-12">
        Diese Analyse wird automatisch erstellt. Fehler sind möglich.
        Keine Anlageberatung.
      </footer>

    </main>
  )
}

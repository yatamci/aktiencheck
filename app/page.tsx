"use client"

import {useState} from "react"
import SearchBar from "../components/SearchBar"
import ThemeToggle from "../components/ThemeToggle"
import MetricRow from "../components/MetricRow"
import {
  evaluatePE,
  evaluatePS,
  evaluateROE,
  evaluateDebt,
  evaluateRSI,
  calculateScore
} from "../lib/evaluate"

export default function Home() {
  const [data, setData] = useState<any>(null)

  async function searchStock(symbol: string) {
    const res = await fetch(`/api/stock?symbol=${symbol}`)
    const json = await res.json()
    setData(json)
  }

  return (
    <main className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">📈 Aktiencheck</h1>
        <ThemeToggle />
      </div>

      <SearchBar onSearch={searchStock} />

      {data && (
        <div className="space-y-3">
          <MetricRow
            label="KGV"
            value={data.pe}
            score={evaluatePE(data.pe)}
          />
          <MetricRow
            label="KUV"
            value={data.ps}
            score={evaluatePS(data.ps)}
          />
          <MetricRow
            label="ROE"
            value={data.roe}
            score={evaluateROE(data.roe)}
          />
          <MetricRow
            label="Verschuldung"
            value={data.debt}
            score={evaluateDebt(data.debt)}
          />
          <MetricRow
            label="RSI"
            value={data.rsi}
            score={evaluateRSI(data.rsi)}
          />
          <MetricRow
            label="Cashflow"
            value={data.cashflow}
            score={data.cashflow > 0 ? "good" : "bad"}
          />

          <div className="score-card">
            <span className="text-lg font-medium">Gesamtscore</span>
            <span className="score-number">{calculateScore(data)} / 5</span>
          </div>
        </div>
      )}

      <footer className="text-xs text-zinc-500 pt-10">
        Diese Analyse wird automatisch erstellt. Fehler sind möglich. Keine Anlageberatung.
      </footer>
    </main>
  )
}

'use client'

import { useEffect, useRef } from 'react'
import { ChartPoint } from '../lib/evaluate'

interface MAChartProps {
  data: ChartPoint[]
  crossSignal: 'golden' | 'death' | 'none'
  ma50Latest: number | null
  ma200Latest: number | null
  currency: string
}

export default function MAChart({ data, crossSignal, ma50Latest, ma200Latest, currency }: MAChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const currencySymbol = currency === 'EUR' ? '€' : '$'

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container || data.length === 0) return

    const dpr = window.devicePixelRatio || 1
    const W = container.clientWidth
    const H = 220
    canvas.width  = W * dpr
    canvas.height = H * dpr
    canvas.style.width  = `${W}px`
    canvas.style.height = `${H}px`

    const ctx = canvas.getContext('2d')!
    ctx.scale(dpr, dpr)

    // Detect dark mode
    const isDark = document.documentElement.classList.contains('dark')
    const textColor   = isDark ? 'rgba(240,244,255,0.5)' : 'rgba(13,15,20,0.4)'
    const gridColor   = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
    const closeColor  = isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.15)'
    const ma50Color   = '#4d9fff'
    const ma200Color  = '#ff9500'

    const PAD = { top: 16, right: 16, bottom: 32, left: 56 }
    const cW = W - PAD.left - PAD.right
    const cH = H - PAD.top  - PAD.bottom

    // Value range
    const closes = data.map((d) => d.close).filter((v): v is number => v != null)
    const ma50s  = data.map((d) => d.ma50).filter((v): v is number  => v != null)
    const ma200s = data.map((d) => d.ma200).filter((v): v is number => v != null)
    const allVals = [...closes, ...ma50s, ...ma200s]
    if (allVals.length === 0) return
    const minV = Math.min(...allVals) * 0.98
    const maxV = Math.max(...allVals) * 1.02
    const range = maxV - minV || 1

    const xOf = (i: number) => PAD.left + (i / (data.length - 1)) * cW
    const yOf = (v: number) => PAD.top + cH - ((v - minV) / range) * cH

    // Grid lines
    ctx.strokeStyle = gridColor
    ctx.lineWidth = 1
    for (let tick = 0; tick <= 4; tick++) {
      const y = PAD.top + (tick / 4) * cH
      ctx.beginPath()
      ctx.moveTo(PAD.left, y)
      ctx.lineTo(PAD.left + cW, y)
      ctx.stroke()
      const val = maxV - (tick / 4) * range
      ctx.fillStyle = textColor
      ctx.font = '11px DM Mono, monospace'
      ctx.textAlign = 'right'
      ctx.fillText(`${currencySymbol}${val.toFixed(0)}`, PAD.left - 6, y + 4)
    }

    // X axis labels (every ~40 points)
    const step = Math.ceil(data.length / 5)
    ctx.textAlign = 'center'
    ctx.fillStyle = textColor
    ctx.font = '10px DM Sans, sans-serif'
    for (let i = 0; i < data.length; i += step) {
      const d = data[i]
      if (!d) continue
      const label = d.date.slice(5) // MM-DD
      ctx.fillText(label, xOf(i), H - 8)
    }

    // Helper: draw a line series
    function drawLine(
      points: (number | null)[],
      color: string,
      width: number,
      dash: number[] = []
    ) {
      ctx.save()
      ctx.strokeStyle = color
      ctx.lineWidth = width
      ctx.setLineDash(dash)
      ctx.beginPath()
      let started = false
      points.forEach((v, i) => {
        if (v == null) { started = false; return }
        const x = xOf(i)
        const y = yOf(v)
        if (!started) { ctx.moveTo(x, y); started = true }
        else ctx.lineTo(x, y)
      })
      ctx.stroke()
      ctx.restore()
    }

    // Close price (thin, muted)
    drawLine(data.map((d) => d.close), closeColor, 1.5)

    // MA200 first (behind MA50)
    drawLine(data.map((d) => d.ma200), ma200Color, 2, [6, 3])

    // MA50
    drawLine(data.map((d) => d.ma50), ma50Color, 2)

    // Cross marker: find where MA50 crossed MA200
    for (let i = 1; i < data.length; i++) {
      const prev = data[i - 1]
      const curr = data[i]
      if (!prev.ma50 || !prev.ma200 || !curr.ma50 || !curr.ma200) continue
      const wasBelowOrEqual = prev.ma50 <= prev.ma200
      const isNowAbove      = curr.ma50 >  curr.ma200
      const wasAbove        = prev.ma50 >  prev.ma200
      const isNowBelow      = curr.ma50 <= curr.ma200

      if (wasBelowOrEqual && isNowAbove) {
        // Golden cross
        const x = xOf(i)
        const y = yOf(curr.close ?? curr.ma50)
        ctx.beginPath()
        ctx.arc(x, y - 14, 6, 0, Math.PI * 2)
        ctx.fillStyle = '#ffd700'
        ctx.fill()
        ctx.fillStyle = '#000'
        ctx.font = 'bold 8px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('G', x, y - 10)
      } else if (wasAbove && isNowBelow) {
        // Death cross
        const x = xOf(i)
        const y = yOf(curr.close ?? curr.ma50)
        ctx.beginPath()
        ctx.arc(x, y - 14, 6, 0, Math.PI * 2)
        ctx.fillStyle = '#ff3b30'
        ctx.fill()
        ctx.fillStyle = '#fff'
        ctx.font = 'bold 8px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('D', x, y - 10)
      }
    }
  }, [data, currency, currencySymbol])

  if (data.length === 0) return null

  const isGolden = crossSignal === 'golden'
  const isDeath  = crossSignal === 'death'

  return (
    <div className="glass-card ma-chart-card">
      {/* Header */}
      <div className="ma-chart-header">
        <div>
          <h3 className="ma-chart-title">Gleitende Durchschnitte</h3>
          <p className="ma-chart-subtitle">MA 50 & MA 200 · letzten 200 Handelstage</p>
        </div>
        <div
          className={`cross-badge ${isGolden ? 'cross-badge--golden' : isDeath ? 'cross-badge--death' : 'cross-badge--none'}`}
        >
          <span className="cross-badge-icon">{isGolden ? '⭐' : isDeath ? '💀' : '—'}</span>
          <div>
            <div className="cross-badge-label">
              {isGolden ? 'Golden Cross' : isDeath ? 'Death Cross' : 'Kein Signal'}
            </div>
            <div className="cross-badge-sub">
              {isGolden
                ? 'MA50 über MA200 – bullisches Signal'
                : isDeath
                ? 'MA50 unter MA200 – bärisches Signal'
                : 'Kein klares Signal'}
            </div>
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div ref={containerRef} className="ma-chart-canvas-wrap">
        <canvas ref={canvasRef} />
      </div>

      {/* Legend */}
      <div className="ma-chart-legend">
        <div className="ma-legend-item">
          <span className="ma-legend-line" style={{ background: '#4d9fff' }} />
          <span>MA 50</span>
          {ma50Latest != null && (
            <span className="ma-legend-val" style={{ color: '#4d9fff' }}>
              {currency === 'EUR' ? '€' : '$'}{ma50Latest.toFixed(2)}
            </span>
          )}
        </div>
        <div className="ma-legend-item">
          <span className="ma-legend-line ma-legend-line--dashed" style={{ background: '#ff9500' }} />
          <span>MA 200</span>
          {ma200Latest != null && (
            <span className="ma-legend-val" style={{ color: '#ff9500' }}>
              {currency === 'EUR' ? '€' : '$'}{ma200Latest.toFixed(2)}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

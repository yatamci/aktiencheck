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
  const canvasRef    = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const currencySymbol = currency === 'EUR' ? '€' : '$'

  function draw() {
    const canvas    = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container || data.length === 0) return

    const dpr = window.devicePixelRatio || 1
    const W   = container.clientWidth
    const H   = 220
    canvas.width        = W * dpr
    canvas.height       = H * dpr
    canvas.style.width  = `${W}px`
    canvas.style.height = `${H}px`

    const ctx = canvas.getContext('2d')!
    ctx.scale(dpr, dpr)

    const isDark = document.documentElement.classList.contains('dark')

    // Light mode: much more visible colors
    const bgColor    = isDark ? 'transparent'               : 'transparent'
    const textColor  = isDark ? 'rgba(180,200,255,0.7)'     : 'rgba(30,40,60,0.75)'
    const gridColor  = isDark ? 'rgba(255,255,255,0.06)'    : 'rgba(0,0,0,0.09)'
    const closeColor = isDark ? 'rgba(200,215,255,0.3)'     : 'rgba(20,30,60,0.7)'
    const ma50Color  = isDark ? '#4d9fff'                   : '#1a6fcc'   // darker blue in light
    const ma200Color = isDark ? '#ff9500'                   : '#c47000'   // darker orange in light

    const PAD = { top: 16, right: 16, bottom: 32, left: 58 }
    const cW  = W - PAD.left - PAD.right
    const cH  = H - PAD.top  - PAD.bottom

    const closes = data.map(d => d.close).filter((v): v is number => v != null)
    const ma50s  = data.map(d => d.ma50 ).filter((v): v is number => v != null)
    const ma200s = data.map(d => d.ma200).filter((v): v is number => v != null)
    const allVals = [...closes, ...ma50s, ...ma200s]
    if (allVals.length === 0) return
    const minV  = Math.min(...allVals) * 0.98
    const maxV  = Math.max(...allVals) * 1.02
    const range = maxV - minV || 1

    const xOf = (i: number) => PAD.left + (i / (data.length - 1)) * cW
    const yOf = (v: number) => PAD.top  + cH - ((v - minV) / range) * cH

    // Grid
    ctx.strokeStyle = gridColor
    ctx.lineWidth   = 1
    for (let t = 0; t <= 4; t++) {
      const y   = PAD.top + (t / 4) * cH
      const val = maxV - (t / 4) * range
      ctx.beginPath(); ctx.moveTo(PAD.left, y); ctx.lineTo(PAD.left + cW, y); ctx.stroke()
      ctx.fillStyle  = textColor
      ctx.font       = `${11 * dpr <= 1 ? 11 : 11}px DM Mono, monospace`
      ctx.textAlign  = 'right'
      ctx.fillText(`${currencySymbol}${val.toFixed(0)}`, PAD.left - 6, y + 4)
    }

    // X labels
    const step = Math.ceil(data.length / 5)
    ctx.textAlign  = 'center'
    ctx.fillStyle  = textColor
    ctx.font       = '10px DM Sans, sans-serif'
    for (let i = 0; i < data.length; i += step) {
      const d = data[i]; if (!d) continue
      ctx.fillText(d.date.slice(5), xOf(i), H - 8)
    }

    function drawLine(pts: (number | null)[], color: string, width: number, dash: number[] = []) {
      ctx.save()
      ctx.strokeStyle = color; ctx.lineWidth = width; ctx.setLineDash(dash)
      ctx.lineJoin = 'round'; ctx.lineCap = 'round'
      ctx.beginPath()
      let started = false
      pts.forEach((v, i) => {
        if (v == null) { started = false; return }
        const x = xOf(i), y = yOf(v)
        if (!started) { ctx.moveTo(x, y); started = true } else ctx.lineTo(x, y)
      })
      ctx.stroke(); ctx.restore()
    }

    // Close price (thin)
    drawLine(data.map(d => d.close), closeColor, 1.5)
    // MA200 behind MA50
    drawLine(data.map(d => d.ma200), ma200Color, 2.5, [6, 3])
    // MA50
    drawLine(data.map(d => d.ma50),  ma50Color,  2.5)

    // Cross markers
    for (let i = 1; i < data.length; i++) {
      const prev = data[i - 1], curr = data[i]
      if (!prev.ma50 || !prev.ma200 || !curr.ma50 || !curr.ma200) continue
      const golden = prev.ma50 <= prev.ma200 && curr.ma50 > curr.ma200
      const death  = prev.ma50 >  prev.ma200 && curr.ma50 <= curr.ma200
      if (!golden && !death) continue
      const x = xOf(i)
      const y = yOf(curr.close ?? curr.ma50) - 14
      ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2)
      ctx.fillStyle = golden ? '#ffd700' : '#ff3b30'
      ctx.fill()
      // ring for visibility in light mode
      ctx.strokeStyle = isDark ? 'transparent' : (golden ? '#b89200' : '#cc0000')
      ctx.lineWidth = 1; ctx.setLineDash([])
      ctx.stroke()
      ctx.fillStyle  = golden ? '#000' : '#fff'
      ctx.font       = 'bold 8px sans-serif'
      ctx.textAlign  = 'center'
      ctx.fillText(golden ? 'G' : 'D', x, y + 3)
    }
  }

  useEffect(() => {
    draw()
    const observer = new ResizeObserver(() => draw())
    if (containerRef.current) observer.observe(containerRef.current)
    // Re-draw on theme change
    const mo = new MutationObserver(() => draw())
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => { observer.disconnect(); mo.disconnect() }
  }, [data, currency])

  if (data.length === 0) return null

  const isGolden = crossSignal === 'golden'
  const isDeath  = crossSignal === 'death'

  return (
    <div className="glass-card ma-chart-card">
      <div className="ma-chart-header">
        <div>
          <h3 className="ma-chart-title">Gleitende Durchschnitte</h3>
          <p className="ma-chart-subtitle">MA 50 & MA 200 · letzten 200 Handelstage</p>
        </div>
        <div className={`cross-badge ${isGolden ? 'cross-badge--golden' : isDeath ? 'cross-badge--death' : 'cross-badge--none'}`}>
          <span className="cross-badge-icon">{isGolden ? '⭐' : isDeath ? '💀' : '—'}</span>
          <div>
            <div className="cross-badge-label">{isGolden ? 'Golden Cross' : isDeath ? 'Death Cross' : 'Kein Signal'}</div>
            <div className="cross-badge-sub">
              {isGolden ? 'MA50 über MA200 – bullisches Signal' : isDeath ? 'MA50 unter MA200 – bärisches Signal' : 'Kein klares Signal'}
            </div>
          </div>
        </div>
      </div>

      <div ref={containerRef} className="ma-chart-canvas-wrap">
        <canvas ref={canvasRef} />
      </div>
      <p className="ma-chart-xaxis-label">← Datum (MM-TT)</p>

      <div className="ma-chart-legend">
        <div className="ma-legend-item">
          <span className="ma-legend-line" style={{ background: 'var(--ma50)' }} />
          <span>MA 50</span>
          {ma50Latest != null && (
            <span className="ma-legend-val" style={{ color: 'var(--ma50)' }}>
              {currencySymbol}{ma50Latest.toFixed(2)}
            </span>
          )}
        </div>
        <div className="ma-legend-item">
          <span className="ma-legend-line ma-legend-line--dashed" />
          <span>MA 200</span>
          {ma200Latest != null && (
            <span className="ma-legend-val" style={{ color: 'var(--ma200)' }}>
              {currencySymbol}{ma200Latest.toFixed(2)}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

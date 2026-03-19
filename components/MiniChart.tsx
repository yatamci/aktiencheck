'use client'
import { useEffect, useRef } from 'react'

interface MiniChartProps {
  data: { date: string; value: number }[]
  color: string
  label: string
  formatValue: (v: number) => string
}

export default function MiniChart({ data, color, label, formatValue }: MiniChartProps) {
  const canvasRef    = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  function draw() {
    const canvas = canvasRef.current
    const cont   = containerRef.current
    if (!canvas || !cont || data.length < 2) return

    const dpr = window.devicePixelRatio || 1
    const W   = cont.clientWidth
    const H   = 80
    canvas.width  = W * dpr
    canvas.height = H * dpr
    canvas.style.width  = W + 'px'
    canvas.style.height = H + 'px'
    const ctx = canvas.getContext('2d')!
    ctx.scale(dpr, dpr)

    const isDark   = document.documentElement.classList.contains('dark')
    const textCol  = isDark ? 'rgba(180,200,255,0.55)' : 'rgba(30,40,60,0.55)'
    const gridCol  = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.07)'

    const vals = data.map(d => d.value)
    const minV = Math.min(...vals)
    const maxV = Math.max(...vals)
    const range = maxV - minV || 1

    const PAD = { top: 6, right: 6, bottom: 22, left: 48 }
    const cW  = W - PAD.left - PAD.right
    const cH  = H - PAD.top  - PAD.bottom
    const xOf = (i: number) => PAD.left + (i / (data.length - 1)) * cW
    const yOf = (v: number) => PAD.top  + cH - ((v - minV) / range) * cH

    // Grid lines (2)
    for (let t = 0; t <= 1; t++) {
      const y   = PAD.top + t * cH
      const val = maxV - t * range
      ctx.strokeStyle = gridCol; ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(PAD.left, y); ctx.lineTo(PAD.left + cW, y); ctx.stroke()
      ctx.fillStyle = textCol; ctx.font = '9px DM Mono, monospace'; ctx.textAlign = 'right'
      ctx.fillText(formatValue(val), PAD.left - 3, y + 3)
    }

    // X labels (first and last)
    const months = ['Jan','Feb','Mrz','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez']
    ctx.fillStyle = textCol; ctx.font = '9px DM Sans, sans-serif'; ctx.textAlign = 'center'
    [[0, data[0].date], [data.length - 1, data[data.length-1].date]].forEach(([i, d]) => {
      const dt  = new Date(d as string + 'T00:00:00Z')
      const lbl = months[dt.getUTCMonth()] + " '" + String(dt.getUTCFullYear()).slice(2)
      ctx.fillText(lbl, xOf(i as number), H - 5)
    })

    // Fill area under line
    ctx.beginPath()
    data.forEach((d, i) => {
      const x = xOf(i), y = yOf(d.value)
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    })
    ctx.lineTo(xOf(data.length - 1), PAD.top + cH)
    ctx.lineTo(xOf(0), PAD.top + cH)
    ctx.closePath()
    ctx.fillStyle = color + '22'
    ctx.fill()

    // Line
    ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = 1.5
    ctx.lineJoin = 'round'; ctx.lineCap = 'round'
    data.forEach((d, i) => {
      const x = xOf(i), y = yOf(d.value)
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    })
    ctx.stroke()
  }

  useEffect(() => {
    draw()
    const mo = new MutationObserver(draw)
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    const ob = new ResizeObserver(draw)
    if (containerRef.current) ob.observe(containerRef.current)
    return () => { mo.disconnect(); ob.disconnect() }
  }, [data, color])

  if (data.length < 2) return null

  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ fontSize: '0.65rem', color: 'var(--text-3)', marginBottom: 2 }}>{label}</div>
      <div ref={containerRef} style={{ width: '100%' }}>
        <canvas ref={canvasRef} />
      </div>
    </div>
  )
}

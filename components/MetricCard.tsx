'use client'

import { useState } from 'react'
import { MetricResult, Score } from '../lib/evaluate'
import MiniChart from './MiniChart'
import type { Lang } from '../lib/i18n'

function formatValue(value: number | null | undefined, type?: string): string {
  if (value == null) return '–'
  switch (type) {
    case 'percent':  return `${(value * 100).toFixed(1)} %`
    case 'ratio':    return value.toFixed(2)
    case 'currency': return `${value.toFixed(2)}`
    case 'number':
    default:         return value.toFixed(1)
  }
}

function ScoreBadge({ score }: { score: Score }) {
  if (score === 'neutral') return (
    <div className="score-badge score-neutral" title="Keine Daten">
      <span style={{ fontSize: '0.9rem', color: 'var(--text-3)' }}>–</span>
    </div>
  )
  if (score === 'good') return (
    <div className="score-badge score-good" title="Gut">
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M4 9l3.5 3.5L14 6" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
  )
  if (score === 'warn') return (
    <div className="score-badge score-warn" title="Achtung">
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M9 5v5" stroke="white" strokeWidth="2.4" strokeLinecap="round"/>
        <circle cx="9" cy="13.2" r="1.3" fill="white"/>
      </svg>
    </div>
  )
  return (
    <div className="score-badge score-bad" title="Schlecht">
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M5.5 5.5l7 7M12.5 5.5l-7 7" stroke="white" strokeWidth="2.4" strokeLinecap="round"/>
      </svg>
    </div>
  )
}

export default function MetricCard({ metric, lang, historicalData }: { metric: MetricResult; lang?: Lang; historicalData?: {date:string;value:number}[] }) {
  const [open, setOpen] = useState(false)
  const formattedValue  = formatValue(metric.value, metric.formatType)

  return (
    <div
      className={`metric-card${open ? ' metric-card--open' : ''}`}
      data-key={metric.key}
      onClick={() => setOpen(o => !o)}
      role="button"
      aria-expanded={open}
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && setOpen(o => !o)}
    >
      {/* ── Always-visible row – nothing moves ── */}
      <div className="metric-row">
        <div className="metric-left">
          <ScoreBadge score={metric.score} />
          <div className="metric-info">
            <span className="metric-label">{lang === 'en' ? metric.labelEn : metric.label}</span>
            <span className="metric-description">{lang === 'en' ? metric.descriptionEn : metric.description}</span>
          </div>
        </div>
        <div className="metric-right">
          <span className={`metric-value metric-value--${metric.score}`}>{formattedValue}</span>
          <span className={`metric-chevron${open ? ' metric-chevron--open' : ''}`}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
        </div>
      </div>

      {/* ── Expandable detail panel ── */}
      <div className={`metric-expand${open ? ' metric-expand--open' : ''}`}>
        <div className="metric-expand-inner">

          <div className="metric-detail-interp">
            <span className="metric-detail-label">{lang === 'en' ? 'Interpretation' : 'Einordnung'}</span>
            <span className="metric-detail-value">{lang === 'en' ? metric.interpretationEn : metric.interpretation}</span>
          </div>

          <div className="metric-detail-formula">
            <span className="metric-detail-label">{lang === 'en' ? 'Formula' : 'Berechnung'}</span>
            <span className="metric-detail-value">{lang === 'en' ? metric.formulaEn : metric.formula}</span>
          </div>

          <div className="metric-detail-thresholds">
            <span className="metric-detail-label">{lang === 'en' ? 'Rating' : 'Bewertung'}</span>
            <div className="metric-threshold-rows">
              <div className="metric-threshold-row">
                <span className="threshold-badge threshold-good">✓</span>
                <span>{lang === 'en' ? metric.thresholdsEn.good : metric.thresholds.good}</span>
              </div>
              <div className="metric-threshold-row">
                <span className="threshold-badge threshold-warn">!</span>
                <span>{lang === 'en' ? metric.thresholdsEn.warn : metric.thresholds.warn}</span>
              </div>
              <div className="metric-threshold-row">
                <span className="threshold-badge threshold-bad">✕</span>
                <span>{lang === 'en' ? metric.thresholdsEn.bad : metric.thresholds.bad}</span>
              </div>
            </div>
          </div>

          {historicalData && historicalData.length >= 2 && (
            <MiniChart
              data={historicalData}
              color="var(--accent)"
              label={lang === 'en' ? 'Historical (annual)' : 'Historisch (jährlich)'}
              formatValue={(v) => metric.formatType === 'percent' ? (v*100).toFixed(1)+'%' : metric.formatType === 'ratio' ? v.toFixed(2) : v.toFixed(1)}
            />
          )}

        </div>
      </div>
    </div>
  )
}

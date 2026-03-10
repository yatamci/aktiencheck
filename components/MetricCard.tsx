import { MetricResult, Score } from '../lib/evaluate'

interface MetricCardProps {
  metric: MetricResult
}

function formatValue(value: number | null | undefined, type?: string): string {
  if (value == null) return '–'
  switch (type) {
    case 'percent':
      return `${(value * 100).toFixed(1)}%`
    case 'ratio':
      return value.toFixed(2)
    case 'currency':
      return `$${value.toFixed(2)}`
    case 'number':
    default:
      return value.toFixed(1)
  }
}

function ScoreBadge({ score }: { score: Score }) {
  if (score === 'neutral') {
    return (
      <div className="score-badge score-neutral" title="Keine Daten">
        <span className="score-icon">—</span>
      </div>
    )
  }
  if (score === 'good') {
    return (
      <div className="score-badge score-good" title="Gut">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M4 9l3.5 3.5L14 6" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    )
  }
  if (score === 'warn') {
    return (
      <div className="score-badge score-warn" title="Achtung">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M9 5v5" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
          <circle cx="9" cy="13" r="1.2" fill="white"/>
        </svg>
      </div>
    )
  }
  return (
    <div className="score-badge score-bad" title="Schlecht">
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M5.5 5.5l7 7M12.5 5.5l-7 7" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
      </svg>
    </div>
  )
}

export default function MetricCard({ metric }: MetricCardProps) {
  const formattedValue = formatValue(metric.value, metric.formatType)

  return (
    <div className="metric-card">
      <div className="metric-left">
        <ScoreBadge score={metric.score} />
        <div className="metric-info">
          <span className="metric-label">{metric.label}</span>
          <span className="metric-description">{metric.description}</span>
        </div>
      </div>
      <div className="metric-right">
        <span className="metric-value">{formattedValue}</span>
        <div className="metric-thresholds">
          <span className="threshold-good">✓ {metric.goodThreshold}</span>
          <span className="threshold-warn">! {metric.warnThreshold}</span>
          <span className="threshold-bad">✗ {metric.badThreshold}</span>
        </div>
      </div>
    </div>
  )
}

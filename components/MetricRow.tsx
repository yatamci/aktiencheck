interface MetricRowProps {
  label: string;
  value: number | null;
  score: 'good' | 'bad' | 'warn';
}

export default function MetricRow({ label, value, score }: MetricRowProps) {
  const getBadgeClass = () => {
  switch(score) {
    case 'good': return 'badge-good';
    case 'warn': return 'badge-warning';  // 'warn' verwendet trotzdem warning-Style
    case 'bad': return 'badge-bad';
    default: return 'badge-bad';
  }
};

const getIcon = () => {
  switch(score) {
    case 'good': return '✅';
    case 'warn': return '⚠️';  // Warnung bleibt ⚠️
    case 'bad': return '❌';
    default: return '❌';
  }
};

  const formatValue = (val: number | null) => {
    if (val === null || val === undefined) return '-';
    
    if (label === 'ROE' && val < 1) {
      return `${(val * 100).toFixed(1)}%`;
    }
    
    if (typeof val === 'number') {
      return val.toFixed(2);
    }
    
    return val;
  };

  return (
    <div className="metric-card">
      <div className="metric-info">
        <span className="metric-label">{label}</span>
        <span className="metric-value">{formatValue(value)}</span>
      </div>
      <div className={`metric-badge ${getBadgeClass()}`}>
        {getIcon()}
      </div>
    </div>
  );
}

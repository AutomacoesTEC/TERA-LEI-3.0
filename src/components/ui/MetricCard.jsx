export default function MetricCard({ label, value, detail, tone = 'gold' }) {
  const tones = {
    gold: {
      border: 'rgba(161, 124, 47, 0.28)',
      background: 'linear-gradient(145deg, rgba(161, 124, 47, 0.16), rgba(161, 124, 47, 0.04))',
      value: 'var(--gold-bright)',
    },
    blue: {
      border: 'rgba(52, 152, 219, 0.28)',
      background: 'linear-gradient(145deg, rgba(52, 152, 219, 0.16), rgba(52, 152, 219, 0.04))',
      value: '#4ea7de',
    },
    green: {
      border: 'rgba(46, 204, 113, 0.28)',
      background: 'linear-gradient(145deg, rgba(46, 204, 113, 0.16), rgba(46, 204, 113, 0.04))',
      value: '#45d588',
    },
  };

  const palette = tones[tone] || tones.gold;

  return (
    <div
      className="metric-card"
      style={{
        borderColor: palette.border,
        background: palette.background,
      }}
    >
      <div className="metric-label">{label}</div>
      <div className="metric-value" style={{ color: palette.value }}>
        {value}
      </div>
      {detail ? <div className="metric-detail">{detail}</div> : null}
    </div>
  );
}

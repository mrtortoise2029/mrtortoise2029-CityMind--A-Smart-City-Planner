export function MetricCard({ icon: Icon, label, value, note, tone = 'green' }) {
  return (
    <article className="metric-card panel">
      <span className={`metric-icon ${tone}`}><Icon size={19} /></span>
      <div><p>{label}</p><strong>{value}</strong><small>{note}</small></div>
    </article>
  );
}

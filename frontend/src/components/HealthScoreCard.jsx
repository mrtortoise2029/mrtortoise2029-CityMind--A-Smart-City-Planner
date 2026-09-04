import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts';

export function HealthScoreCard({ health }) {
  const dimensions = Object.entries(health.dimensions).map(([name, score]) => ({ name: name[0].toUpperCase() + name.slice(1), score }));
  return (
    <article className="panel health-panel">
      <div className="panel-heading"><div><p className="eyebrow">Composite index</p><h2>Urban Health Score</h2></div><span className="live-badge">Live model</span></div>
      <div className="health-content">
        <div className="score-ring" style={{ '--score': `${health.overallScore * 3.6}deg` }}><div><strong>{health.overallScore}</strong><span>/ 100</span></div></div>
        <div className="radar-wrap">
          <ResponsiveContainer width="100%" height={215}>
            <RadarChart data={dimensions} outerRadius="65%">
              <PolarGrid stroke="#29433c" />
              <PolarAngleAxis dataKey="name" tick={{ fill: '#91a8a1', fontSize: 10 }} />
              <Radar dataKey="score" stroke="#46e6a5" fill="#30cc8e" fillOpacity={0.28} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="benchmark"><span>Planning benchmark</span><div><i style={{ width: `${health.overallScore}%` }} /><b style={{ left: `${health.benchmark}%` }} /></div><strong>{health.benchmark}</strong></div>
    </article>
  );
}


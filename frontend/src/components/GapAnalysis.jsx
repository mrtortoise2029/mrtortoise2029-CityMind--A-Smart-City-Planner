import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export function GapAnalysis({ gaps }) {
  const chartData = gaps.gaps.slice(0, 8).map((gap) => ({ name: gap.wardName, category: gap.category, score: gap.score }));
  return (
    <article className="panel gap-panel">
      <div className="panel-heading"><div><p className="eyebrow">Service equity</p><h2>Most urgent urban gaps</h2></div><span className="muted">Lower score = larger gap</span></div>
      <div className="gap-summary">
        <span><b className="critical-dot" />{gaps.summary.critical} critical</span>
        <span><b className="high-dot" />{gaps.summary.high} high</span>
        <span><b className="moderate-dot" />{gaps.summary.moderate} moderate</span>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={chartData} layout="vertical" margin={{ left: 5, right: 15 }}>
          <CartesianGrid stroke="#19312b" horizontal={false} />
          <XAxis type="number" domain={[0, 100]} tick={{ fill: '#708a82', fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis dataKey="name" type="category" width={72} tick={{ fill: '#a8bbb5', fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip content={({ active, payload }) => active && payload?.length ? <div className="chart-tooltip"><b>{payload[0].payload.category}</b><span>Score {payload[0].value}/100</span></div> : null} />
          <Bar dataKey="score" fill="#e7a34b" radius={[0, 5, 5, 0]} barSize={15} />
        </BarChart>
      </ResponsiveContainer>
    </article>
  );
}


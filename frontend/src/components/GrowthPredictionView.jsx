import { useEffect, useState } from 'react';
import { AlertTriangle, CalendarClock, Database, Users } from 'lucide-react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { getProjectGrowthPrediction } from '../api/client.js';

const number = (value) => value == null ? 'Data unavailable' : Number(value).toLocaleString();

export function GrowthPredictionView({ project }) {
  const [data, setData] = useState(null);
  const [state, setState] = useState({ loading: true, error: '' });
  useEffect(() => {
    let current = true;
    setState({ loading: true, error: '' });
    getProjectGrowthPrediction(project.id)
      .then((result) => { if (current) { setData(result); setState({ loading: false, error: '' }); } })
      .catch((error) => { if (current) setState({ loading: false, error: error.response?.data?.error?.message ?? 'Growth prediction is unavailable.' }); });
    return () => { current = false; };
  }, [project.id]);
  if (state.loading) return <div className="analysis-state"><span className="loader" /><h2>Calculating growth scenarios</h2><p>Applying project inputs and available contextual growth records.</p></div>;
  if (state.error) return <div className="analysis-state error"><AlertTriangle /><h2>Growth prediction unavailable</h2><p>{state.error}</p></div>;
  const finalScenario = data.scenarios.at(-1);
  return (
    <article className="growth-prediction-view">
      <header><div><p className="eyebrow">Deterministic scenario planning</p><h2>Growth Prediction</h2><p>Population-led demand within the saved project planning horizon.</p></div><span className="simulation-label">{data.projection_label}</span></header>
      <section className="growth-summary">
        <div><Users /><span>Baseline population</span><strong>{number(data.baseline_population)}</strong><small>{data.baseline_data_type.replaceAll('_', ' ')}</small></div>
        <div><CalendarClock /><span>{data.planning_horizon}-year scenario</span><strong>{number(finalScenario?.population)}</strong><small>SIMULATED</small></div>
        <div><Database /><span>Annual growth reference</span><strong>{data.annual_growth_rate == null ? 'Not used' : `${data.annual_growth_rate}%`}</strong><small>{data.confidence}</small></div>
      </section>
      <section className="growth-chart-card"><header><div><h3>Population scenario</h3><p>Values beyond the project horizon are not shown.</p></div></header><div className="growth-chart"><ResponsiveContainer height="100%" width="100%"><LineChart data={data.scenarios}><CartesianGrid stroke="#203a32" strokeDasharray="3 3" /><XAxis dataKey="year" stroke="#789088" tickFormatter={(year) => `${year}y`} /><YAxis stroke="#789088" width={65} /><Tooltip contentStyle={{ background: '#10211d', border: '1px solid #34594b' }} formatter={(value) => number(value)} /><Line dataKey="population" dot={{ fill: '#63dbaa' }} stroke="#63dbaa" strokeWidth={3} type="monotone" /></LineChart></ResponsiveContainer></div></section>
      <section className="growth-demand-grid">{data.scenarios.map((scenario) => <article key={scenario.year}><header><span>{scenario.year}-year</span><b>{scenario.status.replaceAll('_', ' ')}</b></header><strong>{number(scenario.population)} residents</strong><dl>{Object.entries(scenario.demand.requirements).slice(0, 5).map(([key, item]) => <div key={key}><dt>{key.replaceAll('_', ' ')}</dt><dd>{number(item.value)} {item.unit}</dd></div>)}</dl></article>)}</section>
      <div className="analysis-notes"><section><h3>Assumptions</h3>{data.assumptions.map((item) => <p key={item}>{item}</p>)}</section><section><h3>Data provenance</h3>{data.data_sources.map((item) => <p key={item.dataset}><b>{item.dataset}</b><span>{item.source ?? 'Data unavailable'} · {item.data_type.replaceAll('_', ' ')}</span></p>)}</section></div>
      <aside className="planning-notice"><AlertTriangle /><p>This is a scenario-based projection for planning comparison, not an official forecast.</p></aside>
    </article>
  );
}


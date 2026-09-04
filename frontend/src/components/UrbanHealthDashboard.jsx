import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Check, HeartPulse, RefreshCw } from 'lucide-react';
import {
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { getCityHealthScores } from '../api/client.js';

const componentLabels = {
  healthcare: 'Healthcare',
  education: 'Education',
  mobility: 'Mobility',
  environment: 'Environment',
  green_space: 'Green space',
  infrastructure: 'Infrastructure',
};

export function UrbanHealthDashboard({ cityId }) {
  const [rankings, setRankings] = useState([]);
  const [selectedWardId, setSelectedWardId] = useState(null);
  const [comparedIds, setComparedIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await getCityHealthScores(cityId);
      setRankings(result.rankings);
      setSelectedWardId((current) => result.rankings.some(({ ward }) => ward.id === current) ? current : result.rankings[0]?.ward.id ?? null);
      setComparedIds((current) => {
        const valid = current.filter((id) => result.rankings.some(({ ward }) => ward.id === id));
        return valid.length ? valid : result.rankings.slice(0, 3).map(({ ward }) => ward.id);
      });
    } catch (requestError) {
      setError(requestError.response?.data?.error?.message ?? 'Unable to load health scores');
    } finally {
      setLoading(false);
    }
  }, [cityId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const refresh = () => load();
    window.addEventListener('citymind:analysis-updated', refresh);
    return () => window.removeEventListener('citymind:analysis-updated', refresh);
  }, [load]);

  const selected = rankings.find(({ ward }) => ward.id === selectedWardId) ?? rankings[0];
  const radarData = useMemo(() => Object.entries(selected?.components ?? {}).map(([key, score]) => ({
    name: componentLabels[key], score,
  })), [selected]);
  const compared = rankings.filter(({ ward }) => comparedIds.includes(ward.id));

  const toggleComparison = (wardId) => {
    setComparedIds((current) => current.includes(wardId)
      ? current.filter((id) => id !== wardId)
      : [...current, wardId]);
  };

  return (
    <article className="panel urban-health-panel">
      <div className="panel-heading urban-health-heading">
        <div><p className="eyebrow">City performance index</p><h2>Urban Health Score</h2><p>A live weighted view of six normalized planning dimensions.</p></div>
        <div className="health-toolbar">
          <select aria-label="Select health score ward" disabled={!rankings.length} onChange={(event) => setSelectedWardId(Number(event.target.value))} value={selectedWardId ?? ''}>
            {rankings.map(({ ward }) => <option key={ward.id} value={ward.id}>{ward.name}</option>)}
          </select>
          <button aria-label="Refresh health scores" disabled={loading} onClick={load} type="button"><RefreshCw className={loading ? 'spinning' : ''} size={14} />Refresh</button>
        </div>
      </div>

      {loading && !selected && <div className="health-dashboard-state"><span className="loader" /><h3>Updating health scores</h3><p>Checking the latest analysis inputs for every ward…</p></div>}
      {error && <div className="health-dashboard-state error"><AlertTriangle /><h3>Health scores unavailable</h3><p>{error}</p><button onClick={load} type="button">Try again</button></div>}
      {!loading && !error && !selected && <div className="health-dashboard-state"><HeartPulse /><h3>No wards available</h3><p>Add ward data before calculating health scores.</p></div>}

      {selected && !error && <>
        <div className="health-primary-grid">
          <section className="health-hero-card">
            <div aria-label={`${selected.ward.name} health score: ${selected.score} out of 100`} className="health-score-ring" style={{ '--health-angle': `${selected.score * 3.6}deg` }}><div><strong>{selected.score}</strong><span>/100</span></div></div>
            <div className="health-hero-copy"><span>{selected.ward.ward_code}</span><h3>{selected.ward.name}</h3><strong className={`health-category ${selected.category.toLowerCase()}`}>{selected.category}</strong><p>Automatically recalculated from the latest available analysis inputs.</p></div>
          </section>
          <section className="health-radar-card">
            <div className="health-card-heading"><h3>Component balance</h3><span>Normalized 0–100</span></div>
            <div className="health-radar-chart"><ResponsiveContainer width="100%" height="100%"><RadarChart data={radarData} outerRadius="66%"><PolarGrid stroke="#29423a" /><PolarAngleAxis dataKey="name" tick={{ fill: '#8da29b', fontSize: 10 }} /><Radar dataKey="score" fill="#48e0a8" fillOpacity={0.25} stroke="#62e7b5" strokeWidth={2} /><Tooltip content={({ active, payload }) => active && payload?.length ? <div className="chart-tooltip"><b>{payload[0].payload.name}</b><span>{payload[0].value}/100</span></div> : null} /></RadarChart></ResponsiveContainer></div>
          </section>
        </div>

        <div className="health-component-grid">
          {Object.entries(selected.components).map(([key, score]) => <div className="health-component-card" key={key}><div><span>{componentLabels[key]}</span><strong>{score}</strong></div><div aria-label={`${componentLabels[key]}: ${score} out of 100`}><i style={{ width: `${score}%` }} /></div><small>Weight {Math.round(selected.weights[key] * 100)}%</small></div>)}
        </div>

        <section className="compare-wards-card">
          <div className="health-card-heading"><div><p className="eyebrow">Service equity</p><h3>Compare Wards</h3></div><span>Select multiple areas</span></div>
          <div className="ward-compare-options">{rankings.map(({ ward }) => { const checked = comparedIds.includes(ward.id); return <button aria-pressed={checked} className={checked ? 'selected' : ''} key={ward.id} onClick={() => toggleComparison(ward.id)} type="button">{checked && <Check size={11} />}{ward.name}</button>; })}</div>
          {compared.length ? <div className="health-ranking-table" role="table" aria-label="Ward health score ranking">
            <div className="health-ranking-head" role="row"><span>Rank</span><span>Ward</span><span>Health score</span><span>Category</span></div>
            {compared.map((item) => <div key={item.ward.id} role="row"><span>{rankings.indexOf(item) + 1}</span><strong>{item.ward.name}</strong><div><i style={{ width: `${item.score}%` }} /><b>{item.score}</b></div><span className={`health-category ${item.category.toLowerCase()}`}>{item.category}</span></div>)}
          </div> : <p className="compare-empty">Select at least one ward to compare.</p>}
        </section>
        <p className="health-formula-note">Weighted formula: Healthcare 20% · Education 18% · Mobility 18% · Environment 18% · Green space 12% · Infrastructure 14%</p>
      </>}
    </article>
  );
}

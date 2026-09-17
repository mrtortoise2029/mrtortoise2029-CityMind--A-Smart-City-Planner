import { useEffect, useState } from 'react';
import {
  AlertTriangle, ArrowRight, CheckCircle2, Database, HeartPulse,
  MapPinned, Route, ShieldAlert, Target, Users,
} from 'lucide-react';
import { getProjectDevelopmentFeasibility } from '../api/client.js';

const number = (value) => value == null ? 'Data unavailable' : Number(value).toLocaleString();
const label = (value) => String(value ?? 'DATA_UNAVAILABLE').replaceAll('_', ' ');
const findingIcon = (type) => type === 'POSITIVE' ? CheckCircle2 : type === 'UNAVAILABLE' ? Database : AlertTriangle;

export function DevelopmentFeasibilityView({ onNavigate, project }) {
  const [data, setData] = useState(null);
  const [state, setState] = useState({ loading: true, error: '' });
  useEffect(() => {
    let current = true;
    setState({ loading: true, error: '' });
    getProjectDevelopmentFeasibility(project.id)
      .then((result) => { if (current) { setData(result); setState({ loading: false, error: '' }); } })
      .catch((error) => { if (current) setState({ loading: false, error: error.response?.data?.error?.message ?? 'Development feasibility is unavailable.' }); });
    return () => { current = false; };
  }, [project.id]);

  if (state.loading) return <section className="feasibility-state"><span className="loader" /><h2>Assessing development feasibility</h2><p>Combining the site boundary, project inputs, master plan, infrastructure gaps, and supported risks.</p></section>;
  if (state.error) return <section className="feasibility-state error"><AlertTriangle /><h2>Development feasibility unavailable</h2><p>{state.error}</p></section>;

  const site = data.site_overview;
  const readiness = data.planning_readiness;
  return (
    <article className="development-feasibility-view">
      <header>
        <div><p className="eyebrow">Preliminary development feasibility</p><h2>Can I develop this land?</h2><p>Use available project evidence to decide whether this site is ready for deeper professional investigation.</p></div>
        <div className="feasibility-score" style={{ '--readiness-score': `${(readiness.score ?? 0) * 3.6}deg` }}><div><strong>{readiness.score ?? '—'}</strong><span>/100</span></div><small>Planning readiness</small><b>{label(readiness.band)}</b></div>
      </header>

      <section className="feasibility-site-overview">
        <div><MapPinned /><span>Land area</span><strong>{number(site.area_acres)}{site.area_acres != null && ' acres'}</strong><small>Saved project geometry</small></div>
        <div><Target /><span>Development type</span><strong>{label(site.project_type)}</strong><small>{site.planning_horizon}-year horizon</small></div>
        <div><Users /><span>Indicative population capacity</span><strong>{number(site.population_capacity.value)}</strong><small>{label(site.population_capacity.data_type)}</small></div>
        <div><Route /><span>Infrastructure gap</span><strong>{site.infrastructure_gap_percent == null ? 'Data unavailable' : `${site.infrastructure_gap_percent}%`}</strong><small>Deterministic gap analysis</small></div>
        <div><HeartPulse /><span>Urban health</span><strong>{site.urban_health_score == null ? 'Data unavailable' : `${site.urban_health_score}/100`}</strong><small>Project/block evidence</small></div>
        <div><ShieldAlert /><span>Available-evidence risk</span><strong>{label(site.risk_level)}</strong><small>Unsupported hazards excluded</small></div>
      </section>

      <div className="feasibility-content-grid">
        <section className="feasibility-findings"><header><div><p className="eyebrow">Decision evidence</p><h3>Key Findings</h3></div><span>{data.findings.length} findings</span></header>{data.findings.length ? data.findings.map((finding) => { const Icon = findingIcon(finding.type); return <article className={finding.type.toLowerCase()} key={`${finding.type}-${finding.title}`}><Icon /><div><strong>{finding.title}</strong><p>{finding.detail}</p><small>{finding.source} · {label(finding.confidence)}</small></div></article>; }) : <div className="feasibility-empty"><Database /><p>Insufficient evidence to produce findings.</p></div>}</section>
        <section className="readiness-evidence"><header><p className="eyebrow">Transparent calculation</p><h3>Planning Readiness</h3></header>{readiness.factors.map((factor) => <article key={factor.key}><div><span>{factor.label}</span><strong>{factor.score == null ? 'Data unavailable' : `${factor.score}/100`}</strong></div><div className="readiness-bar"><i style={{ width: `${factor.score ?? 0}%` }} /></div><p>{factor.evidence}</p></article>)}<small>{readiness.methodology}</small></section>
      </div>

      <footer><p>{data.decision_notice}</p><div><button onClick={() => onNavigate('gis')} type="button">Open GIS Planning <ArrowRight /></button><button onClick={() => onNavigate('reports')} type="button">Generate assessment <ArrowRight /></button></div></footer>
    </article>
  );
}

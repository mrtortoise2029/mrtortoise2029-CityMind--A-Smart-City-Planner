import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, ArrowRight, BarChart3, Building2, CalendarClock, CheckCircle2,
  CircleDollarSign, FileJson, FileText, Layers3, MapPin, Printer, Route, Sparkles,
  ShieldAlert, Target, TrendingUp, Users,
} from 'lucide-react';
import { CircleMarker, MapContainer, Polygon, TileLayer, Tooltip, useMap } from 'react-leaflet';
import { geoJSONToPositions } from '../utils/projectGeometry.js';
import { isPointInProjectContext } from '../utils/projectContext.js';
import { getProjectReport, simulateProjectBudget } from '../api/client.js';

const number = (value) => Number(value ?? 0).toLocaleString();
const planningPopulation = (project) => project.project_type === 'EXISTING_AREA'
  ? project.current_population
  : project.expected_population;

function PreviewViewport({ boundary }) {
  const map = useMap();
  useEffect(() => {
    if (boundary.length >= 3) map.fitBounds(boundary, { padding: [24, 24], maxZoom: 15 });
  }, [boundary, map]);
  return null;
}

function ProjectMapPreview({ mapData, project, onOpenMap }) {
  const boundary = useMemo(() => geoJSONToPositions(project.area?.boundary_geojson), [project.area?.boundary_geojson]);
  const center = boundary[0] ?? [mapData.city.latitude, mapData.city.longitude];
  const facilities = mapData.facilities.filter(({ latitude, longitude }) => Number.isFinite(Number(latitude))
    && Number.isFinite(Number(longitude))
    && isPointInProjectContext(latitude, longitude, project.area?.boundary_geojson, 0)).slice(0, 12);
  return (
    <section className="workspace-overview-card workspace-map-preview">
      <header><div><span>Spatial context</span><h3>Map Preview</h3></div><button onClick={onOpenMap} type="button">Open GIS Planning <ArrowRight size={13} /></button></header>
      <MapContainer attributionControl={false} center={center} dragging={false} doubleClickZoom={false} keyboard={false} scrollWheelZoom={false} touchZoom={false} zoom={13} zoomControl={false}>
        <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <PreviewViewport boundary={boundary} />
        {boundary.length >= 3 && <Polygon pathOptions={{ color: '#64ddb0', fillColor: '#2aa477', fillOpacity: 0.14, weight: 3 }} positions={boundary} />}
        {facilities.map((facility) => <CircleMarker center={[facility.latitude, facility.longitude]} key={facility.id} pathOptions={{ color: '#d7b86f', fillColor: '#d7b86f', fillOpacity: 0.8 }} radius={4}><Tooltip>{facility.name}</Tooltip></CircleMarker>)}
      </MapContainer>
      <footer><span><i className="boundary" />Project boundary</span><span><i className="facility" />Mapped facility context</span><small>OpenStreetMap</small></footer>
    </section>
  );
}

export function ProjectMetrics({ dashboard, gapAnalysis, project }) {
  const area = project.area?.area_acres ?? project.area_acres;
  const population = planningPopulation(project);
  const blockHealth = gapAnalysis?.block_analysis?.summary?.score;
  const health = blockHealth ?? project.health_score ?? '--';
  const healthSource = blockHealth != null ? 'Population-weighted block score' : project.health_score != null ? 'Stored project score' : 'Block analysis loading';
  const gap = gapAnalysis?.overview?.overall_gap_percent;
  return (
    <section aria-label="Project metrics" className="workspace-metrics">
      <article><MapPin size={17} /><div><span>Area</span><strong>{area ? number(area) : '--'} <small>acres</small></strong><p>Saved project boundary</p></div></article>
      <article><Users size={17} /><div><span>{project.project_type === 'NEW_DEVELOPMENT' ? 'Expected Population' : 'Current Population'}</span><strong>{population ? number(population) : '--'}</strong><p>Project planning parameter</p></div></article>
      <article><CheckCircle2 size={17} /><div><span>Urban Health</span><strong>{health}<small>/100</small></strong><p>{healthSource}</p></div></article>
      <article><Layers3 size={17} /><div><span>Infrastructure Gap</span><strong>{gap ?? '--'}{gap != null && <small>%</small>}</strong><p>{gap == null ? 'Loading project evidence' : 'Deterministic project analysis'}</p></div></article>
      <article><Target size={17} /><div><span>Planning Progress</span><strong>{Number(project.progress_percent ?? 0)}<small>%</small></strong><div className="workspace-progress"><i style={{ width: `${project.progress_percent ?? 0}%` }} /></div></div></article>
    </section>
  );
}

export function ProjectOverview({ dashboard, gapAnalysis, onNavigate, project, recommendationResult }) {
  const priorities = gapAnalysis?.priority_areas?.slice(0, 4) ?? [];
  const recommendations = recommendationResult?.recommendations?.slice(0, 3) ?? [];
  const projectPopulation = planningPopulation(project);
  return (
    <div className="project-overview-view">
      <section className="workspace-intro">
        <div><span>Master planning workspace</span><h2>Plan the development area from evidence to delivery.</h2><p>The boundary, service gaps, candidate sites, and planning scenarios below stay connected to this project.</p></div>
        <div><span>Current stage</span><strong>{project.planning_stage}</strong><small>{project.status}</small></div>
      </section>

      <div className="overview-planning-grid">
        <section className="workspace-overview-card planning-progress-card">
          <header><div><span>Delivery readiness</span><h3>Planning Progress</h3></div><strong>{Number(project.progress_percent ?? 0)}%</strong></header>
          <div className="large-progress"><i style={{ width: `${project.progress_percent ?? 0}%` }} /></div>
          <div className="progress-milestones"><span className="complete">Project setup</span><span className={project.area ? 'complete' : ''}>Boundary</span><span className={gapAnalysis ? 'complete' : ''}>Gap evidence</span><span className={recommendationResult ? 'complete' : ''}>Candidate review</span></div>
        </section>

        <section className="workspace-overview-card current-situation-card">
          <header><div><span>Project brief</span><h3>Current Situation</h3></div><Building2 size={18} /></header>
          <dl><div><dt>Development model</dt><dd>{project.project_type.replaceAll('_', ' ')}</dd></div><div><dt>Planning population</dt><dd>{projectPopulation ? number(projectPopulation) : 'Not defined'}</dd></div><div><dt>Project blocks</dt><dd>{gapAnalysis?.block_analysis?.summary?.block_count ?? 'Loading'}</dd></div><div><dt>Allocated block population</dt><dd>{gapAnalysis?.block_analysis?.summary?.population ? number(gapAnalysis.block_analysis.summary.population) : 'Loading'}</dd></div></dl>
        </section>

        <section className="workspace-overview-card critical-gaps-card">
          <header><div><span>Immediate evidence</span><h3>Critical Gaps</h3></div><AlertTriangle size={18} /></header>
          {priorities.length ? <ol>{priorities.map((item) => <li key={item.key}><b>{item.rank}</b><span>{item.category}</span><strong>{item.gap_percent}% gap</strong></li>)}</ol> : <p>Project gap evidence is loading.</p>}
          <button onClick={() => onNavigate('gaps')} type="button">Review gap analysis <ArrowRight size={13} /></button>
        </section>

        <section className="workspace-overview-card top-recommendations-card">
          <header><div><span>Planner options</span><h3>Top Recommendations</h3></div><Sparkles size={18} /></header>
          {recommendations.length ? <ol>{recommendations.map((item) => <li key={item.recommendation_id}><b>{item.rank}</b><div><span>{item.candidate_location?.label}</span><small>{item.project_type.replaceAll('_', ' ')}</small></div><strong>{item.recommendation_score}</strong></li>)}</ol> : <div className="overview-empty"><p>No project recommendation run yet.</p><small>Choose a development need and budget to generate ranked candidate options.</small></div>}
          <button onClick={() => onNavigate('recommendations')} type="button">{recommendations.length ? 'Compare candidates' : 'Analyze candidate sites'} <ArrowRight size={13} /></button>
        </section>

        <section className="workspace-overview-card future-demand-card">
          <header><div><span>Planning horizon</span><h3>Future Demand</h3></div><CalendarClock size={18} /></header>
          <strong>{project.planning_horizon}<small> years</small></strong>
          <p>{project.project_type === 'NEW_DEVELOPMENT' ? `${number(project.expected_population)} expected residents at the project horizon.` : 'Demand scenarios use current population and available reference growth.'}</p>
          <span className="simulation-label">SIMULATED PLANNING VIEW</span>
          <button onClick={() => onNavigate('future')} type="button">Explore scenarios <ArrowRight size={13} /></button>
        </section>

        <ProjectMapPreview mapData={dashboard.map} onOpenMap={() => onNavigate('gis')} project={project} />
      </div>
    </div>
  );
}

function scenarioPopulation(project, year, growthRate) {
  const horizon = Number(project.planning_horizon || 20);
  if (project.project_type === 'NEW_DEVELOPMENT') {
    return Math.round(Number(project.expected_population || 0) * Math.min(year / horizon, 1));
  }
  return Math.round(Number(project.current_population || 0) * ((1 + growthRate / 100) ** year));
}

export function FuturePlanningView({ dashboard, project }) {
  const growthRates = dashboard.map.wards.map((ward) => Number(ward.growth_rate)).filter(Number.isFinite);
  const growthRate = growthRates.length ? growthRates.reduce((total, value) => total + value, 0) / growthRates.length : 0;
  const scenarios = [5, 10, 20, 30].map((year) => ({ year, population: scenarioPopulation(project, year, growthRate) }));
  return (
    <article className="future-planning-view">
      <header><div><p className="eyebrow">Scenario planning</p><h2>Future Planning</h2><p>Explore transparent population-led demand snapshots without changing the saved project.</p></div><span className="simulation-label">SIMULATED</span></header>
      <div className="scenario-grid">{scenarios.map((scenario) => <section key={scenario.year}><span>{scenario.year}-year scenario</span><strong>{number(scenario.population)}</strong><small>projected residents</small><div><i style={{ width: `${Math.min(100, (scenario.population / Math.max(...scenarios.map(({ population }) => population), 1)) * 100)}%` }} /></div><p>{project.project_type === 'NEW_DEVELOPMENT' ? 'Linear delivery toward the saved expected population.' : `${growthRate.toFixed(1)}% mean annual growth from available reference zones.`}</p></section>)}</div>
      <aside><BarChart3 size={18} /><div><strong>Planning assumption</strong><p>These scenarios are simulations for comparison. They are not forecasts and are not stored as approved project decisions.</p></div></aside>
    </article>
  );
}

export function BudgetWorkspaceView({ project }) {
  const [availableBudget, setAvailableBudget] = useState(250000000);
  const [scenarioType, setScenarioType] = useState('BALANCED');
  const [result, setResult] = useState(null);
  const [state, setState] = useState({ loading: false, error: '' });
  const run = async (event) => {
    event.preventDefault(); setState({ loading: true, error: '' });
    try {
      setResult(await simulateProjectBudget(project.id, {
        availableBudget: Number(availableBudget), currency: 'BDT', scenarioType, saveScenario: true,
      }));
      setState({ loading: false, error: '' });
    } catch (error) {
      setState({ loading: false, error: error.response?.data?.error?.message ?? 'Budget simulation failed.' });
    }
  };
  return (
    <article className="budget-workspace-view">
      <header><div><p className="eyebrow">Project budget simulation</p><h2>Compare delivery packages within a planning budget.</h2><p>All costs are clearly labeled planning assumptions until verified local rates are supplied.</p></div><CircleDollarSign size={28} /></header>
      <form onSubmit={run}><label><span>Available budget (BDT)</span><input min="1" onChange={(event) => setAvailableBudget(event.target.value)} required type="number" value={availableBudget} /></label><label><span>Scenario strategy</span><select onChange={(event) => setScenarioType(event.target.value)} value={scenarioType}><option value="MINIMUM_COST">Minimum Cost</option><option value="BALANCED">Balanced</option><option value="MAXIMUM_IMPACT">Maximum Impact</option></select></label><button disabled={state.loading} type="submit">{state.loading ? 'Simulating…' : 'Run Budget Simulation'}</button></form>
      {state.error && <p className="budget-error">{state.error}</p>}
      {result && <><section className="budget-summary"><div><span>Allocated</span><strong>BDT {number(result.summary.allocated)}</strong></div><div><span>Remaining</span><strong>BDT {number(result.summary.remaining)}</strong></div><div><span>Funded packages</span><strong>{result.summary.funded_packages}</strong></div><div><span>Deferred</span><strong>{result.summary.deferred_packages}</strong></div></section><div className="budget-package-grid"><section><h3>Included in scenario</h3>{result.selected.length ? result.selected.map((item) => <article key={item.category}><div><strong>{item.label}</strong><span>{item.units} planned unit{item.units === 1 ? '' : 's'} · {item.priority}</span></div><b>BDT {number(item.estimated_cost)}</b></article>) : <p>No complete intervention package fits this budget.</p>}</section><section><h3>Deferred packages</h3>{result.deferred.length ? result.deferred.map((item) => <article key={item.category}><div><strong>{item.label}</strong><span>{item.reason}</span></div><b>BDT {number(item.estimated_cost)}</b></article>) : <p>All evaluated packages fit this scenario.</p>}</section></div><aside><AlertTriangle size={16} /><p>{result.warning} <b>{result.confidence}</b></p></aside></>}
    </article>
  );
}

export function ReportsWorkspaceView({ onExport, onPrint, project }) {
  const [report, setReport] = useState(null);
  const [state, setState] = useState({ loading: true, error: '' });
  useEffect(() => {
    let current = true;
    getProjectReport(project.id)
      .then((result) => { if (current) { setReport(result); setState({ loading: false, error: '' }); } })
      .catch((error) => { if (current) setState({ loading: false, error: error.response?.data?.error?.message ?? 'Report evidence is unavailable.' }); });
    return () => { current = false; };
  }, [project.id]);
  const readiness = report ? [
    ['Project information', FileText, report.project_overview],
    ['Boundary & GIS', Layers3, report.gis_assets],
    ['Gap analysis', Route, report.gap_analysis],
    ['Recommendations', Sparkles, report.recommendations],
    ['Urban health', CheckCircle2, report.urban_health],
    ['Growth prediction', TrendingUp, report.growth_prediction],
    ['Risk detection', ShieldAlert, report.risk_detection],
    ['Future planning', CalendarClock, report.future_planning],
    ['Existing budget result', CircleDollarSign, report.budget_information],
    ['AI explanation', Sparkles, report.ai_summary],
  ] : [];
  const overview = report?.project_overview?.data;
  const growth = report?.growth_prediction?.data;
  const risks = report?.risk_detection?.data;
  const gaps = report?.gap_analysis?.data;
  const recommendations = report?.recommendations?.data?.recommendations ?? [];
  const phases = report?.future_planning?.data?.phases ?? [];
  const budgets = report?.budget_information?.data ?? [];
  return (
    <article className="reports-workspace-view">
      <header><div><p className="eyebrow">Project evidence package</p><h2>Reports</h2><p>Project-specific facts, provenance, deterministic analysis, and clearly labeled scenarios.</p></div><div><button disabled={!report} onClick={onExport} type="button"><FileJson size={14} />Export Report</button><button className="primary" disabled={!report} onClick={onPrint} type="button"><Printer size={14} />Print View</button></div></header>
      {state.loading && <div className="report-loading"><span className="loader" /><p>Aggregating project evidence…</p></div>}
      {state.error && <div className="report-error"><AlertTriangle /><p>{state.error}</p></div>}
      {report && <><section className="report-cover"><span>CityMind planning report</span><h3>{project.name}</h3><p>{String(project.project_type).replaceAll('_', ' ')} · {project.planning_horizon}-year horizon · Generated {new Date(report.generated_at).toLocaleDateString()}</p><small>{report.data_notice}</small></section><div className="report-readiness-grid">{readiness.map(([label, Icon, section]) => <section key={label}><Icon size={19} /><div><span>{label}</span><strong className={section.status === 'READY' ? 'ready' : 'unavailable'}>{section.status === 'READY' ? 'Ready' : 'Unavailable'}</strong><small>{section.status === 'READY' ? 'Included in this project report' : section.reason}</small></div></section>)}</div><div className="print-report-body">
        <section><h3>1. Project Overview</h3><dl className="report-facts"><div><dt>Project type</dt><dd>{overview.project_type.replaceAll('_', ' ')}</dd></div><div><dt>Area</dt><dd>{number(overview.area_acres)} acres</dd></div><div><dt>Planning horizon</dt><dd>{overview.planning_horizon} years</dd></div><div><dt>Population</dt><dd>{number(overview.population.current ?? overview.population.expected)} · {overview.population.current ? overview.population.current_data_type : overview.population.expected_data_type}</dd></div></dl><p>{overview.description}</p></section>
        <section><h3>2. Growth Prediction</h3>{growth ? <><p>{growth.projection_label} · {growth.confidence}. This is not an official forecast.</p><table><thead><tr><th>Horizon</th><th>Population</th><th>Households</th><th>Label</th></tr></thead><tbody>{growth.scenarios.map((scenario) => <tr key={scenario.year}><td>{scenario.year} years</td><td>{number(scenario.population)}</td><td>{number(scenario.households)}</td><td>{scenario.data_type}</td></tr>)}</tbody></table></> : <p>Data unavailable.</p>}</section>
        <section><h3>3. Risk Detection</h3>{risks?.risks?.length ? <table><thead><tr><th>Risk</th><th>Severity</th><th>Score</th><th>Evidence</th></tr></thead><tbody>{risks.risks.map((risk) => <tr key={risk.risk_type}><td>{risk.label}</td><td>{risk.severity}</td><td>{risk.score}/100</td><td>{risk.evidence.missing} {risk.evidence.unit} missing</td></tr>)}</tbody></table> : <p>No supported risk score is available.</p>}<p>{risks?.unavailable_risks?.map(({ risk_type }) => risk_type.replaceAll('_', ' ')).join(', ')}: data unavailable.</p></section>
        <section><h3>4. Infrastructure Gaps & Recommendations</h3>{gaps ? <table><thead><tr><th>Priority</th><th>Category</th><th>Gap</th><th>Missing</th></tr></thead><tbody>{gaps.priority_areas.slice(0, 8).map((item) => <tr key={item.key}><td>{item.rank}</td><td>{item.category}</td><td>{item.gap_percent}%</td><td>{item.missing} {item.unit}</td></tr>)}</tbody></table> : <p>Gap analysis unavailable.</p>}{recommendations.length ? <ol>{recommendations.slice(0, 8).map((item) => <li key={item.recommendation_id}>{item.title} — score {item.recommendation_score}/100 ({item.priority})</li>)}</ol> : <p>No project recommendations have been generated.</p>}</section>
        <section><h3>5. Development Phases & Existing Budget Information</h3>{phases.length ? <ol>{phases.map((phase) => <li key={phase.id}>{phase.name}: years {phase.start_year}–{phase.end_year} ({phase.status})</li>)}</ol> : <p>No development phases are saved.</p>}{budgets.length ? <p>{budgets.length} existing saved Budget Optimizer scenario{budgets.length === 1 ? '' : 's'} included. No budget calculation was performed by this report.</p> : <p>No existing saved Budget Optimizer result is available.</p>}</section>
        <section><h3>6. Assumptions & Data Provenance</h3>{growth?.assumptions?.map((item) => <p key={item}>{item}</p>)}{growth?.data_sources?.map((item) => <p key={item.dataset}><b>{item.dataset}:</b> {item.source ?? 'Data unavailable'} ({item.data_type})</p>)}</section>
        <section><h3>7. AI Explanation</h3><p>{report.ai_summary.data?.text ?? report.ai_summary.reason}</p></section>
      </div></>}
    </article>
  );
}

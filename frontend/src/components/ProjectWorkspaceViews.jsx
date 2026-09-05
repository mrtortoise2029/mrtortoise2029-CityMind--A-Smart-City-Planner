<<<<<<< HEAD
import React from 'react';

export function BudgetWorkspaceView({ project }) {
	return (
		<section className="panel">
			<header><h3>Budget</h3></header>
			<p>{project ? `Available budget for ${project.name || 'project'} shown here.` : 'No project selected.'}</p>
		</section>
	);
}

export function FuturePlanningView({ dashboard, project }) {
	return (
		<section className="panel">
			<header><h3>Future Planning</h3></header>
			<p>Planning horizon: {project?.planning_horizon ?? 'n/a'} years</p>
			<pre style={{whiteSpace: 'pre-wrap'}}>{dashboard ? JSON.stringify(dashboard.futurePlan || {}, null, 2) : 'No dashboard data'}</pre>
		</section>
	);
}

export function ProjectMetrics({ dashboard, gapAnalysis, project }) {
	return (
		<section className="project-metrics panel">
			<div className="metrics-row">
				<div>
					<strong>Health Score</strong>
					<div className="metric-value">{dashboard?.healthScore ?? (project?.health_score ?? '—')}</div>
				</div>
				<div>
					<strong>Area</strong>
					<div className="metric-value">{project?.area_acres ?? dashboard?.area_acres ?? '—'}</div>
				</div>
				<div>
					<strong>Population</strong>
					<div className="metric-value">{project?.current_population ?? dashboard?.population ?? '—'}</div>
				</div>
			</div>
			{gapAnalysis && <div className="gap-summary"><h4>Gap summary</h4><pre>{JSON.stringify(gapAnalysis, null, 2)}</pre></div>}
		</section>
	);
}

export function ProjectOverview({ dashboard, gapAnalysis, onNavigate, project, recommendationResult }) {
	return (
		<section className="panel project-overview">
			<header>
				<h3>Project Overview</h3>
				<p>{project?.name ?? 'Unnamed project'}</p>
			</header>
			<div>
				<p><strong>Type:</strong> {project?.project_type ?? '—'}</p>
				<p><strong>Planning horizon:</strong> {project?.planning_horizon ?? '—'}</p>
				<div style={{marginTop:12}}>
					<button onClick={() => onNavigate('gis')}>Open GIS</button>
					<button onClick={() => onNavigate('recommendations')}>Recommendations</button>
				</div>
			</div>
			{recommendationResult && <div className="recommendation-preview"><h4>Top recommendation</h4><pre>{JSON.stringify(recommendationResult.recommendations?.[0] ?? {}, null, 2)}</pre></div>}
		</section>
	);
}

export function ReportsWorkspaceView({ gapAnalysis, onExport, onPrint, project, recommendationResult }) {
	return (
		<section className="panel reports-workspace">
			<header><h3>Reports</h3></header>
			<div style={{display:'flex',gap:8}}>
				<button onClick={() => onExport?.()}>Export report</button>
				<button onClick={() => onPrint?.()}>Print</button>
			</div>
			<div style={{marginTop:12}}>
				<h4>Project</h4>
				<pre>{JSON.stringify(project ?? {}, null, 2)}</pre>
				<h4>Gap analysis</h4>
				<pre>{JSON.stringify(gapAnalysis ?? {}, null, 2)}</pre>
			</div>
		</section>
	);
}

export default null;
=======
import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, ArrowRight, BarChart3, Building2, CalendarClock, CheckCircle2,
  CircleDollarSign, FileJson, FileText, Layers3, MapPin, Printer, Route, Sparkles,
  Target, Users,
} from 'lucide-react';
import { CircleMarker, MapContainer, Polygon, TileLayer, Tooltip, useMap } from 'react-leaflet';
import { geoJSONToPositions } from '../utils/projectGeometry.js';
import { isPointInProjectContext } from '../utils/projectContext.js';
import { simulateProjectBudget } from '../api/client.js';

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

export function ReportsWorkspaceView({ gapAnalysis, onExport, onPrint, project, recommendationResult }) {
  return (
    <article className="reports-workspace-view">
      <header><div><p className="eyebrow">Project evidence package</p><h2>Reports</h2><p>Export the currently available project facts and deterministic analysis results.</p></div><div><button onClick={onExport} type="button"><FileJson size={14} />Export JSON</button><button className="primary" onClick={onPrint} type="button"><Printer size={14} />Print View</button></div></header>
      <div className="report-readiness-grid">
        <section><FileText size={19} /><div><span>Project brief</span><strong>Ready</strong><small>Identity, boundary and planning parameters</small></div></section>
        <section><Layers3 size={19} /><div><span>Coverage gap report</span><strong>{gapAnalysis ? 'Ready' : 'Loading'}</strong><small>Deterministic service benchmarks</small></div></section>
        <section><Sparkles size={19} /><div><span>Candidate assessment</span><strong>{recommendationResult ? 'Ready' : 'Not generated'}</strong><small>Run Recommendations to include ranked options</small></div></section>
        <section><Route size={19} /><div><span>GIS planning context</span><strong>{project.area ? 'Ready' : 'Boundary required'}</strong><small>Saved project boundary and mapped context</small></div></section>
      </div>
    </article>
  );
}
>>>>>>> mrtortoise

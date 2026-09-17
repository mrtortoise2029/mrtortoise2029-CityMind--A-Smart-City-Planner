import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, ArrowRight, BarChart3, Building2, CalendarClock, CheckCircle2, Clock3,
  CircleDollarSign, FileJson, FileText, Layers3, MapPin, Printer, Route, Sparkles,
  ShieldAlert, Target, TrendingUp, Users,
} from 'lucide-react';
import { CircleMarker, MapContainer, Polygon, TileLayer, Tooltip, useMap } from 'react-leaflet';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { geoJSONToPositions } from '../utils/projectGeometry.js';
import { isPointInProjectContext } from '../utils/projectContext.js';
import { getProjectFuturePlan, getProjectGrowthPrediction, getProjectReport, simulateProjectBudget } from '../api/client.js';

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

export function FuturePlanningView({ project }) {
  const [data, setData] = useState(null);
  const [phases, setPhases] = useState([]);
  const [state, setState] = useState({ loading: true, error: '' });
  useEffect(() => {
    let current = true;
    Promise.allSettled([getProjectGrowthPrediction(project.id), getProjectFuturePlan(project.id)])
      .then(([growthResult, futureResult]) => {
        if (!current) return;
        if (growthResult.status === 'rejected') {
          setState({ loading: false, error: growthResult.reason?.response?.data?.error?.message ?? 'Future planning evidence is unavailable.' });
          return;
        }
        setData(growthResult.value);
        setPhases(futureResult.status === 'fulfilled' ? futureResult.value.phases ?? [] : []);
        setState({ loading: false, error: '' });
      });
    return () => { current = false; };
  }, [project.id]);
  if (state.loading) return <div className="analysis-state"><span className="loader" /><h2>Loading future planning scenarios</h2><p>Reusing the deterministic project growth model.</p></div>;
  if (state.error) return <div className="analysis-state error"><AlertTriangle /><h2>Future planning unavailable</h2><p>{state.error}</p></div>;
  const scenarios = data.scenarios;
  const maxPopulation = Math.max(...scenarios.map(({ population }) => population), 1);
  return (
    <article className="future-planning-view">
      <header><div><p className="eyebrow">Scenario planning</p><h2>Future Planning</h2><p>Explore transparent population-led demand snapshots without changing the saved project.</p></div><span className="simulation-label">SIMULATED</span></header>
      <div className="future-current"><span>Current / baseline</span><strong>{data.current.population ? number(data.current.population) : 'Data unavailable'}</strong><small>{data.current.data_type.replaceAll('_', ' ')}</small></div>
      <div className="scenario-grid">{scenarios.map((scenario) => { const phase = phases.find(({ start_year: start, end_year: end }) => scenario.year >= start && scenario.year <= end); return <section key={scenario.year}><span>{scenario.year}-year scenario</span><strong>{number(scenario.population)}</strong><small>scenario-based residents · {scenario.data_type}</small><div><i style={{ width: `${Math.min(100, (scenario.population / maxPopulation) * 100)}%` }} /></div><p>{data.assumptions[0]}</p>{phase && <b>{phase.name}</b>}</section>; })}</div>
      <aside><BarChart3 size={18} /><div><strong>Planning assumption</strong><p>These scenarios reuse Growth Prediction backend results and stop at the saved {data.planning_horizon}-year horizon. They are not official forecasts or approved project decisions.</p></div></aside>
    </article>
  );
}

export function BudgetWorkspaceView({ project }) {
  const [availableBudget, setAvailableBudget] = useState(500000000);
  const [scenarioType, setScenarioType] = useState('BALANCED');
  const [scenarioName, setScenarioName] = useState('Balanced Development Plan');
  const [result, setResult] = useState(null);
  const [state, setState] = useState({ loading: false, error: '' });

  const run = async (event) => {
    event.preventDefault();
    setState({ loading: true, error: '' });
    try {
      const response = await simulateProjectBudget(project.id, {
        availableBudget: Number(availableBudget),
        currency: 'BDT',
        scenarioType,
        scenarioName,
        saveScenario: true,
      });
      setResult(response);
      setState({ loading: false, error: '' });
    } catch (error) {
      setState({
        loading: false,
        error: error.response?.data?.error?.message ?? 'Budget optimization failed.',
      });
    }
  };

  const allocations = result?.sector_allocations ?? [];
  const optimizer = result?.optimizer_summary;
  const allocatedBudget = Number(optimizer?.allocated_budget ?? 0);
  const totalBudget = Number(optimizer?.total_budget ?? result?.available_budget ?? availableBudget);
  const unallocatedBudget = Number(optimizer?.unallocated_budget ?? Math.max(totalBudget - allocatedBudget, 0));
  const allocatedPercent = totalBudget > 0 ? (allocatedBudget / totalBudget) * 100 : 0;

  const chartData = allocations
    .filter((item) => Number(item.allocated_amount) > 0)
    .map((item) => ({
      name: item.label,
      value: Number(item.allocated_amount),
      percentage: allocatedBudget > 0 ? (Number(item.allocated_amount) / allocatedBudget) * 100 : 0,
    }));

  const chartColors = ['#60a5fa', '#4ade80', '#fb923c', '#fb7185', '#c084fc', '#fde047', '#2dd4bf'];
  const criticalCount = allocations.filter((item) => item.priority === 'CRITICAL').length;
  const fullyFundedCount = allocations.filter((item) => Number(item.funding_coverage_percent) >= 100).length;

  return (
    <article className="budget-dashboard">
      <section className="budget-control-panel">
        <div>
          <p className="eyebrow">Smart Budget Optimizer</p>
          <h2>Plan development within your available budget.</h2>
          <p>CityMind converts project-specific infrastructure gaps into an explainable financial allocation scenario.</p>
        </div>
        <form onSubmit={run}>
          <label>
            Available Budget (BDT)
            <input min="1" required type="number" value={availableBudget}
              onChange={(event) => setAvailableBudget(event.target.value)} />
          </label>
          <label>
            Optimization Goal
            <select value={scenarioType} onChange={(event) => setScenarioType(event.target.value)}>
              <option value="BALANCED">Balanced Development</option>
              <option value="MAXIMUM_IMPACT">Maximum Impact</option>
              <option value="MINIMUM_COST">Minimum Cost</option>
            </select>
          </label>
          <label>
            Scenario Name
            <input minLength="3" maxLength="120" value={scenarioName}
              onChange={(event) => setScenarioName(event.target.value)} />
          </label>
          <button disabled={state.loading} type="submit">
            {state.loading ? 'Optimizing…' : 'Optimize Budget'}
          </button>
        </form>
      </section>

      {state.error && <p className="budget-error">{state.error}</p>}

      {result && (
        <>
          <section className="budget-result-title">
            <div>
              <p className="eyebrow">Optimized Scenario</p>
              <h2>{result.scenario_name}</h2>
              <p>Allocation is based on project-specific service gaps and missing infrastructure.</p>
            </div>
            <span className="budget-simulated">{result.simulation_label ?? 'SIMULATED'}</span>
          </section>

          <section className="budget-glance-grid">
            <article className="budget-total-card">
              <span>Total Budget</span>
              <h2>BDT {number(totalBudget)}</h2>
              <div className="budget-progress">
                <i style={{ width: `${Math.min(allocatedPercent, 100)}%` }} />
              </div>
              <div className="budget-total-details">
                <p>
                  <span>Allocated</span>
                  <strong>BDT {number(allocatedBudget)}</strong>
                  <small>{allocatedPercent.toFixed(1)}% of budget</small>
                </p>
                <p>
                  <span>Unallocated</span>
                  <strong>BDT {number(unallocatedBudget)}</strong>
                  <small>{Math.max(0, 100 - allocatedPercent).toFixed(1)}% buffer</small>
                </p>
              </div>
            </article>

            <article className="budget-chart-card">
              <div><span>Budget Distribution</span><strong>Sector allocation</strong></div>
              <div className="budget-chart-layout">
                <div className="budget-donut">
                  <ResponsiveContainer width="100%" height={190}>
                    <PieChart>
                      <Pie data={chartData} dataKey="value" nameKey="name"
                        innerRadius={55} outerRadius={78} paddingAngle={2}>
                        {chartData.map((entry, index) => (
                          <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip formatter={(value) => [`BDT ${number(value)}`, 'Allocation']} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="budget-donut-center">
                    <small>Allocated</small><strong>BDT</strong>
                    <span>{(allocatedBudget / 1000000).toFixed(1)}M</span>
                  </div>
                </div>
                <div className="budget-chart-legend">
                  {chartData.map((item, index) => (
                    <div key={item.name}>
                      <i style={{ background: chartColors[index % chartColors.length] }} />
                      <span>{item.name}</span><strong>{item.percentage.toFixed(1)}%</strong>
                    </div>
                  ))}
                </div>
              </div>
            </article>

            <article className="budget-impact-card">
              <div><TrendingUp size={21} /><p><span>Expected Impact</span><strong>{optimizer?.average_expected_impact_percent ?? 0}%</strong></p></div>
              <div><Layers3 size={21} /><p><span>Sectors Evaluated</span><strong>{allocations.length}</strong></p></div>
              <div><CheckCircle2 size={21} /><p><span>Fully Funded</span><strong>{fullyFundedCount}/{allocations.length}</strong></p></div>
              <div><Target size={21} /><p><span>Critical Priorities</span><strong>{criticalCount}</strong></p></div>
            </article>
          </section>

          <section className="budget-sector-section">
            <header>
              <div><p className="eyebrow">Sector Allocation</p><h2>Recommended Budget Allocation</h2></div>
              <span>{allocations.length} sectors evaluated</span>
            </header>
            <div className="budget-sector-grid">
              {allocations.map((item, index) => {
  const actualShare = allocatedBudget > 0
    ? (Number(item.allocated_amount) / allocatedBudget) * 100
    : 0;

  const noCurrentGap = item.priority === 'NO_GAP';

  return (
    <article className="budget-sector-card" key={item.category}>
      <header>
        <div
          className="budget-sector-icon"
          style={{ color: chartColors[index % chartColors.length] }}
        >
          <CircleDollarSign size={22} />
        </div>

        <div>
          <strong>{item.label}</strong>

          <span>
            {noCurrentGap
              ? 'NO CURRENT GAP'
              : `${item.priority} PRIORITY`}
          </span>
        </div>

        <div className="budget-sector-money">
          <strong>
            BDT {number(item.allocated_amount)}
          </strong>

          <span>
            {actualShare.toFixed(1)}% of allocation
          </span>
        </div>
      </header>

      <div className="budget-sector-progress">
        <i
          style={{
            width: `${Math.min(
              Number(item.funding_coverage_percent),
              100
            )}%`,
            background:
              chartColors[index % chartColors.length],
          }}
        />
      </div>

      <dl>
        <div>
          <dt>Need score</dt>
          <dd>{item.need_score}/100</dd>
        </div>

        <div>
          <dt>Required cost</dt>
          <dd>
            {noCurrentGap
              ? 'Not required'
              : `BDT ${number(item.required_cost)}`}
          </dd>
        </div>

        <div>
          <dt>Funding coverage</dt>
          <dd>
            {noCurrentGap
              ? 'Not required'
              : `${item.funding_coverage_percent}%`}
          </dd>
        </div>

        <div>
          <dt>Expected impact</dt>
          <dd>
            {noCurrentGap
              ? 'No additional impact required'
              : `+${item.expected_impact_percent}%`}
          </dd>
        </div>
      </dl>

      <p>{item.reason}</p>

      <span className="budget-simulated small">
        {noCurrentGap
          ? 'NO FUNDING REQUIRED'
          : 'SIMULATED IMPACT'}
      </span>
    </article>
  );
})}
            </div>
          </section>

          <section className="budget-bottom-grid">
            <article className="budget-why-card">
              <header><Sparkles size={20} /><h3>Why this allocation?</h3></header>
              <p>{result.methodology?.need_score}</p>
              <p>{result.methodology?.allocation}</p>
              {result.methodology?.impact && <p>{result.methodology.impact}</p>}
              <div>
                <span>✓ Focuses on infrastructure gaps</span>
                <span>✓ Prioritizes higher-need sectors</span>
                <span>✓ Respects the available budget</span>
                <span>✓ Keeps the result explainable</span>
              </div>
            </article>

            <article className="budget-funded-card">
              <header><CheckCircle2 size={19} /><h3>Fully Funded Packages</h3></header>
              {result.selected?.length ? result.selected.map((item) => (
                <div key={item.category}>
                  <span>● {item.label}</span><strong>BDT {number(item.estimated_cost)}</strong>
                </div>
              )) : <p>No complete package is fully funded.</p>}
            </article>

            <article className="budget-deferred-card">
              <header><Clock3 size={19} /><h3>Deferred Packages</h3></header>
              {result.deferred?.length ? result.deferred.map((item) => (
                <div key={item.category}>
                  <span>{item.label}</span><strong>BDT {number(item.estimated_cost)}</strong>
                </div>
              )) : (
                <div className="budget-empty-state">
                  <CheckCircle2 size={28} /><p>No packages deferred.</p>
                </div>
              )}
            </article>
          </section>

          <aside className="budget-warning">
            <AlertTriangle size={17} />
            <span>{result.warning} <strong>{result.confidence}</strong></span>
          </aside>
        </>
      )}
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
    ['Development feasibility', Target, report.development_feasibility],
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
  const feasibility = report?.development_feasibility?.data;
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
      {report && <><section className="report-cover"><span>Preliminary Urban Development Assessment</span><h3>{project.name}</h3><p>{String(project.project_type).replaceAll('_', ' ')} · {project.planning_horizon}-year horizon · Generated {new Date(report.generated_at).toLocaleDateString()}</p><small>{report.data_notice}</small><small>{report.assessment_notice}</small></section><div className="report-readiness-grid">{readiness.map(([label, Icon, section]) => <section key={label}><Icon size={19} /><div><span>{label}</span><strong className={section?.status === 'READY' ? 'ready' : 'unavailable'}>{section?.status === 'READY' ? 'Ready' : 'Unavailable'}</strong><small>{section?.status === 'READY' ? 'Included in this project report' : section?.reason ?? 'Not included in this report version.'}</small></div></section>)}</div><div className="print-report-body">
        <section><h3>1. Project Overview</h3><dl className="report-facts"><div><dt>Project type</dt><dd>{overview.project_type.replaceAll('_', ' ')}</dd></div><div><dt>Area</dt><dd>{number(overview.area_acres)} acres</dd></div><div><dt>Planning horizon</dt><dd>{overview.planning_horizon} years</dd></div><div><dt>Population</dt><dd>{number(overview.population.current ?? overview.population.expected)} · {overview.population.current ? overview.population.current_data_type : overview.population.expected_data_type}</dd></div></dl><p>{overview.description}</p></section>
        <section><h3>2. Development Feasibility</h3>{feasibility ? <><dl className="report-facts"><div><dt>Planning readiness</dt><dd>{feasibility.planning_readiness.score == null ? 'Data unavailable' : `${feasibility.planning_readiness.score}/100`}</dd></div><div><dt>Readiness band</dt><dd>{String(feasibility.planning_readiness.band).replaceAll('_', ' ')}</dd></div><div><dt>Infrastructure gap</dt><dd>{feasibility.site_overview.infrastructure_gap_percent == null ? 'Data unavailable' : `${feasibility.site_overview.infrastructure_gap_percent}%`}</dd></div><div><dt>Available-evidence risk</dt><dd>{String(feasibility.site_overview.risk_level).replaceAll('_', ' ')}</dd></div></dl><ul>{feasibility.findings.map((finding) => <li key={`${finding.type}-${finding.title}`}><b>{finding.type}:</b> {finding.title} — {finding.detail}</li>)}</ul><p>{feasibility.decision_notice}</p></> : <p>Development feasibility unavailable.</p>}</section>
        <section><h3>3. Growth Prediction</h3>{growth ? <><p>{growth.projection_label} · {growth.confidence}. This is not an official forecast.</p><table><thead><tr><th>Horizon</th><th>Population</th><th>Households</th><th>Label</th></tr></thead><tbody>{growth.scenarios.map((scenario) => <tr key={scenario.year}><td>{scenario.year} years</td><td>{number(scenario.population)}</td><td>{number(scenario.households)}</td><td>{scenario.data_type}</td></tr>)}</tbody></table></> : <p>Data unavailable.</p>}</section>
        <section><h3>4. Risk Detection</h3>{risks?.risks?.length ? <table><thead><tr><th>Risk</th><th>Severity</th><th>Score</th><th>Evidence</th></tr></thead><tbody>{risks.risks.map((risk) => <tr key={risk.risk_type}><td>{risk.label}</td><td>{risk.severity}</td><td>{risk.score}/100</td><td>{risk.evidence.missing} {risk.evidence.unit} missing</td></tr>)}</tbody></table> : <p>No supported risk score is available.</p>}<p>{risks?.unavailable_risks?.map(({ risk_type }) => risk_type.replaceAll('_', ' ')).join(', ')}: data unavailable.</p></section>
        <section><h3>5. Infrastructure Gaps & Recommendations</h3>{gaps ? <table><thead><tr><th>Priority</th><th>Category</th><th>Gap</th><th>Missing</th></tr></thead><tbody>{gaps.priority_areas.slice(0, 8).map((item) => <tr key={item.key}><td>{item.rank}</td><td>{item.category}</td><td>{item.gap_percent}%</td><td>{item.missing} {item.unit}</td></tr>)}</tbody></table> : <p>Gap analysis unavailable.</p>}{recommendations.length ? <ol>{recommendations.slice(0, 8).map((item) => <li key={item.recommendation_id}>{item.title} — score {item.recommendation_score}/100 ({item.priority})</li>)}</ol> : <p>No project recommendations have been generated.</p>}</section>
        <section><h3>6. Development Phases & Existing Budget Information</h3>{phases.length ? <ol>{phases.map((phase) => <li key={phase.id}>{phase.name}: years {phase.start_year}–{phase.end_year} ({phase.status})</li>)}</ol> : <p>No development phases are saved.</p>}{budgets.length ? <p>{budgets.length} existing saved Budget Optimizer scenario{budgets.length === 1 ? '' : 's'} included. No budget calculation was performed by this report.</p> : <p>No existing saved Budget Optimizer result is available.</p>}</section>
        <section><h3>7. Assumptions & Data Provenance</h3>{growth?.assumptions?.map((item) => <p key={item}>{item}</p>)}{growth?.data_sources?.map((item) => <p key={item.dataset}><b>{item.dataset}:</b> {item.source ?? 'Data unavailable'} ({item.data_type})</p>)}</section>
        <section><h3>8. AI Explanation</h3><p>{report.ai_summary.data?.text ?? report.ai_summary.reason}</p></section>
      </div></>}
    </article>
  );
}

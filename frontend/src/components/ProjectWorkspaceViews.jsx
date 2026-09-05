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

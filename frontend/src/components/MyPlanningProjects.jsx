import React from 'react';

export function MyPlanningProjects({ cities = [], error, loading, onDelete, onLogout, onOpen, onSave, projects = [], user }) {
	return (
		<div className="my-planning-projects">
			<header className="panel-header">
				<h2>My Planning Projects</h2>
				<div style={{display:'flex',gap:8}}>
					<button onClick={onLogout}>Logout</button>
				</div>
			</header>

			{loading && <div className="state-card">Loading projects…</div>}
			{error && <div className="state-card error">{error}</div>}

			<div className="projects-list">
				{projects.length === 0 && !loading && <div className="empty">No projects yet.</div>}
				{projects.map((p) => (
					<div key={p.id || p.tempId} className="project-row panel">
						<div style={{flex:1}}>
							<strong>{p.name || 'Untitled'}</strong>
							<div className="meta">City: {cities.find(c=>c.id===p.city_id)?.name ?? p.city_id ?? '—'}</div>
						</div>
						<div style={{display:'flex',gap:8}}>
							<button onClick={() => onOpen?.(p)}>Open</button>
							<button onClick={() => onSave?.(p.id, p)}>Save</button>
							<button onClick={() => onDelete?.(p.id)}>Delete</button>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

export default null;

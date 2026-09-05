import { useState } from 'react';
import { ArrowRight, Building2, CalendarRange, MapPinned, Pencil, Plus, Trash2 } from 'lucide-react';
import { PlanningProjectWizard } from './PlanningProjectWizard.jsx';

const typeLabels = {
  NEW_DEVELOPMENT: 'New Development',
  EXISTING_AREA: 'Existing Area',
  REDEVELOPMENT: 'Redevelopment',
  URBAN_EXPANSION: 'Urban Expansion',
};

function ProjectCard({ project, onDelete, onEdit, onOpen }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const population = project.current_population ?? project.expected_population;
  return (
    <article className="planning-project-card">
      <div className="planning-project-card-top">
        <span className={`project-type ${project.project_type.toLowerCase()}`}>{typeLabels[project.project_type]}</span>
        <span>{project.status}</span>
      </div>
      <h2>{project.name}</h2>
      <p>{project.planning_stage}</p>
      <dl>
        <div><dt><MapPinned size={14} />Planning area</dt><dd>{project.area_acres ? `${Number(project.area_acres).toLocaleString()} acres` : 'Boundary pending'}</dd></div>
        <div><dt><Building2 size={14} />{project.current_population ? 'Current population' : 'Expected population'}</dt><dd>{population ? Number(population).toLocaleString() : 'Not defined'}</dd></div>
        <div><dt><CalendarRange size={14} />Planning horizon</dt><dd>{project.planning_horizon} years</dd></div>
      </dl>
      <div className="project-progress"><div><span>Workspace progress</span><strong>{Number(project.progress_percent)}%</strong></div><div><i style={{ width: `${project.progress_percent}%` }} /></div></div>
      <div className="project-card-footer"><span>Health score <strong>{project.health_score ?? '--'}</strong></span><div className="project-card-actions"><button aria-label={`Edit ${project.name}`} onClick={() => onEdit(project)} type="button"><Pencil size={13} /></button><button aria-label={`Delete ${project.name}`} className="delete" onClick={() => setConfirmDelete(true)} type="button"><Trash2 size={13} /></button><button onClick={() => onOpen(project)} type="button">Open workspace <ArrowRight size={14} /></button></div></div>
      {confirmDelete && <div className="project-delete-confirm"><p>Delete this planning project and its saved boundary?</p><div><button onClick={() => setConfirmDelete(false)} type="button">Cancel</button><button className="danger" onClick={() => onDelete(project.id)} type="button">Delete project</button></div></div>}
    </article>
  );
}

export function MyPlanningProjects({ cities, projects, loading, error, onDelete, onLogout, onOpen, onSave, user }) {
  const [editor, setEditor] = useState(undefined);
  const save = async (payload) => {
    await onSave(editor?.id, payload);
    setEditor(undefined);
  };
  return (
    <main className="project-library">
      <header className="project-library-topbar"><div className="brand"><span className="brand-mark"><Building2 size={20} /></span><div><strong>CITYMIND</strong><small>Planning Workspace</small></div></div><div className="project-account"><span><strong>{user?.name ?? 'CityMind Planner'}</strong><small>{user?.email ?? 'Private workspace'}</small></span><span className="avatar">{(user?.name ?? 'CM').split(' ').map((part) => part[0]).slice(0, 2).join('')}</span>{onLogout && <button onClick={onLogout} type="button">Sign out</button>}</div></header>
      <section className="project-library-heading"><div><p className="eyebrow">Private planning portfolio</p><h1>My Planning Projects</h1><p>Create or open a development area to analyze conditions and compare evidence-based planning options.</p></div><button className="future-create-button" onClick={() => setEditor(null)} type="button"><Plus size={15} />Create New Planning Project</button></section>
      {loading && <div className="project-library-state"><span className="loader" /><p>Loading planning projects…</p></div>}
      {error && <div className="project-library-state error"><p>{error}</p></div>}
      {!loading && !error && projects.length === 0 && <div className="project-library-state"><MapPinned size={25} /><p>No planning projects yet. Create the first workspace.</p></div>}
      {!loading && !error && <div className="planning-project-grid">{projects.map((project) => <ProjectCard key={project.id} onDelete={onDelete} onEdit={setEditor} onOpen={onOpen} project={project} />)}</div>}
      {editor !== undefined && <PlanningProjectWizard cities={cities} onCancel={() => setEditor(undefined)} onSave={save} project={editor} />}
    </main>
  );
}

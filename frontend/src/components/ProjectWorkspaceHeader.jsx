import {
  Activity, BarChart3, Building2, CalendarRange, FileText, HeartPulse, Layers3, Map, MapPinned,
  Pencil, PieChart, Printer, Route, Sparkles, WalletCards,
} from 'lucide-react';

const navigation = [
  ['overview', PieChart, 'Overview'],
  ['gis', Map, 'GIS Planning'],
  ['blocks', MapPinned, 'Blocks'],
  ['roads', Route, 'Road Network'],
  ['landuse', Layers3, 'Land Use'],
  ['facilities', Building2, 'Facilities'],
  ['gaps', Activity, 'Gap Analysis'],
  ['recommendations', Sparkles, 'Recommendations'],
  ['health', HeartPulse, 'Urban Health'],
  ['future', BarChart3, 'Future Planning'],
  ['budget', WalletCards, 'Budget'],
  ['reports', FileText, 'Reports'],
];

const projectTypeLabel = (value) => String(value ?? '').replaceAll('_', ' ');

export function ProjectWorkspaceHeader({ active, onBack, onEdit, onExport, onLogout, onNavigate, project, user }) {
  const area = project.area?.area_acres ?? project.area_acres;
  return (
    <>
      <header className="workspace-header">
        <div className="workspace-header-main">
          <button className="workspace-back" onClick={onBack} type="button">← Projects</button>
          <div className="workspace-project-identity">
            <p>Active planning project</p>
            <h1>{project.name}</h1>
            <div>
              <span><MapPinned size={13} />{projectTypeLabel(project.project_type)}</span>
              <span>{area ? `${Number(area).toLocaleString()} acres` : 'Area pending'}</span>
              <span><CalendarRange size={13} />{project.planning_horizon}-Year Planning Horizon</span>
            </div>
          </div>
          <div className="workspace-header-actions">
            {user && <span className="workspace-user">{user.name}</span>}
            <button onClick={onEdit} type="button"><Pencil size={14} />Edit Project</button>
            <button className="primary" onClick={onExport} type="button"><Printer size={14} />Export Report</button>
            {onLogout && <button onClick={onLogout} type="button">Sign out</button>}
          </div>
        </div>
      </header>
      <nav aria-label="Planning workspace" className="workspace-navigation">
        {navigation.map(([id, Icon, label]) => (
          <button aria-current={active === id ? 'page' : undefined} className={active === id ? 'active' : ''} key={id} onClick={() => onNavigate(id)} type="button">
            <Icon size={15} />{label}
          </button>
        ))}
      </nav>
    </>
  );
}

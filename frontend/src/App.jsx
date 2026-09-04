import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import {
  createPlanningProject, deletePlanningProject, getCities, getPlanningProjects,
  getProjectGapAnalysis, updatePlanningProject, getAuthToken, getCurrentUser, setAuthToken,
} from './api/client.js';
import { useCityDashboard } from './hooks/useCityDashboard.js';
import { UrbanGapAnalysis } from './components/UrbanGapAnalysis.jsx';
import { ProjectGISCanvas } from './components/ProjectGISCanvas.jsx';
import { SmartRecommendationEngine } from './components/SmartRecommendationEngine.jsx';
import { MyPlanningProjects } from './components/MyPlanningProjects.jsx';
import { PlanningProjectWizard } from './components/PlanningProjectWizard.jsx';
import { ProjectWorkspaceHeader } from './components/ProjectWorkspaceHeader.jsx';
import {
  BudgetWorkspaceView, FuturePlanningView, ProjectMetrics, ProjectOverview,
  ReportsWorkspaceView,
} from './components/ProjectWorkspaceViews.jsx';
import { downloadProjectReport } from './utils/projectReport.js';
import { LoginScreen } from './components/LoginScreen.jsx';
import { ProjectAssetView } from './components/ProjectAssetView.jsx';
import { ProjectBlockHealthDashboard } from './components/ProjectBlockHealthDashboard.jsx';

function CityMindWorkspace({ onLogout, user }) {
  const [cities, setCities] = useState([]);
  const [cityId, setCityId] = useState(1);
  const [active, setActive] = useState('overview');
  const [projects, setProjects] = useState([]);
  const [projectsState, setProjectsState] = useState({ loading: true, error: '' });
  const [planningProject, setPlanningProject] = useState(null);
  const [editingProject, setEditingProject] = useState(false);
  const [projectGapAnalysis, setProjectGapAnalysis] = useState(null);
  const [recommendationResult, setRecommendationResult] = useState(null);
  const [mapFocus, setMapFocus] = useState(null);
  const { data, loading, error } = useCityDashboard(cityId);

  useEffect(() => { getCities().then((items) => { setCities(items); if (items[0]) setCityId(items[0].id); }).catch(() => {}); }, []);
  useEffect(() => {
    getPlanningProjects()
      .then((items) => { setProjects(items); setProjectsState({ loading: false, error: '' }); })
      .catch((requestError) => setProjectsState({ loading: false, error: requestError.response?.data?.error?.message ?? 'Planning projects are unavailable' }));
  }, []);
  useEffect(() => {
    if (!planningProject?.id) return undefined;
    let current = true;
    setProjectGapAnalysis(null);
    getProjectGapAnalysis(planningProject.id)
      .then((result) => { if (current) setProjectGapAnalysis(result); })
      .catch(() => {});
    return () => { current = false; };
  }, [planningProject?.id]);
  useEffect(() => {
    if (!planningProject?.id) return undefined;
    const refresh = (event) => {
      if (Number(event.detail?.projectId) !== Number(planningProject.id)) return;
      setRecommendationResult(null);
      getProjectGapAnalysis(planningProject.id).then(setProjectGapAnalysis).catch(() => {});
    };
    window.addEventListener('citymind:plan-updated', refresh);
    return () => window.removeEventListener('citymind:plan-updated', refresh);
  }, [planningProject?.id]);
  useEffect(() => {
    const showRecommendation = (event) => {
      setMapFocus({ type: 'recommendation', ...event.detail, key: Date.now() });
      setActive('gis');
    };
    const showGap = (event) => {
      setMapFocus({ type: 'gap', ...event.detail, key: Date.now() });
      setActive('gis');
    };
    window.addEventListener('citymind:focus-ward', showRecommendation);
    window.addEventListener('citymind:focus-gap-area', showGap);
    return () => {
      window.removeEventListener('citymind:focus-ward', showRecommendation);
      window.removeEventListener('citymind:focus-gap-area', showGap);
    };
  }, []);
  const navigate = (id) => { setActive(id); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const openProject = (project) => {
    setPlanningProject(project);
    if (project.city_id) setCityId(project.city_id);
    setProjectGapAnalysis(null);
    setRecommendationResult(null);
    setMapFocus(null);
    setActive('overview');
    window.scrollTo({ top: 0 });
  };
  const saveProject = async (projectId, payload) => {
    const saved = projectId
      ? await updatePlanningProject(projectId, payload)
      : await createPlanningProject(payload);
    setProjects((current) => projectId
      ? current.map((project) => project.id === projectId ? saved : project)
      : [saved, ...current]);
  };
  const removeProject = async (projectId) => {
    await deletePlanningProject(projectId);
    setProjects((current) => current.filter(({ id }) => id !== projectId));
  };
  const updateActiveProject = async (payload) => {
    const saved = await updatePlanningProject(planningProject.id, payload);
    setPlanningProject(saved);
    setProjects((current) => current.map((project) => project.id === saved.id ? saved : project));
    return saved;
  };
  const editActiveProject = async (payload) => {
    await updateActiveProject(payload);
    setEditingProject(false);
  };
  const exportReport = () => {
    downloadProjectReport({ gapAnalysis: projectGapAnalysis, project: planningProject, recommendationResult });
  };

  if (!planningProject) {
    return <MyPlanningProjects cities={cities} error={projectsState.error} loading={projectsState.loading} onDelete={removeProject} onLogout={onLogout} onOpen={openProject} onSave={saveProject} projects={projects} user={user} />;
  }

  return (
    <div className="planning-workspace-shell">
      <ProjectWorkspaceHeader active={active} onBack={() => setPlanningProject(null)} onEdit={() => setEditingProject(true)} onExport={exportReport} onLogout={onLogout} onNavigate={navigate} project={planningProject} user={user} />
      <main className="planning-workspace-main">
        {loading && <div className="state-card"><span className="loader" /><h2>Building the project workspace</h2><p>Combining boundary, infrastructure, population, and environmental indicators…</p></div>}
        {error && <div className="state-card error"><AlertTriangle /><h2>Project evidence is unavailable</h2><p>{error}. Confirm that MySQL and the API server are running.</p></div>}
        {data && <>
          <ProjectMetrics dashboard={data} gapAnalysis={projectGapAnalysis} project={planningProject} />
          <section className="workspace-active-view" id={active}>
            {active === 'overview' && <ProjectOverview dashboard={data} gapAnalysis={projectGapAnalysis} onNavigate={navigate} project={planningProject} recommendationResult={recommendationResult} />}
            {active === 'gis' && <ProjectGISCanvas focusRequest={mapFocus} gapAnalysis={projectGapAnalysis} mapData={data.map} onUpdateProject={updateActiveProject} planningProject={planningProject} />}
            {['blocks', 'roads', 'landuse', 'facilities'].includes(active) && <ProjectAssetView module={active} onNavigate={navigate} project={planningProject} />}
            {active === 'gaps' && <UrbanGapAnalysis initialAnalysis={projectGapAnalysis} onAnalysis={setProjectGapAnalysis} planningProject={planningProject} planningProjectId={planningProject.id} />}
            {active === 'recommendations' && <SmartRecommendationEngine cityId={cityId} initialResult={recommendationResult} onResult={setRecommendationResult} planningProject={planningProject} planningProjectId={planningProject.id} />}
            {active === 'health' && <ProjectBlockHealthDashboard onNavigate={navigate} planningProject={planningProject} />}
            {active === 'future' && <FuturePlanningView dashboard={data} project={planningProject} />}
            {active === 'budget' && <BudgetWorkspaceView project={planningProject} />}
            {active === 'reports' && <ReportsWorkspaceView gapAnalysis={projectGapAnalysis} onExport={exportReport} onPrint={() => window.print()} project={planningProject} recommendationResult={recommendationResult} />}
          </section>
        </>}
        <footer>CityMind Planning Workspace · Evidence informs options; the planner decides.</footer>
      </main>
      {editingProject && <PlanningProjectWizard cities={cities} onCancel={() => setEditingProject(false)} onSave={editActiveProject} project={planningProject} />}
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState({ loading: Boolean(getAuthToken()), user: null });

  useEffect(() => {
    if (!getAuthToken()) return;
    getCurrentUser()
      .then((user) => setSession({ loading: false, user }))
      .catch(() => { setAuthToken(null); setSession({ loading: false, user: null }); });
  }, []);

  if (session.loading) return <div className="auth-loading"><span className="loader" /><p>Restoring your planning workspace…</p></div>;
  if (!session.user) return <LoginScreen onAuthenticated={(user) => setSession({ loading: false, user })} />;
  return <CityMindWorkspace onLogout={() => { setAuthToken(null); setSession({ loading: false, user: null }); }} user={session.user} />;
}

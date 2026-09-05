import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import { ProjectWorkspaceHeader } from './ProjectWorkspaceHeader.jsx';
import { BudgetWorkspaceView, FuturePlanningView, ProjectMetrics, ProjectOverview } from './ProjectWorkspaceViews.jsx';
import { simulateProjectBudget } from '../api/client.js';

vi.mock('../api/client.js', () => ({ simulateProjectBudget: vi.fn() }));

vi.mock('react-leaflet', () => ({
  CircleMarker: ({ children }) => <>{children}</>,
  MapContainer: ({ children }) => <div data-testid="project-map-preview">{children}</div>,
  Polygon: () => null,
  TileLayer: () => null,
  Tooltip: ({ children }) => <>{children}</>,
  useMap: () => ({ fitBounds: vi.fn() }),
}));

const project = {
  id: 1, name: 'Bashundhara Residential Area', project_type: 'NEW_DEVELOPMENT',
  planning_horizon: 20, expected_population: 85000, progress_percent: 32,
  planning_stage: 'Master Planning', status: 'active', health_score: null,
  area: {
    area_acres: 500,
    boundary_geojson: { type: 'Polygon', coordinates: [[[90.4, 23.8], [90.41, 23.8], [90.41, 23.81], [90.4, 23.8]]] },
  },
};

const dashboard = {
  overview: { health: { overallScore: 61 }, wardCount: 4 },
  map: {
    city: { latitude: 23.8, longitude: 90.4 },
    wards: [{ growth_rate: 2 }, { growth_rate: 4 }],
    facilities: [{ id: 1, name: 'Clinic', latitude: 23.805, longitude: 90.405 }],
  },
};

const gapAnalysis = {
  overview: { overall_gap_percent: 72 },
  priority_areas: [{ rank: 1, key: 'hospital', category: 'Healthcare', gap_percent: 80 }],
};

test('workspace header exposes all planning areas and actions', async () => {
  const user = userEvent.setup();
  const onNavigate = vi.fn();
  render(<ProjectWorkspaceHeader active="overview" onBack={vi.fn()} onEdit={vi.fn()} onExport={vi.fn()} onNavigate={onNavigate} project={project} />);
  expect(screen.getByRole('heading', { name: project.name })).toBeInTheDocument();
  expect(screen.getByText('500 acres')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'GIS Planning' }));
  expect(onNavigate).toHaveBeenCalledWith('gis');
  expect(screen.getByRole('button', { name: 'Reports' })).toBeInTheDocument();
});

test('overview uses project evidence and opens the working views', async () => {
  const user = userEvent.setup();
  const onNavigate = vi.fn();
  render(<><ProjectMetrics dashboard={dashboard} gapAnalysis={gapAnalysis} project={project} /><ProjectOverview dashboard={dashboard} gapAnalysis={gapAnalysis} onNavigate={onNavigate} project={project} recommendationResult={null} /></>);
  expect(screen.getByText('Infrastructure Gap').closest('article')).toHaveTextContent('72%');
  expect(screen.getByText('No project recommendation run yet.')).toBeInTheDocument();
  expect(screen.getByTestId('project-map-preview')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: /Analyze candidate sites/ }));
  expect(onNavigate).toHaveBeenCalledWith('recommendations');
});

test('existing-area metrics use measured current population instead of the future scenario', () => {
  const existingProject = {
    ...project, project_type: 'EXISTING_AREA', current_population: 42600,
    expected_population: 58000,
  };
  render(<ProjectMetrics dashboard={dashboard} gapAnalysis={gapAnalysis} project={existingProject} />);
  const populationCard = screen.getByText('Current Population').closest('article');
  expect(populationCard).toHaveTextContent('42,600');
  expect(populationCard).not.toHaveTextContent('58,000');
});

test('future planning labels calculated scenarios as simulations', () => {
  render(<FuturePlanningView dashboard={dashboard} project={project} />);
  expect(screen.getByText('5-year scenario')).toBeInTheDocument();
  expect(screen.getByText('30-year scenario')).toBeInTheDocument();
  expect(screen.getAllByText('SIMULATED')).toHaveLength(1);
  expect(screen.getAllByText('85,000')).toHaveLength(2);
  expect(screen.getByText(/not forecasts/i)).toBeInTheDocument();
});

test('budget workspace runs and labels a saved planning-assumption scenario', async () => {
  simulateProjectBudget.mockResolvedValue({
    summary: { allocated: 100000000, remaining: 150000000, funded_packages: 1, deferred_packages: 1 },
    selected: [{ category: 'HOSPITAL', label: 'Healthcare', units: 1, priority: 'CRITICAL', estimated_cost: 100000000 }],
    deferred: [{ category: 'SCHOOL', label: 'Education', units: 2, priority: 'HIGH', estimated_cost: 140000000, reason: 'Exceeds remaining budget.' }],
    warning: 'Costs are planning assumptions, not tenders.', confidence: 'PLANNING_ASSUMPTION',
  });
  const user = userEvent.setup();
  render(<BudgetWorkspaceView project={project} />);
  await user.click(screen.getByRole('button', { name: 'Run Budget Simulation' }));
  expect(simulateProjectBudget).toHaveBeenCalledWith(1, expect.objectContaining({ scenarioType: 'BALANCED', saveScenario: true }));
  expect((await screen.findAllByText('BDT 100,000,000')).length).toBeGreaterThan(0);
  expect(screen.getByText('PLANNING_ASSUMPTION')).toBeInTheDocument();
});

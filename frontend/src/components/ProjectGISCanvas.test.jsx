import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test, vi } from 'vitest';
import {
  acceptEvaluatedProjectLocation, createPlanningFeature, evaluateProjectLocation, getPlanningFeatures,
  updatePlanningFeature,
} from '../api/client.js';
import { ProjectGISCanvas } from './ProjectGISCanvas.jsx';

const mapEvents = vi.hoisted(() => ({ click: null, featureClick: null }));
vi.mock('react-leaflet', () => ({
  MapContainer: ({ center, children }) => <div data-center={JSON.stringify(center)} data-testid="planning-map">{children}</div>,
  Marker: ({ children, eventHandlers }) => { if (eventHandlers?.click) mapEvents.featureClick = eventHandlers.click; return <div>{children}</div>; },
  Polygon: ({ children, eventHandlers }) => { if (eventHandlers?.click) mapEvents.featureClick = eventHandlers.click; return <div>{children}</div>; },
  Polyline: ({ children, eventHandlers }) => { if (eventHandlers?.click) mapEvents.featureClick = eventHandlers.click; return <div>{children}</div>; }, Popup: ({ children }) => <div>{children}</div>,
  TileLayer: () => null, Tooltip: ({ children }) => <span>{children}</span>,
  useMap: () => ({ flyTo: vi.fn(), fitBounds: vi.fn() }),
  useMapEvents: (events) => { mapEvents.click = events.click; return {}; },
}));
vi.mock('./map/FacilityMarkers.jsx', () => ({
  FacilityMarkers: ({ facilities }) => <span>{facilities.length} existing facilities loaded</span>,
}));
vi.mock('./map/WardLayer.jsx', () => ({ WardLayer: ({ wards }) => <span>{wards.length} context zones loaded</span> }));
vi.mock('../api/client.js', () => ({
  getPlanningFeatures: vi.fn(), createPlanningFeature: vi.fn(), deletePlanningFeature: vi.fn(),
  evaluateProjectLocation: vi.fn(), acceptEvaluatedProjectLocation: vi.fn(), getProjectValidation: vi.fn(),
  updatePlanningFeature: vi.fn(),
}));

const boundary = { type: 'Polygon', coordinates: [[[90.42, 23.785], [90.435, 23.785], [90.435, 23.797], [90.42, 23.797], [90.42, 23.785]]] };
const project = {
  id: 1, city_id: 1, name: 'Bashundhara Residential Area', description: 'Planning project',
  project_type: 'NEW_DEVELOPMENT', country: 'Bangladesh', region: 'Dhaka', planning_horizon: 20,
  expected_population: 85000, expected_households: 18000, target_density: 170,
  area: { boundary_geojson: boundary, area_acres: 500, area_sq_km: 2.02 },
};
const mapData = {
  city: { id: 1, name: 'Dhaka', latitude: 23.78, longitude: 90.4 },
  wards: [{ id: 1, name: 'Badda', latitude: 23.79, longitude: 90.428, population: 90000, hospitals: 1, schools: 1, parks: 0, road_length_km: 5, air_quality_index: 160, good_road_percent: 40 }],
  facilities: [{ id: 1, type: 'hospital', latitude: 23.79, longitude: 90.428 }],
  roads: [{ id: 1, ward_id: 1, name: 'Existing Road', geometry: [[23.79, 90.428], [23.791, 90.429]] }],
};

beforeEach(() => {
  vi.clearAllMocks();
  mapEvents.featureClick = null;
  getPlanningFeatures.mockResolvedValue([{
    id: 1, planning_project_id: 1, feature_type: 'FACILITY_PROPOSAL', category: 'hospital',
    name: 'Proposed Hospital', geometry: { type: 'Point', coordinates: [90.428, 23.791] }, source: 'citymind',
  }]);
  createPlanningFeature.mockResolvedValue({
    id: 2, planning_project_id: 1, feature_type: 'PLANNING_POINT', category: 'planning',
    name: 'Planning Point 2', geometry: { type: 'Point', coordinates: [90.429, 23.792] }, source: 'planner',
  });
  evaluateProjectLocation.mockResolvedValue({
    selection: { facility_type: 'HOSPITAL', latitude: 23.792, longitude: 90.429 },
    suitability_score: 78, status: 'SUITABLE',
    block: { id: 2, name: 'Block A', population: 26000 },
    factors: { policy_compliance: 100, accessibility: 76, population_need: 87 },
    rules: [{ rule_code: 'PROJECT_BOUNDARY_CONTAINMENT', name: 'Inside saved project boundary', status: 'PASS', message: 'Inside boundary.', source: { name: 'CityMind project geometry validation', rule_type: 'SYSTEM_VALIDATION' } }],
  });
  acceptEvaluatedProjectLocation.mockResolvedValue({
    feature: { id: 3, planning_project_id: 1, feature_type: 'FACILITY_PROPOSAL', category: 'hospital', name: 'Proposed Hospital', geometry: { type: 'Point', coordinates: [90.429, 23.792] }, status: 'approved', source: 'planner' },
  });
  updatePlanningFeature.mockImplementation(async (_projectId, _featureId, input) => ({
    id: 1, planning_project_id: 1, feature_type: input.featureType, category: input.category,
    name: input.name, geometry: input.geometry, properties: input.properties, status: input.status, source: 'planner',
  }));
});

test('loads the boundary, centers the map, toggles layers, and displays existing and proposed data', async () => {
  const user = userEvent.setup();
  render(<ProjectGISCanvas mapData={mapData} onUpdateProject={vi.fn()} planningProject={project} />);
  expect(screen.getByTestId('planning-map')).toHaveAttribute('data-center', JSON.stringify([23.785, 90.42]));
  expect(screen.getByText('1 existing facilities loaded')).toBeInTheDocument();
  expect((await screen.findAllByText('Proposed Hospital')).length).toBeGreaterThan(0);
  expect(screen.getByRole('button', { name: 'Planning Proposals' })).toHaveAttribute('aria-pressed', 'true');
  const hospitals = screen.getByRole('button', { name: 'Hospitals' });
  expect(hospitals).toHaveAttribute('aria-pressed', 'false');
  await user.click(hospitals);
  expect(hospitals).toHaveAttribute('aria-pressed', 'true');
});

test('places a project-owned planning point and shows recommendation evidence', async () => {
  const user = userEvent.setup();
  render(<ProjectGISCanvas mapData={mapData} onUpdateProject={vi.fn()} planningProject={project} />);
  await user.click(screen.getByRole('button', { name: 'Add Planning Point' }));
  await act(async () => mapEvents.click({ latlng: { lat: 23.792, lng: 90.429 } }));
  await waitFor(() => expect(createPlanningFeature).toHaveBeenCalledWith(1, expect.objectContaining({
    featureType: 'PLANNING_POINT', geometry: { type: 'Point', coordinates: [90.429, 23.792] },
  })));
  expect((await screen.findAllByText('Planning Point 2')).length).toBeGreaterThan(0);

  act(() => window.dispatchEvent(new CustomEvent('citymind:focus-ward', { detail: {
    wardId: 1,
    candidate: {
      ward: { id: 1, name: 'Badda' }, recommendation_score: 88, project_type: 'HOSPITAL',
      priority: 'critical', explanation: ['High population need.'], constraints: [],
      candidate_location: { label: 'Candidate Site A', latitude: 23.791, longitude: 90.429 },
      population_need_score: 91, infrastructure_gap_score: 82, accessibility_score: 76,
      future_demand_score: 88,
    },
  } })));
  expect(await screen.findByText('Selected CityMind option')).toBeInTheDocument();
  expect(screen.getByText('High population need.')).toBeInTheDocument();
  expect(screen.getAllByText('Candidate Site A').length).toBeGreaterThan(0);
  expect(screen.getByText(/High air-quality pressure/)).toBeInTheDocument();
});

test('draws a planner-assisted development block inside the project', async () => {
  const user = userEvent.setup();
  render(<ProjectGISCanvas mapData={mapData} onUpdateProject={vi.fn()} planningProject={project} />);
  await user.click(screen.getByRole('button', { name: 'Add Development Block' }));
  await user.clear(screen.getByLabelText('Land suitability (0–100)'));
  await user.type(screen.getByLabelText('Land suitability (0–100)'), '62');
  await user.selectOptions(screen.getByLabelText('Constraint level'), 'HIGH');
  await user.type(screen.getByLabelText('Constraint note'), 'Flood survey required');
  await act(async () => mapEvents.click({ latlng: { lat: 23.789, lng: 90.426 } }));
  await act(async () => mapEvents.click({ latlng: { lat: 23.789, lng: 90.428 } }));
  await act(async () => mapEvents.click({ latlng: { lat: 23.791, lng: 90.428 } }));
  await user.click(screen.getByRole('button', { name: 'Finish' }));
  await waitFor(() => expect(createPlanningFeature).toHaveBeenCalledWith(1, expect.objectContaining({
    featureType: 'BLOCK', category: 'residential', name: 'Block A',
    geometry: { type: 'Polygon', coordinates: [[
      [90.426, 23.789], [90.428, 23.789], [90.428, 23.791], [90.426, 23.789],
    ]] },
    properties: expect.objectContaining({
      populationConfidence: 'PLANNING_ASSUMPTION', landSuitability: 62,
      constraintLevel: 'HIGH', constraintNote: 'Flood survey required',
    }),
  })));
});

test('places a facility when the planner clicks on top of a development block', async () => {
  getPlanningFeatures.mockResolvedValueOnce([{
    id: 8, planning_project_id: 1, feature_type: 'BLOCK', category: 'residential', name: 'Block A', status: 'approved', source: 'planner',
    geometry: { type: 'Polygon', coordinates: [[[90.425, 23.788], [90.43, 23.788], [90.43, 23.794], [90.425, 23.794], [90.425, 23.788]]] },
    properties: { population: 20000 },
  }]);
  const user = userEvent.setup();
  render(<ProjectGISCanvas mapData={mapData} onUpdateProject={vi.fn()} planningProject={project} />);
  await user.click(screen.getByRole('button', { name: 'Add Facility Proposal' }));
  await waitFor(() => expect(mapEvents.featureClick).toBeTypeOf('function'));
  const stopPropagation = vi.fn();
  await act(async () => mapEvents.featureClick({
    latlng: { lat: 23.791, lng: 90.427 }, originalEvent: { stopPropagation },
  }));
  expect(stopPropagation).toHaveBeenCalled();
  await waitFor(() => expect(createPlanningFeature).toHaveBeenCalledWith(1, expect.objectContaining({
    featureType: 'FACILITY_PROPOSAL', category: 'hospital',
    geometry: { type: 'Point', coordinates: [90.427, 23.791] },
  })));
});

test('does not crash when project context has no city features', () => {
  render(<ProjectGISCanvas mapData={{ ...mapData, wards: [], facilities: [], roads: [] }} onUpdateProject={vi.fn()} planningProject={project} />);
  expect(screen.getByTestId('planning-map')).toBeInTheDocument();
  expect(screen.getByText('0 existing facilities loaded')).toBeInTheDocument();
});

test('displays project coverage gaps and focuses a selected gap area', async () => {
  render(<ProjectGISCanvas mapData={mapData} onUpdateProject={vi.fn()} planningProject={project} />);
  const gap = { id: 'HOSPITAL-A', site: 'Candidate Site A', category: 'Healthcare', severity: 'CRITICAL', coordinates: { latitude: 23.791, longitude: 90.429 }, service_distance_km: 4, service_radius_km: 3, reason: 'Nearest service exceeds the benchmark.', confidence: 'ESTIMATED' };
  act(() => window.dispatchEvent(new CustomEvent('citymind:project-gap-analysis', { detail: { critical_areas: [gap] } })));
  act(() => window.dispatchEvent(new CustomEvent('citymind:focus-gap-area', { detail: { area: gap } })));
  expect((await screen.findAllByText(/Candidate Site A/)).length).toBeGreaterThan(0);
  expect((await screen.findAllByText('Nearest service exceeds the benchmark.')).length).toBeGreaterThan(0);
  expect(screen.getByText('ESTIMATED COVERAGE GAP')).toBeInTheDocument();
});

test('evaluates an exact location and only adds it after planner confirmation', async () => {
  const user = userEvent.setup();
  const planUpdated = vi.fn();
  window.addEventListener('citymind:plan-updated', planUpdated);
  render(<ProjectGISCanvas mapData={mapData} onUpdateProject={vi.fn()} planningProject={project} />);
  await user.click(screen.getByRole('button', { name: 'Analyze Exact Location' }));
  await act(async () => mapEvents.click({ latlng: { lat: 23.792, lng: 90.429 } }));
  await waitFor(() => expect(evaluateProjectLocation).toHaveBeenCalledWith(1, {
    facilityType: 'HOSPITAL', latitude: 23.792, longitude: 90.429,
  }));
  expect(await screen.findByText('Exact location assessment')).toBeInTheDocument();
  expect(screen.getByText('Inside saved project boundary')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Add to Master Plan' }));
  await waitFor(() => expect(acceptEvaluatedProjectLocation).toHaveBeenCalledWith(1, expect.objectContaining({
    facilityType: 'HOSPITAL', latitude: 23.792, longitude: 90.429,
  })));
  expect(planUpdated).toHaveBeenCalled();
  window.removeEventListener('citymind:plan-updated', planUpdated);
});

test('approves a proposed item as implemented and triggers recalculation', async () => {
  const user = userEvent.setup();
  render(<ProjectGISCanvas mapData={mapData} onUpdateProject={vi.fn()} planningProject={project} />);
  const approve = await screen.findByRole('button', { name: 'Approve' });
  await user.click(approve);
  await waitFor(() => expect(updatePlanningFeature).toHaveBeenCalledWith(1, 1, expect.objectContaining({
    status: 'approved', featureType: 'FACILITY_PROPOSAL',
  })));
  expect(screen.getByText(/approved and included in all project calculations/i)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
  expect(screen.getByText('Implemented')).toBeInTheDocument();
});

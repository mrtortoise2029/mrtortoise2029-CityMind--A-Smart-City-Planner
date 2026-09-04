import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { getProjectGapAnalysis, getWardAnalysis, runWardAnalysis } from '../api/client.js';
import { UrbanGapAnalysis } from './UrbanGapAnalysis.jsx';

vi.mock('../api/client.js', () => ({
  getProjectGapAnalysis: vi.fn(),
  getWardAnalysis: vi.fn(),
  runWardAnalysis: vi.fn(),
}));

vi.mock('recharts', () => ({
  PolarAngleAxis: () => null,
  PolarGrid: () => null,
  Radar: () => null,
  RadarChart: ({ children }) => <div data-testid="radar-chart">{children}</div>,
  ResponsiveContainer: ({ children }) => <div>{children}</div>,
  Tooltip: () => null,
}));

const wards = [{ id: 1, name: 'Banani' }, { id: 2, name: 'Mohakhali' }];
const result = {
  analysis_id: 7,
  ward: { id: 1, name: 'Banani', ward_code: 'W19' },
  urban_health_score: 58,
  infrastructure_gap_score: 61,
  population_need_score: 47,
  priority_score: 55,
  overall_priority: 'HIGH',
  healthcare_score: 42,
  education_score: 61,
  mobility_score: 75,
  environment_score: 68,
  green_space_score: 54,
  infrastructure_score: 39,
  reasons: ['Healthcare availability is the weakest measured dimension.'],
  evidence: { population: 42100, population_density: 6790, hospitals: 1, schools: 1, parks: 1, road_density: 0.52, air_quality_index: 118, green_cover_percent: 21 },
  data_quality: { completeness_percent: 100, missing_fields: [] },
  scoring_version: '1.0',
};

const projectResult = {
  project: { id: 1, name: 'Bashundhara', project_type: 'NEW_DEVELOPMENT', planning_horizon: 20 },
  population: { value: 85000, projected_value: 85000, planning_horizon: 20, confidence: 'ESTIMATED', projection_confidence: 'SIMULATED' },
  overview: { overall_gap_percent: 78, status: 'CRITICAL', critical_categories: 2, high_categories: 2, mapped_critical_areas: 1 },
  categories: [{ key: 'HOSPITAL', category: 'Healthcare', coverage_percent: 20, gap_percent: 80, gap: 'CRITICAL', required: 11, existing_inside: 1, surrounding_available: 1, missing: 9.65, unit: 'hospitals', service_radius_km: 3, capacity: { required: 213, available: 120, gap: 93, overloaded_facilities: 1 }, confidence: { existing_supply: 'MEASURED', required_supply: 'ESTIMATED', future_gap: 'SIMULATED' } }],
  critical_areas: [{ id: 'HOSPITAL-A', site: 'Candidate Site A', category: 'Healthcare', severity: 'CRITICAL', coordinates: { latitude: 23.79, longitude: 90.42 }, service_distance_km: 4, service_radius_km: 3, reason: 'Nearest service exceeds the benchmark.', confidence: 'ESTIMATED' }],
  priority_areas: [{ rank: 1, key: 'HOSPITAL', category: 'Healthcare', missing: 9.65, unit: 'hospitals', gap_percent: 80 }],
  methodology: { version: '1.0', surrounding_asset_contribution: 0.35 },
  planned_scenario: {
    confidence: 'SIMULATED',
    overview: { overall_gap_percent: 60 },
    gap_change: 18,
    categories: [{ key: 'HOSPITAL', category: 'Healthcare', coverage_percent: 55, gap_percent: 45 }],
  },
};

describe('UrbanGapAnalysis', () => {
  beforeEach(() => vi.clearAllMocks());

  test('renders persisted deterministic scores and reasons', async () => {
    getWardAnalysis.mockResolvedValue(result);
    render(<UrbanGapAnalysis cityId={1} wards={wards} />);
    expect(await screen.findByText('Why this area needs attention')).toBeInTheDocument();
    expect(screen.getByText('Healthcare availability is the weakest measured dimension.')).toBeInTheDocument();
    expect(screen.getAllByText('HIGH')).toHaveLength(2);
    expect(screen.getByLabelText('Urban health: 58 out of 100')).toBeInTheDocument();
  });

  test('creates an analysis when the ward has no saved result', async () => {
    getWardAnalysis.mockRejectedValue({ response: { data: { error: { code: 'ANALYSIS_NOT_FOUND' } } } });
    runWardAnalysis.mockResolvedValue(result);
    render(<UrbanGapAnalysis cityId={1} wards={wards} />);
    await waitFor(() => expect(runWardAnalysis).toHaveBeenCalledWith(1));
    expect(await screen.findByText('Why this area needs attention')).toBeInTheDocument();
    expect(screen.getAllByText('Banani').length).toBeGreaterThan(0);
  });

  test('changes ward and can recalculate the selected analysis', async () => {
    const user = userEvent.setup();
    getWardAnalysis.mockResolvedValue(result);
    runWardAnalysis.mockResolvedValue({ ...result, analysis_id: 8 });
    render(<UrbanGapAnalysis cityId={1} wards={wards} />);
    await screen.findByText('Why this area needs attention');
    await user.selectOptions(screen.getByLabelText('Select ward'), '2');
    await waitFor(() => expect(getWardAnalysis).toHaveBeenCalledWith(2));
    await user.click(screen.getByRole('button', { name: 'Recalculate analysis' }));
    expect(runWardAnalysis).toHaveBeenCalledWith(2);
  });

  test('renders project coverage and connects a critical area to the GIS map', async () => {
    const user = userEvent.setup();
    const focusListener = vi.fn();
    window.addEventListener('citymind:focus-gap-area', focusListener);
    getProjectGapAnalysis.mockResolvedValue(projectResult);
    render(<div><section id="map" /><UrbanGapAnalysis planningProject={{ name: 'Bashundhara', project_type: 'NEW_DEVELOPMENT' }} planningProjectId={1} /></div>);
    expect(await screen.findByText('What does this planning area currently need?')).toBeInTheDocument();
    expect(screen.getByLabelText('Healthcare: 20% coverage')).toBeInTheDocument();
    expect(screen.getAllByText('ESTIMATED').length).toBeGreaterThan(0);
    expect(screen.getAllByText('SIMULATED').length).toBeGreaterThan(0);
    expect(screen.getByText('55% if proposals are implemented')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'View on map' }));
    expect(focusListener.mock.calls[0][0].detail.area.site).toBe('Candidate Site A');
    window.removeEventListener('citymind:focus-gap-area', focusListener);
  });
});

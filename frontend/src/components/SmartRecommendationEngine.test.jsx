import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { createProjectRecommendations, createRecommendations } from '../api/client.js';
import { SmartRecommendationEngine } from './SmartRecommendationEngine.jsx';

vi.mock('../api/client.js', () => ({ createRecommendations: vi.fn(), createProjectRecommendations: vi.fn() }));

const candidate = (id, name, rank, score) => ({
  recommendation_id: id, rank, ward: { id, name, ward_code: `W${id}` }, project_type: 'HOSPITAL',
  recommendation_score: score, priority: rank === 1 ? 'critical' : 'high',
  population_need_score: 90 - rank, infrastructure_gap_score: 80 - rank,
  accessibility_score: 60 + rank, future_demand_score: 70 + rank, existing_coverage_score: 85 - rank,
  estimated_cost: 120000000 + rank, expected_population_served: 35000 + rank,
  candidate_location: {
    label: `Candidate Site ${String.fromCharCode(64 + rank)}`,
    latitude: 23.79 + rank / 1000, longitude: 90.42 + rank / 1000,
    geometry: { type: 'Point', coordinates: [90.42 + rank / 1000, 23.79 + rank / 1000] },
  },
  project_evidence: { population_coverage_score: 90 - rank, land_suitability_score: 80 - rank },
  constraints: [],
  explanation: [`${name} has strong deterministic need.`, 'Coverage is below the planning benchmark.'],
});
const response = {
  request: { projectType: 'HOSPITAL', budget: 150000000, planningHorizon: 5 },
  spatial_context: {
    approved_assets_considered: 2,
    proposed_assets_considered: 3,
    proposal_coverage_weight: 0.65,
  },
  recommendations: [candidate(7, 'Ward 7', 1, 94), candidate(4, 'Ward 4', 2, 87)],
};

describe('SmartRecommendationEngine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createRecommendations.mockResolvedValue(response);
    createProjectRecommendations.mockResolvedValue(response);
    Element.prototype.scrollIntoView = vi.fn();
  });

  test('submits the planning scenario and renders ranked candidates', async () => {
    const user = userEvent.setup();
    render(<div><section id="map" /><SmartRecommendationEngine cityId={1} /></div>);
    await user.click(screen.getByRole('button', { name: 'Analyze Locations' }));
    await waitFor(() => expect(createRecommendations).toHaveBeenCalledWith({ projectType: 'HOSPITAL', budget: 150000000, planningHorizon: 5, cityId: 1 }));
    expect(await screen.findByText('Highest-suitability planning option')).toBeInTheDocument();
    expect(screen.getByRole('table', { name: 'Candidate site comparison' })).toBeInTheDocument();
    expect(screen.getByText('Why this location?')).toBeInTheDocument();
  });

  test('supports candidate comparison and map focus', async () => {
    const user = userEvent.setup();
    const focusListener = vi.fn();
    window.addEventListener('citymind:focus-ward', focusListener);
    render(<div><section id="map" /><SmartRecommendationEngine cityId={1} /></div>);
    await user.click(screen.getByRole('button', { name: 'Analyze Locations' }));
    const compareButtons = await screen.findAllByRole('button', { name: 'Compare' });
    expect(compareButtons[0]).toHaveAttribute('aria-pressed', 'true');
    await user.click(compareButtons[0]);
    expect(compareButtons[0]).toHaveAttribute('aria-pressed', 'false');
    const mapButtons = screen.getAllByRole('button', { name: 'View on Map' });
    await user.click(mapButtons[1]);
    expect(focusListener).toHaveBeenCalled();
    expect(focusListener.mock.calls[0][0].detail.wardId).toBe(4);
    expect(focusListener.mock.calls[0][0].detail.candidate.candidate_location.label).toBe('Candidate Site B');
    window.removeEventListener('citymind:focus-ward', focusListener);
  });

  test('renders a safe no-candidate state', async () => {
    const user = userEvent.setup();
    createRecommendations.mockResolvedValue({ request: response.request, recommendations: [], message: 'No candidate wards fit the available budget.' });
    render(<SmartRecommendationEngine cityId={1} />);
    await user.click(screen.getByRole('button', { name: 'Analyze Locations' }));
    expect(await screen.findByText('No suitable candidate sites')).toBeInTheDocument();
  });

  test('uses the project-scoped API inside a planning workspace', async () => {
    const user = userEvent.setup();
    render(<SmartRecommendationEngine cityId={1} planningProject={{ planning_horizon: 20 }} planningProjectId={12} />);
    await user.click(screen.getByRole('button', { name: 'Analyze Locations' }));
    await waitFor(() => expect(createProjectRecommendations).toHaveBeenCalledWith(12, {
      projectType: 'HOSPITAL', budget: 150000000, planningHorizon: 20,
    }));
    expect(createRecommendations).not.toHaveBeenCalled();
    expect(await screen.findByText(/2 implemented and 3 proposed plan items/)).toBeInTheDocument();
  });
});

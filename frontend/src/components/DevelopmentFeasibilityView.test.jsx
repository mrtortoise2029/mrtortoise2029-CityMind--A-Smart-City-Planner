import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import { DevelopmentFeasibilityView } from './DevelopmentFeasibilityView.jsx';
import { getProjectDevelopmentFeasibility } from '../api/client.js';

vi.mock('../api/client.js', () => ({ getProjectDevelopmentFeasibility: vi.fn() }));

test('renders the development decision dashboard and opens its evidence views', async () => {
  getProjectDevelopmentFeasibility.mockResolvedValue({
    site_overview: {
      area_acres: 18.7, project_type: 'NEW_DEVELOPMENT', planning_horizon: 20,
      planning_population: { value: 8500, data_type: 'PLANNER_DEFINED' },
      population_capacity: { value: 8500, data_type: 'PLANNER_DEFINED_TARGET' },
      infrastructure_gap_percent: 31, urban_health_score: 72, risk_level: 'MODERATE',
    },
    planning_readiness: {
      score: 68, band: 'PROMISING_FOR_FURTHER_INVESTIGATION',
      factors: [{ key: 'SPATIAL_CONTEXT', label: 'Site definition', score: 100, evidence: 'Boundary and measured project area are available.' }],
      methodology: 'Weighted supported evidence.',
    },
    findings: [{ type: 'WARNING', title: 'Healthcare requires investigation', detail: 'Two facilities are missing.', source: 'Project gap analysis', confidence: 'ESTIMATED' }],
    decision_notice: 'Professional and regulatory verification is required.',
  });
  const user = userEvent.setup();
  const onNavigate = vi.fn();
  render(<DevelopmentFeasibilityView onNavigate={onNavigate} project={{ id: 17 }} />);

  expect(await screen.findByRole('heading', { name: 'Can I develop this land?' })).toBeInTheDocument();
  expect(screen.getByText('68')).toBeInTheDocument();
  expect(screen.getByText('Healthcare requires investigation')).toBeInTheDocument();
  expect(screen.getByText('8,500')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: /Open GIS Planning/ }));
  await user.click(screen.getByRole('button', { name: /Generate assessment/ }));
  expect(onNavigate).toHaveBeenNthCalledWith(1, 'gis');
  expect(onNavigate).toHaveBeenNthCalledWith(2, 'reports');
});

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test, vi } from 'vitest';
import { getProjectBlockAnalysis } from '../api/client.js';
import { ProjectBlockHealthDashboard } from './ProjectBlockHealthDashboard.jsx';

vi.mock('../api/client.js', () => ({ getProjectBlockAnalysis: vi.fn() }));

const item = (id, name, population, score) => ({
  rank: id, block: { id, name, land_use: 'residential', phase: 1 }, population,
  households: Math.round(population / 5), area_acres: 50, population_confidence: 'PLANNING_ASSUMPTION',
  score, category: 'Moderate', facilities: { hospitals: 0, schools: 1, parks: 0 },
  components: { healthcare: 0, education: 40, mobility: 80, environment: 60, green_space: 30, infrastructure: 70, accessibility: 75 },
});

beforeEach(() =>
  getProjectBlockAnalysis.mockResolvedValue({
    blocks: [item(1, 'Block A', 26000, 55), item(2, 'Block B', 30000, 62)],
    planned_blocks: [item(1, 'Block A', 26000, 68), item(2, 'Block B', 30000, 70)],
    summary: { score: 59 },
    planned_summary: { score: 69 },
  }),
);

test('shows deterministic population and health by project block', async () => {
  const user = userEvent.setup();
  render(<ProjectBlockHealthDashboard onNavigate={vi.fn()} planningProject={{ id: 1 }} />);
  expect(await screen.findByText('26,000 people')).toBeInTheDocument();
  await user.selectOptions(screen.getByLabelText('Select project block'), '2');
  await waitFor(() => expect(screen.getByText('30,000 people')).toBeInTheDocument());
  expect(screen.getAllByText('Block B')).toHaveLength(3);
  expect(screen.getAllByText('62').length).toBeGreaterThan(0);
  expect(screen.getByText('Planned').closest('span')).toHaveTextContent('70');
});

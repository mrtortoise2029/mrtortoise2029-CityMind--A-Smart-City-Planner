import { render, screen } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import { getProjectGrowthPrediction } from '../api/client.js';
import { GrowthPredictionView } from './GrowthPredictionView.jsx';

vi.mock('../api/client.js', () => ({ getProjectGrowthPrediction: vi.fn() }));
vi.mock('recharts', () => ({
  CartesianGrid: () => null,
  Line: () => null,
  LineChart: ({ children }) => <div data-testid="growth-chart">{children}</div>,
  ResponsiveContainer: ({ children }) => <div>{children}</div>,
  Tooltip: () => null,
  XAxis: () => null,
  YAxis: () => null,
}));

const project = { id: 6, name: 'Project Six' };

beforeEach(() => {
  getProjectGrowthPrediction.mockResolvedValue({
    project_id: 6,
    planning_horizon: 20,
    baseline_population: 10_000,
    baseline_data_type: 'OBSERVED',
    annual_growth_rate: 2,
    confidence: 'ESTIMATED',
    projection_label: 'Scenario-based projection',
    current: { year: 0, population: 10_000, households: 2_200, data_type: 'OBSERVED' },
    scenarios: [{
      year: 20, population: 14_859, households: 3_269,
      status: 'PROJECT_HORIZON', data_type: 'SIMULATED',
      demand: { requirements: { hospital: { value: 2, unit: 'hospitals' } } },
    }],
    assumptions: ['Compound scenario using available contextual records.'],
    data_sources: [{ dataset: 'Contextual population growth', source: 'CityMind population records', data_type: 'REFERENCE_DATA', data_year: 2026 }],
  });
});

test('renders the loaded growth dashboard instead of crashing after the API response', async () => {
  render(<GrowthPredictionView onOpenMap={vi.fn()} project={project} />);
  expect(await screen.findByRole('heading', { name: 'Growth Prediction' })).toBeInTheDocument();
  expect(screen.getByText('14,859')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'View demand on GIS' })).toBeInTheDocument();
  expect(screen.getByTestId('growth-chart')).toBeInTheDocument();
  expect(screen.getByText(/not an official forecast/i)).toBeInTheDocument();
});

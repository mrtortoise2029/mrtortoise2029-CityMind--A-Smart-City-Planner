import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { getCityHealthScores } from '../api/client.js';
import { UrbanHealthDashboard } from './UrbanHealthDashboard.jsx';

vi.mock('../api/client.js', () => ({ getCityHealthScores: vi.fn() }));
vi.mock('recharts', () => ({
  PolarAngleAxis: () => null, PolarGrid: () => null, Radar: () => null, Tooltip: () => null,
  RadarChart: ({ children }) => <div data-testid="health-radar">{children}</div>,
  ResponsiveContainer: ({ children }) => <div>{children}</div>,
}));

const makeScore = (id, name, score, category) => ({
  ward: { id, name, ward_code: `W${id}` }, score, category,
  components: { healthcare: score, education: score - 1, mobility: score - 2, environment: score - 3, green_space: score - 4, infrastructure: score - 5 },
  weights: { healthcare: .2, education: .18, mobility: .18, environment: .18, green_space: .12, infrastructure: .14 },
});
const response = { rankings: [makeScore(3, 'Tejgaon', 84, 'Excellent'), makeScore(1, 'Banani', 72, 'Good'), makeScore(2, 'Badda', 48, 'Poor')] };

describe('UrbanHealthDashboard', () => {
  beforeEach(() => { vi.clearAllMocks(); getCityHealthScores.mockResolvedValue(response); });

  test('renders backend score, components, and ranked ward comparison', async () => {
    render(<UrbanHealthDashboard cityId={1} />);
    expect(await screen.findByLabelText('Tejgaon health score: 84 out of 100')).toBeInTheDocument();
    expect(screen.getAllByText('Excellent').length).toBeGreaterThan(0);
    expect(screen.getByRole('table', { name: 'Ward health score ranking' })).toBeInTheDocument();
    expect(screen.getByLabelText('Healthcare: 84 out of 100')).toBeInTheDocument();
  });

  test('changes selected ward and supports multi-ward comparison', async () => {
    const user = userEvent.setup();
    render(<UrbanHealthDashboard cityId={1} />);
    await screen.findByText('Compare Wards');
    await user.selectOptions(screen.getByLabelText('Select health score ward'), '2');
    expect(screen.getByLabelText('Badda health score: 48 out of 100')).toBeInTheDocument();
    const baddaButton = screen.getByRole('button', { name: 'Badda' });
    await user.click(baddaButton);
    expect(baddaButton).toHaveAttribute('aria-pressed', 'false');
    await user.click(baddaButton);
    expect(baddaButton).toHaveAttribute('aria-pressed', 'true');
  });

  test('refreshes when analysis data changes', async () => {
    render(<UrbanHealthDashboard cityId={1} />);
    await screen.findByText('Compare Wards');
    window.dispatchEvent(new CustomEvent('citymind:analysis-updated'));
    await waitFor(() => expect(getCityHealthScores).toHaveBeenCalledTimes(2));
  });
});

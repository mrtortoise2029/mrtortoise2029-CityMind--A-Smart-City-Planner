import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import { getGapAnalysis, getHealthScore, getMapData, getOverview, getRecommendations } from '../api/client.js';
import { useCityDashboard } from './useCityDashboard.js';

vi.mock('../api/client.js', () => ({
  getOverview: vi.fn(),
  getGapAnalysis: vi.fn(),
  getMapData: vi.fn(),
  getRecommendations: vi.fn(),
  getHealthScore: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  getOverview.mockResolvedValue({});
  getGapAnalysis.mockResolvedValue({});
  getMapData.mockResolvedValue({});
  getRecommendations.mockResolvedValue({});
  getHealthScore.mockResolvedValue({});
});

test('exposes API errors to the dashboard', async () => {
  getMapData.mockRejectedValue({ response: { data: { error: { message: 'Map service unavailable' } } } });
  const { result } = renderHook(() => useCityDashboard(1));
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.error).toBe('Map service unavailable');
  expect(result.current.data).toBeNull();
});

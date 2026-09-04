import { useEffect, useState } from 'react';
import { getGapAnalysis, getHealthScore, getMapData, getOverview, getRecommendations } from '../api/client.js';

export function useCityDashboard(cityId) {
  const [state, setState] = useState({ data: null, loading: true, error: null });

  useEffect(() => {
    let active = true;
    setState((current) => ({ ...current, loading: true, error: null }));
    Promise.all([
      getOverview(cityId), getGapAnalysis(cityId), getMapData(cityId),
      getRecommendations(cityId), getHealthScore(cityId),
    ]).then(([overview, gaps, map, recommendations, health]) => {
      if (active) setState({ data: { overview, gaps, map, recommendations, health }, loading: false, error: null });
    }).catch((error) => {
      const apiError = error.response?.data?.error;
      if (active) setState({ data: null, loading: false, error: apiError?.message ?? apiError ?? error.message });
    });
    return () => { active = false; };
  }, [cityId]);

  return state;
}

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { UrbanMap } from './UrbanMap.jsx';

vi.mock('./map/CityMap.jsx', () => ({
  CityMap: ({ mapData, layers, onSelectWard }) => (
    <div data-testid="city-map">
      <span>{mapData.facilities.length} mapped facilities</span>
      <span>{layers.roads ? 'roads visible' : 'roads hidden'}</span>
      <button onClick={() => onSelectWard(2)}>Select Mohakhali on map</button>
    </div>
  ),
}));

const wards = [
  { id: 1, ward_code: 'W19', name: 'Banani', population: 42100, population_density: 6790, hospitals: 1, schools: 1, parks: 1, road_length_km: 3.2, good_road_percent: 100, air_quality_index: 118, green_cover_percent: 21, water_quality_index: 72, noise_level_db: 64, healthScore: 70, geometrySource: 'centroid-fallback' },
  { id: 2, ward_code: 'W20', name: 'Mohakhali', population: 68300, population_density: 9619, hospitals: 1, schools: 1, parks: 0, road_length_km: 4.8, good_road_percent: 62, air_quality_index: 157, green_cover_percent: 9, water_quality_index: 58, noise_level_db: 75, healthScore: 48, geometrySource: 'database' },
];

const mapData = {
  city: { id: 1, name: 'Dhaka Central', latitude: 23.78, longitude: 90.4 },
  wards,
  facilities: [{ id: 1 }, { id: 2 }],
  roads: [{ id: 1, ward_id: 1, name: 'Road 1', congestion_level: 'medium' }],
  geometrySummary: { database: 1, fallback: 1 },
};

describe('UrbanMap', () => {
  test('shows map data and selects a ward from the map', async () => {
    const user = userEvent.setup();
    render(<UrbanMap mapData={mapData} />);
    expect(screen.getByText('2 mapped facilities')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText('Banani statistics')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'Select Mohakhali on map' }));
    expect(screen.getByLabelText('Mohakhali statistics')).toBeInTheDocument();
  });

  test('toggles layers and keeps thematic layers mutually exclusive', async () => {
    const user = userEvent.setup();
    render(<UrbanMap mapData={mapData} />);
    const population = screen.getByRole('button', { name: 'Population' });
    const pollution = screen.getByRole('button', { name: 'Pollution' });
    await user.click(population);
    expect(population).toHaveAttribute('aria-pressed', 'true');
    await user.click(pollution);
    expect(pollution).toHaveAttribute('aria-pressed', 'true');
    expect(population).toHaveAttribute('aria-pressed', 'false');
  });

  test('supports ward search and selection', async () => {
    const user = userEvent.setup();
    render(<UrbanMap mapData={mapData} />);
    await user.type(screen.getByLabelText('Search wards'), 'Moh');
    await user.selectOptions(screen.getByLabelText('Select ward'), '2');
    expect(screen.getByLabelText('Mohakhali statistics')).toBeInTheDocument();
  });

  test('renders loading, error, and empty states without crashing', () => {
    const { rerender } = render(<UrbanMap loading />);
    expect(screen.getByText('Loading geospatial layers')).toBeInTheDocument();
    rerender(<UrbanMap error="Network unavailable" />);
    expect(screen.getByText('Network unavailable')).toBeInTheDocument();
    rerender(<UrbanMap mapData={{ city: mapData.city, wards: [], facilities: [], roads: [], geometrySummary: { fallback: 0 } }} />);
    expect(screen.getByTestId('city-map')).toBeInTheDocument();
  });

  test('focuses a recommended ward from the planning interface', async () => {
    render(<UrbanMap mapData={mapData} />);
    await waitFor(() => expect(screen.getByLabelText('Banani statistics')).toBeInTheDocument());
    window.dispatchEvent(new CustomEvent('citymind:focus-ward', { detail: { wardId: 2 } }));
    await waitFor(() => expect(screen.getByLabelText('Mohakhali statistics')).toBeInTheDocument());
  });
});

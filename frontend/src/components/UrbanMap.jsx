import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Layers3 } from 'lucide-react';
import { CityMap } from './map/CityMap.jsx';
import { MapControls } from './map/MapControls.jsx';
import { WardInfoPanel } from './map/WardInfoPanel.jsx';
import { WardSelector } from './map/WardSelector.jsx';

const initialLayers = {
  wards: true,
  hospital: true,
  school: true,
  park: true,
  roads: true,
  population: false,
  pollution: false,
};

export function UrbanMap({ mapData, loading = false, error = null }) {
  const [layers, setLayers] = useState(initialLayers);
  const [selectedWardId, setSelectedWardId] = useState(null);

  useEffect(() => {
    setSelectedWardId(mapData?.wards?.[0]?.id ?? null);
  }, [mapData?.city?.id]);

  useEffect(() => {
    const focusWard = (event) => {
      const wardId = Number(event.detail?.wardId);
      if (!mapData?.wards?.some((ward) => Number(ward.id) === wardId)) return;
      setSelectedWardId(wardId);
      setLayers((current) => ({ ...current, wards: true }));
    };
    window.addEventListener('citymind:focus-ward', focusWard);
    return () => window.removeEventListener('citymind:focus-ward', focusWard);
  }, [mapData?.wards]);

  const selectedWard = useMemo(() => (
    mapData?.wards?.find((ward) => Number(ward.id) === Number(selectedWardId)) ?? null
  ), [mapData?.wards, selectedWardId]);

  const toggleLayer = (layer) => {
    setLayers((current) => {
      const next = { ...current, [layer]: !current[layer] };
      if (layer === 'population' && next.population) next.pollution = false;
      if (layer === 'pollution' && next.pollution) next.population = false;
      return next;
    });
  };

  if (loading) {
    return <div className="gis-state panel"><span className="loader" /><h3>Loading geospatial layers</h3><p>Preparing boundaries, infrastructure, and ward indicators…</p></div>;
  }

  if (error) {
    return <div className="gis-state panel error"><AlertTriangle size={24} /><h3>Map data unavailable</h3><p>{error}</p></div>;
  }

  if (!mapData?.city) {
    return <div className="gis-state panel"><Layers3 size={24} /><h3>No map data</h3><p>Select a city with available geographic information.</p></div>;
  }

  return (
    <article className="panel map-panel">
      <div className="panel-heading gis-heading">
        <div><p className="eyebrow">Geospatial intelligence</p><h2>Interactive urban service map</h2></div>
        <WardSelector onSelect={setSelectedWardId} selectedWardId={selectedWardId} wards={mapData.wards} />
      </div>
      <MapControls layers={layers} onToggle={toggleLayer} />
      {mapData.geometrySummary?.fallback > 0 && (
        <p className="map-data-notice">
          {mapData.geometrySummary.fallback} ward boundaries use clearly marked centroid-based demo geometry until official GeoJSON is imported.
        </p>
      )}
      <div className="gis-workspace">
        <CityMap mapData={mapData} layers={layers} onSelectWard={setSelectedWardId} selectedWard={selectedWard} />
        <WardInfoPanel onClose={() => setSelectedWardId(null)} roads={mapData.roads} ward={selectedWard} />
      </div>
    </article>
  );
}

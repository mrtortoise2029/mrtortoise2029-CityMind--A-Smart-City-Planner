import { useEffect } from 'react';
import { MapContainer, Polyline, Popup, TileLayer, useMap, ZoomControl } from 'react-leaflet';
import { FacilityMarkers } from './FacilityMarkers.jsx';
import { MapLegend } from './MapLegend.jsx';
import { WardLayer } from './WardLayer.jsx';

function MapViewport({ city, selectedWard }) {
  const map = useMap();
  useEffect(() => {
    const target = selectedWard
      ? [selectedWard.latitude, selectedWard.longitude]
      : [city.latitude, city.longitude];
    map.flyTo(target, selectedWard ? 14 : 13, { duration: 0.65 });
  }, [city, map, selectedWard]);
  return null;
}

export function CityMap({ mapData, layers, selectedWard, onSelectWard }) {
  return (
    <div className="map-shell">
      <MapContainer
        center={[mapData.city.latitude, mapData.city.longitude]}
        className="map"
        key={mapData.city.id}
        scrollWheelZoom
        zoom={13}
        zoomControl={false}
      >
        <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <MapViewport city={mapData.city} selectedWard={selectedWard} />
        <WardLayer layers={layers} onSelectWard={onSelectWard} selectedWardId={selectedWard?.id} wards={mapData.wards} />
        {layers.roads && mapData.roads
          .filter((road) => Array.isArray(road.geometry) && road.geometry.length > 1)
          .map((road) => (
          <Polyline
            eventHandlers={{ click: () => onSelectWard(road.ward_id) }}
            key={road.id}
            pathOptions={{ color: road.condition_rating < 3 ? '#f25f67' : '#7aa899', opacity: 0.9, weight: selectedWard?.id === road.ward_id ? 6 : 4 }}
            positions={road.geometry}
          >
            <Popup><b>{road.name}</b><br />Condition {road.condition_rating}/5<br />Congestion: {road.congestion_level}</Popup>
          </Polyline>
          ))}
        <FacilityMarkers facilities={mapData.facilities} layers={layers} onSelectWard={onSelectWard} />
        <ZoomControl position="bottomright" />
      </MapContainer>
      {mapData.wards.length === 0 && <div className="map-empty-overlay"><strong>No ward data</strong><span>This city has no mapped wards yet.</span></div>}
      <MapLegend layers={layers} />
    </div>
  );
}

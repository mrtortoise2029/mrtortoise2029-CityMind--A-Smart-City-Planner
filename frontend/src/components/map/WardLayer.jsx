import { CircleMarker, GeoJSON, Tooltip } from 'react-leaflet';

const healthColor = (score) => score < 40 ? '#f25f67' : score < 60 ? '#e7a34b' : '#46e6a5';
const pollutionColor = (aqi) => aqi > 175 ? '#9d4edd' : aqi > 150 ? '#f25f67' : aqi > 100 ? '#e7a34b' : '#46e6a5';

function populationColor(density, maximum) {
  const ratio = maximum ? density / maximum : 0;
  if (ratio > 0.8) return '#7c3aed';
  if (ratio > 0.6) return '#2563eb';
  if (ratio > 0.4) return '#0ea5e9';
  return '#5eead4';
}

export function WardLayer({ wards, layers, selectedWardId, onSelectWard }) {
  if (!layers.wards && !layers.population && !layers.pollution) return null;
  const maximumDensity = Math.max(...wards.map((ward) => Number(ward.population_density) || 0), 1);

  return wards.map((ward) => {
    const selected = ward.id === selectedWardId;
    const fillColor = layers.population
      ? populationColor(ward.population_density, maximumDensity)
      : layers.pollution
        ? pollutionColor(ward.air_quality_index)
        : healthColor(ward.healthScore);
    const style = {
      color: selected ? '#f8fffc' : fillColor,
      fillColor,
      fillOpacity: selected ? 0.68 : (layers.population || layers.pollution ? 0.5 : 0.2),
      weight: selected ? 4 : 2,
      dashArray: ward.geometrySource === 'database' ? undefined : '6 5',
    };
    const events = { click: () => onSelectWard(ward.id) };

    if (!ward.boundary) {
      return (
        <CircleMarker center={[ward.latitude, ward.longitude]} eventHandlers={events} key={ward.id} pathOptions={style} radius={selected ? 21 : 17}>
          <Tooltip direction="top">{ward.name}</Tooltip>
        </CircleMarker>
      );
    }

    return (
      <GeoJSON data={ward.boundary} eventHandlers={events} key={`${ward.id}-${selected}-${fillColor}`} style={style}>
        <Tooltip direction="top">{ward.name}</Tooltip>
      </GeoJSON>
    );
  });
}


import { Building2, Cross, GraduationCap, Route, Trees, Users, Wind } from 'lucide-react';

export const mapLayerDefinitions = [
  ['wards', Building2, 'Wards'],
  ['hospital', Cross, 'Hospitals'],
  ['school', GraduationCap, 'Schools'],
  ['park', Trees, 'Parks'],
  ['roads', Route, 'Roads'],
  ['population', Users, 'Population'],
  ['pollution', Wind, 'Pollution'],
];

export function MapControls({ layers, onToggle }) {
  return (
    <div className="map-controls" aria-label="Map layers">
      {mapLayerDefinitions.map(([id, Icon, label]) => (
        <button
          aria-pressed={layers[id]}
          className={layers[id] ? 'selected' : ''}
          key={id}
          onClick={() => onToggle(id)}
          type="button"
        >
          <Icon size={14} />
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}


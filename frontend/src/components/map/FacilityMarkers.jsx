import { divIcon } from 'leaflet';
import { Marker, Popup } from 'react-leaflet';

const markerConfiguration = {
  hospital: { label: 'H', className: 'hospital' },
  school: { label: 'S', className: 'school' },
  park: { label: 'P', className: 'park' },
};

const getFacilityIcon = (type) => {
  const configuration = markerConfiguration[type] ?? { label: '•', className: 'other' };
  return divIcon({
    className: 'facility-marker-shell',
    html: `<span class="facility-marker ${configuration.className}"><b>${configuration.label}</b></span>`,
    iconAnchor: [14, 14],
    iconSize: [28, 28],
  });
};

export function FacilityMarkers({ facilities, layers, onSelectWard }) {
  return facilities
    .filter((facility) => layers[facility.type])
    .map((facility) => (
      <Marker
        eventHandlers={{ click: () => onSelectWard(facility.ward_id) }}
        icon={getFacilityIcon(facility.type)}
        key={facility.id}
        position={[facility.latitude, facility.longitude]}
      >
        <Popup>
          <b>{facility.name}</b><br />
          {facility.type} · {facility.ward_name}<br />
          Status: {facility.status}
        </Popup>
      </Marker>
    ));
}

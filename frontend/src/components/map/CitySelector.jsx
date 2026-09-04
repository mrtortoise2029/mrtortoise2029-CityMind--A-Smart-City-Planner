import { MapPin } from 'lucide-react';

export function CitySelector({ cities, value, onChange }) {
  return (
    <label className="city-selector">
      <MapPin size={15} />
      <span className="sr-only">Select city</span>
      <select aria-label="Select city" value={value} onChange={(event) => onChange(Number(event.target.value))}>
        {cities.length > 0
          ? cities.map((city) => <option value={city.id} key={city.id}>{city.name}</option>)
          : <option value="1">Dhaka Central</option>}
      </select>
    </label>
  );
}


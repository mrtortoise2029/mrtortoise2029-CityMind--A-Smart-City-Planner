import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';

export function WardSelector({ wards, selectedWardId, onSelect }) {
  const [query, setQuery] = useState('');
  const filteredWards = useMemo(() => wards.filter((ward) => (
    ward.name.toLowerCase().includes(query.trim().toLowerCase())
  )), [query, wards]);

  return (
    <div className="ward-selector">
      <label>
        <Search size={14} />
        <span className="sr-only">Search wards</span>
        <input
          aria-label="Search wards"
          placeholder="Search ward"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      <select
        aria-label="Select ward"
        value={selectedWardId ?? ''}
        onChange={(event) => onSelect(Number(event.target.value))}
      >
        <option value="" disabled>Select ward</option>
        {filteredWards.map((ward) => <option value={ward.id} key={ward.id}>{ward.name}</option>)}
      </select>
    </div>
  );
}


import { Activity, Building2, GraduationCap, Route, Trees, Users, Wind, X } from 'lucide-react';

function Stat({ icon: Icon, label, value }) {
  return <div className="ward-stat"><Icon size={15} /><span>{label}</span><strong>{value}</strong></div>;
}

export function WardInfoPanel({ ward, roads, onClose }) {
  if (!ward) {
    return (
      <aside className="ward-info empty">
        <Building2 size={25} />
        <h3>Select a ward</h3>
        <p>Choose a boundary or use the ward selector to inspect local conditions.</p>
      </aside>
    );
  }

  const wardRoads = roads.filter((road) => Number(road.ward_id) === Number(ward.id));
  return (
    <aside className="ward-info" aria-label={`${ward.name} statistics`}>
      <div className="ward-info-header">
        <div><span>{ward.ward_code}</span><h3>{ward.name}</h3></div>
        <button aria-label="Close ward details" onClick={onClose} type="button"><X size={16} /></button>
      </div>
      <div className="ward-score"><span>Urban health</span><strong>{ward.healthScore}<small>/100</small></strong></div>
      <div className="ward-stat-grid">
        <Stat icon={Users} label="Population" value={Number(ward.population).toLocaleString()} />
        <Stat icon={Activity} label="Density / km²" value={Math.round(ward.population_density).toLocaleString()} />
        <Stat icon={Building2} label="Hospitals" value={ward.hospitals} />
        <Stat icon={GraduationCap} label="Schools" value={ward.schools} />
        <Stat icon={Trees} label="Parks" value={ward.parks} />
        <Stat icon={Route} label="Road network" value={`${Number(ward.road_length_km).toFixed(1)} km`} />
      </div>
      <div className="ward-detail-block">
        <h4><Wind size={14} />Environment</h4>
        <dl>
          <div><dt>Air quality index</dt><dd>{ward.air_quality_index}</dd></div>
          <div><dt>Green coverage</dt><dd>{ward.green_cover_percent}%</dd></div>
          <div><dt>Water quality</dt><dd>{ward.water_quality_index}/100</dd></div>
          <div><dt>Noise level</dt><dd>{ward.noise_level_db || 'N/A'}{ward.noise_level_db ? ' dB' : ''}</dd></div>
        </dl>
      </div>
      <div className="ward-detail-block roads">
        <h4><Route size={14} />Road conditions</h4>
        <p>{Math.round(ward.good_road_percent)}% of measured roads are in good condition.</p>
        {wardRoads.map((road) => <span key={road.id}>{road.name} · {road.congestion_level} congestion</span>)}
      </div>
      {ward.geometrySource !== 'database' && <p className="geometry-notice">Dashed boundary is a centroid-based demo fallback, not an official administrative boundary.</p>}
    </aside>
  );
}


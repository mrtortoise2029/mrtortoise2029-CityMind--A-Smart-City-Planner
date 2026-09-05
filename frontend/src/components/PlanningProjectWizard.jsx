import { useMemo, useState } from 'react';
import L from 'leaflet';
import { ArrowLeft, Check, MapPin, Pencil, RotateCcw, Trash2, X } from 'lucide-react';
import { MapContainer, Marker, Polygon, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { calculateBoundaryMetrics, geoJSONToPositions, positionsToGeoJSON } from '../utils/projectGeometry.js';

const steps = ['Project Identity', 'Location', 'Area Boundary', 'Planning Parameters', 'Confirm'];
const types = ['NEW_DEVELOPMENT', 'EXISTING_AREA', 'REDEVELOPMENT', 'URBAN_EXPANSION'];
const typeLabel = (value) => value.replaceAll('_', ' ').replace(/\b\w/g, (character) => character.toUpperCase());
const vertexIcon = L.divIcon({ className: 'project-boundary-vertex', html: '<span></span>', iconSize: [16, 16], iconAnchor: [8, 8] });

function MapEvents({ drawing, onAdd }) {
  useMapEvents({ click: ({ latlng }) => { if (drawing) onAdd([latlng.lat, latlng.lng]); } });
  return null;
}

function MapCenter({ center }) {
  const map = useMap();
  map.setView(center, map.getZoom(), { animate: false });
  return null;
}

function BoundaryEditor({ center, positions, setPositions }) {
  const [mode, setMode] = useState(positions.length ? 'view' : 'draw');
  const metrics = calculateBoundaryMetrics(positions);
  const updateVertex = (index, marker) => {
    const point = marker.getLatLng();
    setPositions((current) => current.map((position, itemIndex) => itemIndex === index ? [point.lat, point.lng] : position));
  };
  return (
    <div className="boundary-editor">
      <div className="boundary-toolbar">
        <button className={mode === 'draw' ? 'active' : ''} onClick={() => setMode('draw')} type="button"><MapPin size={14} />Draw</button>
        <button className={mode === 'edit' ? 'active' : ''} disabled={positions.length < 3} onClick={() => setMode('edit')} type="button"><Pencil size={14} />Edit</button>
        <button disabled={!positions.length} onClick={() => { setPositions([]); setMode('draw'); }} type="button"><Trash2 size={14} />Delete</button>
        <button disabled={!positions.length} onClick={() => setPositions((current) => current.slice(0, -1))} type="button"><RotateCcw size={14} />Undo</button>
      </div>
      <div className="boundary-map-shell">
        <MapContainer center={center} scrollWheelZoom zoom={13} zoomControl>
          <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <MapCenter center={center} />
          <MapEvents drawing={mode === 'draw'} onAdd={(point) => setPositions((current) => [...current, point])} />
          {positions.length >= 3 && <Polygon pathOptions={{ color: '#58e1ad', fillColor: '#23966f', fillOpacity: 0.28, weight: 3 }} positions={positions} />}
          {mode === 'edit' && positions.map((position, index) => <Marker draggable eventHandlers={{ dragend: ({ target }) => updateVertex(index, target) }} icon={vertexIcon} key={`${index}-${position.join('-')}`} position={position} />)}
        </MapContainer>
        {mode === 'draw' && <p className="boundary-map-hint">Click at least three points on the map to define the planning area.</p>}
      </div>
      <div className="boundary-measurements"><div><span>Area</span><strong>{metrics.areaAcres.toLocaleString()} acres</strong></div><div><span>Metric area</span><strong>{metrics.areaSqKm.toLocaleString()} km²</strong></div><div><span>Vertices</span><strong>{positions.length}</strong></div></div>
    </div>
  );
}

function initialForm(project, cities) {
  return {
    name: project?.name ?? '', description: project?.description ?? '',
    projectType: project?.project_type ?? 'NEW_DEVELOPMENT', country: project?.country ?? 'Bangladesh',
    cityId: String(project?.city_id ?? cities[0]?.id ?? ''), region: project?.region ?? cities[0]?.name ?? '',
    locationSearch: project?.location_search ?? '', planningHorizon: String(project?.planning_horizon ?? 20),
    expectedPopulation: String(project?.expected_population ?? ''), expectedHouseholds: String(project?.expected_households ?? ''),
    targetDensity: String(project?.target_density ?? ''), currentPopulation: String(project?.current_population ?? ''),
    currentHouseholds: String(project?.current_households ?? ''), currentDensity: String(project?.current_density ?? ''),
  };
}

export function PlanningProjectWizard({ cities, project, onCancel, onSave }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(() => initialForm(project, cities));
  const [positions, setPositions] = useState(() => geoJSONToPositions(project?.area?.boundary_geojson));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const selectedCity = cities.find(({ id }) => Number(id) === Number(form.cityId)) ?? cities[0];
  const center = useMemo(() => project?.area?.centroid_latitude
    ? [Number(project.area.centroid_latitude), Number(project.area.centroid_longitude)]
    : [Number(selectedCity?.latitude ?? 23.7806), Number(selectedCity?.longitude ?? 90.407)], [project, selectedCity]);
  const metrics = calculateBoundaryMetrics(positions);
  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  const validateStep = () => {
    if (step === 0 && (form.name.trim().length < 3 || form.description.trim().length < 5)) return 'Enter a project name and a useful description.';
    if (step === 1 && (!form.country.trim() || !form.region.trim() || !form.cityId)) return 'Select a country and city or region reference.';
    if (step === 2 && positions.length < 3) return 'Draw a boundary with at least three points.';
    if (step === 3) {
      const keys = form.projectType === 'EXISTING_AREA'
        ? ['currentPopulation', 'currentHouseholds', 'currentDensity']
        : ['expectedPopulation', 'expectedHouseholds', 'targetDensity'];
      if (![5, 10, 20, 30].includes(Number(form.planningHorizon))) return 'Choose a valid planning horizon.';
      if (keys.some((key) => Number(form[key]) <= 0)) return 'Complete all population, household, and density fields.';
    }
    return '';
  };
  const next = () => {
    const message = validateStep();
    setError(message);
    if (!message) setStep((current) => current + 1);
  };
  const payload = () => ({
    name: form.name.trim(), description: form.description.trim(), projectType: form.projectType,
    country: form.country.trim(), cityId: Number(form.cityId), region: form.region.trim(),
    locationSearch: form.locationSearch.trim(), boundary: positionsToGeoJSON(positions),
    planningHorizon: Number(form.planningHorizon),
    expectedPopulation: form.expectedPopulation ? Number(form.expectedPopulation) : null,
    expectedHouseholds: form.expectedHouseholds ? Number(form.expectedHouseholds) : null,
    targetDensity: form.targetDensity ? Number(form.targetDensity) : null,
    currentPopulation: form.currentPopulation ? Number(form.currentPopulation) : null,
    currentHouseholds: form.currentHouseholds ? Number(form.currentHouseholds) : null,
    currentDensity: form.currentDensity ? Number(form.currentDensity) : null,
  });
  const save = async () => {
    setSaving(true); setError('');
    try { await onSave(payload()); } catch (requestError) {
      setError(requestError.response?.data?.error?.message ?? 'Unable to save the planning project.');
    } finally { setSaving(false); }
  };
  const existing = form.projectType === 'EXISTING_AREA';

  return (
    <div className="project-wizard-overlay" role="dialog" aria-modal="true" aria-label={project ? 'Edit planning project' : 'Create planning project'}>
      <div className="project-wizard">
        <header><div><p className="eyebrow">Planning project setup</p><h2>{project ? 'Edit Planning Project' : 'Create Planning Project'}</h2></div><button aria-label="Close project wizard" onClick={onCancel} type="button"><X size={18} /></button></header>
        <ol className="project-stepper">{steps.map((label, index) => <li className={index === step ? 'active' : index < step ? 'complete' : ''} key={label}><span>{index < step ? <Check size={12} /> : index + 1}</span><b>{label}</b></li>)}</ol>
        <div className="project-wizard-progress"><i style={{ width: `${((step + 1) / steps.length) * 100}%` }} /></div>
        <section className="project-wizard-body">
          {step === 0 && <div className="wizard-fields"><label><span>Project Name</span><input autoFocus name="name" onChange={update} placeholder="Bashundhara Residential Area" value={form.name} /></label><label className="full"><span>Description</span><textarea name="description" onChange={update} placeholder="Describe the planning objective and intended development…" rows="4" value={form.description} /></label><label><span>Project Type</span><select name="projectType" onChange={update} value={form.projectType}>{types.map((type) => <option key={type} value={type}>{typeLabel(type)}</option>)}</select></label></div>}
          {step === 1 && <div className="wizard-fields"><label><span>Country</span><input name="country" onChange={update} value={form.country} /></label><label><span>City / Region Reference</span><select name="cityId" onChange={(event) => { update(event); const city = cities.find(({ id }) => Number(id) === Number(event.target.value)); if (city) setForm((current) => ({ ...current, cityId: event.target.value, region: city.name })); }} value={form.cityId}>{cities.map((city) => <option key={city.id} value={city.id}>{city.name}</option>)}</select></label><label><span>Region Name</span><input name="region" onChange={update} value={form.region} /></label><label className="full"><span>Location Search / Landmark</span><div className="location-field"><MapPin size={15} /><input name="locationSearch" onChange={update} placeholder="Road, landmark, district or coordinates" value={form.locationSearch} /></div></label></div>}
          {step === 2 && <BoundaryEditor center={center} positions={positions} setPositions={setPositions} />}
          {step === 3 && <div className="wizard-parameters"><div className="horizon-options"><span>Planning Horizon</span>{[5, 10, 20, 30].map((years) => <button className={Number(form.planningHorizon) === years ? 'active' : ''} key={years} onClick={() => setForm((current) => ({ ...current, planningHorizon: String(years) }))} type="button"><strong>{years}</strong> years</button>)}</div><div className="wizard-fields">{existing ? <><label><span>Current Population</span><input min="1" name="currentPopulation" onChange={update} type="number" value={form.currentPopulation} /></label><label><span>Existing Households</span><input min="1" name="currentHouseholds" onChange={update} type="number" value={form.currentHouseholds} /></label><label><span>Current Density (people/acre)</span><input min="0.01" name="currentDensity" onChange={update} step="0.01" type="number" value={form.currentDensity} /></label></> : <><label><span>Expected Population</span><input min="1" name="expectedPopulation" onChange={update} type="number" value={form.expectedPopulation} /></label><label><span>Expected Households</span><input min="1" name="expectedHouseholds" onChange={update} type="number" value={form.expectedHouseholds} /></label><label><span>Target Density (people/acre)</span><input min="0.01" name="targetDensity" onChange={update} step="0.01" type="number" value={form.targetDensity} /></label></>}</div></div>}
          {step === 4 && <div className="project-confirm"><div className="confirm-title"><span className={`project-type ${form.projectType.toLowerCase()}`}>{typeLabel(form.projectType)}</span><h3>{form.name}</h3><p>{form.description}</p></div><div className="confirm-grid"><div><span>Location</span><strong>{form.region}, {form.country}</strong><small>{form.locationSearch || selectedCity?.name}</small></div><div><span>Planning area</span><strong>{metrics.areaAcres.toLocaleString()} acres</strong><small>{metrics.areaSqKm.toLocaleString()} km² · {positions.length} vertices</small></div><div><span>Planning horizon</span><strong>{form.planningHorizon} years</strong><small>{existing ? 'Existing-area improvement' : 'Future development target'}</small></div><div><span>{existing ? 'Current population' : 'Expected population'}</span><strong>{Number(existing ? form.currentPopulation : form.expectedPopulation).toLocaleString()}</strong><small>{Number(existing ? form.currentHouseholds : form.expectedHouseholds).toLocaleString()} households</small></div></div><div className="boundary-mini-preview"><MapContainer center={center} dragging={false} scrollWheelZoom={false} zoom={12} zoomControl={false}><TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" /><Polygon pathOptions={{ color: '#58e1ad', fillColor: '#23966f', fillOpacity: 0.32 }} positions={positions} /></MapContainer></div></div>}
          {error && <p className="wizard-error">{error}</p>}
        </section>
        <footer><button disabled={saving} onClick={step ? () => { setError(''); setStep((current) => current - 1); } : onCancel} type="button"><ArrowLeft size={14} />{step ? 'Back' : 'Cancel'}</button>{step < 4 ? <button className="primary" onClick={next} type="button">Continue</button> : <button className="primary" disabled={saving} onClick={save} type="button">{saving ? 'Saving project…' : project ? 'Update Planning Project' : 'Create Planning Project'}</button>}</footer>
      </div>
    </div>
  );
}

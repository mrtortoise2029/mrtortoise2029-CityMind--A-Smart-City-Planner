import { useEffect, useMemo, useState } from 'react';
import { Building2, Layers3, MapPinned, Route } from 'lucide-react';
import { getPlanningFeatures } from '../api/client.js';

const modules = {
  blocks: { title: 'Development Blocks', subtitle: 'Organize the project into named planning units.', Icon: MapPinned, types: ['BLOCK'] },
  roads: { title: 'Road Network', subtitle: 'Review the primary, secondary, and local road hierarchy.', Icon: Route, types: ['PRIMARY_ROAD', 'SECONDARY_ROAD', 'LOCAL_ROAD', 'ROAD_PROPOSAL', 'DRAINAGE_CORRIDOR'] },
  landuse: { title: 'Land Use Plan', subtitle: 'Review spatial allocation across project zones.', Icon: Layers3, types: ['RESIDENTIAL_ZONE', 'COMMERCIAL_ZONE', 'EDUCATION_ZONE', 'HEALTHCARE_ZONE', 'GREEN_ZONE', 'RECREATION_ZONE', 'UTILITY_ZONE', 'WATER_BODY', 'FUTURE_DEVELOPMENT_AREA'] },
  facilities: { title: 'Facilities Plan', subtitle: 'Review planner proposals and project access points.', Icon: Building2, types: ['FACILITY_PROPOSAL', 'COMMUNITY_FACILITY', 'MAIN_GATE', 'SECONDARY_GATE', 'PLANNING_POINT'] },
};

function featureDetail(feature) {
  if (feature.properties?.widthMeters) return `${feature.properties.widthMeters} m width`;
  if (feature.properties?.landUse) return `${Number(feature.properties.population || 0).toLocaleString()} people · ${feature.properties.landUse} · Phase ${feature.properties.phase ?? 1}`;
  return feature.category || 'Project planning feature';
}

export function ProjectAssetView({ module, onNavigate, project }) {
  const configuration = modules[module];
  const [state, setState] = useState({ loading: true, error: '', features: [] });
  useEffect(() => {
    getPlanningFeatures(project.id)
      .then((features) => setState({ loading: false, error: '', features }))
      .catch((error) => setState({ loading: false, error: error.response?.data?.error?.message ?? 'Project plan is unavailable', features: [] }));
  }, [project.id]);
  const features = useMemo(() => state.features.filter(({ feature_type: type }) => configuration.types.includes(type)), [configuration.types, state.features]);
  const { Icon } = configuration;
  return (
    <article className="project-asset-view">
      <header><div><p className="eyebrow">Project master plan</p><h2>{configuration.title}</h2><p>{configuration.subtitle} All geometry is stored against {project.name}.</p></div><button onClick={() => onNavigate('gis')} type="button"><MapPinned size={14} />Open GIS planning canvas</button></header>
      <section className="asset-summary"><Icon size={22} /><div><span>Mapped project elements</span><strong>{features.length}</strong></div><div><span>Approved</span><strong>{features.filter(({ status }) => status === 'approved').length}</strong></div><div><span>Proposed</span><strong>{features.filter(({ status }) => status === 'proposed').length}</strong></div></section>
      {state.loading && <div className="asset-empty"><span className="loader" /><p>Loading project geometry…</p></div>}
      {state.error && <div className="asset-empty error"><p>{state.error}</p></div>}
      {!state.loading && !state.error && !features.length && <div className="asset-empty"><Icon size={28} /><h3>No {configuration.title.toLowerCase()} yet</h3><p>Use the project GIS canvas to draw and save the first element.</p><button onClick={() => onNavigate('gis')} type="button">Start on map</button></div>}
      {!!features.length && <div className="asset-table"><div className="asset-row asset-head"><span>Name</span><span>Classification</span><span>Planning detail</span><span>Status</span></div>{features.map((feature) => <div className="asset-row" key={feature.id}><strong>{feature.name}</strong><span>{feature.feature_type.replaceAll('_', ' ')}</span><span>{featureDetail(feature)}</span><b className={feature.status}>{feature.status}</b></div>)}</div>}
    </article>
  );
}

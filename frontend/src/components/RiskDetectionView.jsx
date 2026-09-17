import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Database, MapPin, ShieldAlert } from 'lucide-react';
import { CircleMarker, MapContainer, Polygon, TileLayer, Tooltip, useMap } from 'react-leaflet';
import { getProjectRiskDetection } from '../api/client.js';
import { geoJSONToPositions } from '../utils/projectGeometry.js';

const severityColor = { LOW: '#62dbaa', MODERATE: '#e4bd65', HIGH: '#ed8f55', CRITICAL: '#ef7379' };
function FitRiskMap({ boundary }) { const map = useMap(); useEffect(() => { if (boundary.length >= 3) map.fitBounds(boundary, { padding: [24, 24] }); }, [boundary, map]); return null; }

export function RiskDetectionView({ project }) {
  const [data, setData] = useState(null);
  const [state, setState] = useState({ loading: true, error: '' });
  useEffect(() => {
    let current = true;
    getProjectRiskDetection(project.id)
      .then((result) => { if (current) { setData(result); setState({ loading: false, error: '' }); } })
      .catch((error) => { if (current) setState({ loading: false, error: error.response?.data?.error?.message ?? 'Risk detection is unavailable.' }); });
    return () => { current = false; };
  }, [project.id]);
  const boundary = useMemo(() => geoJSONToPositions(data?.boundary), [data?.boundary]);
  if (state.loading) return <div className="analysis-state"><span className="loader" /><h2>Screening project risks</h2><p>Checking only categories supported by current project evidence.</p></div>;
  if (state.error) return <div className="analysis-state error"><AlertTriangle /><h2>Risk detection unavailable</h2><p>{state.error}</p></div>;
  const locations = data.risks.flatMap((risk) => (risk.location ?? []).map((location) => ({ ...location, risk })));
  return (
    <article className="risk-detection-view">
      <header><div><p className="eyebrow">Evidence-based screening</p><h2>Risk Detection</h2><p>Project service and infrastructure risks; unavailable hazard datasets are never inferred.</p></div><div className={`risk-level ${data.overall_risk_level.toLowerCase()}`}><ShieldAlert /><span>Overall available-evidence risk</span><strong>{data.overall_risk_level.replaceAll('_', ' ')}</strong><small>{data.overall_risk_score == null ? 'No supported score' : `${data.overall_risk_score}/100`}</small></div></header>
      {boundary.length >= 3 && <section className="risk-map"><MapContainer attributionControl={false} center={boundary[0]} zoom={13}><TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" /><FitRiskMap boundary={boundary} /><Polygon pathOptions={{ color: '#64ddb0', fillOpacity: 0.08, weight: 2 }} positions={boundary} />{locations.map((item) => <CircleMarker center={[item.latitude, item.longitude]} key={`${item.risk.risk_type}-${item.id}`} pathOptions={{ color: severityColor[item.risk.severity], fillColor: severityColor[item.risk.severity], fillOpacity: .75 }} radius={8}><Tooltip><strong>{item.risk.label}</strong><br />{item.label}<br />{item.evidence}<br />Confidence: {item.confidence}</Tooltip></CircleMarker>)}</MapContainer><footer><MapPin />Mapped markers are estimated screening locations backed by service-distance evidence, not hazard zones.</footer></section>}
      <section className="risk-grid">{data.risks.map((risk) => <article key={risk.risk_type}><header><span>{risk.label}</span><b className={risk.severity.toLowerCase()}>{risk.severity}</b></header><strong>{risk.score}/100</strong><p>{risk.score_basis}</p><dl><div><dt>Required</dt><dd>{risk.evidence.required} {risk.evidence.unit}</dd></div><div><dt>Available</dt><dd>{risk.evidence.effective_supply}</dd></div><div><dt>Missing</dt><dd>{risk.evidence.missing}</dd></div></dl><small><Database />{risk.confidence} · {risk.data_source}</small><aside>{risk.recommendations[0]}</aside></article>)}</section>
      <section className="unavailable-risk-list"><h3>Datasets not available</h3><p>No score is produced for these categories.</p>{data.unavailable_risks.map((item) => <div key={item.risk_type}><span>{item.risk_type.replaceAll('_', ' ')}</span><b>Data unavailable</b><small>{item.reason}</small></div>)}</section>
      <aside className="planning-notice"><AlertTriangle /><p>{data.decision_notice}</p></aside>
    </article>
  );
}


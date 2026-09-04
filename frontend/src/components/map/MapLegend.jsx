export function MapLegend({ layers }) {
  return (
    <div className="gis-legend" aria-label="Map legend">
      <strong>Legend</strong>
      <div className="legend-row"><i className="legend-hospital" />Hospital</div>
      <div className="legend-row"><i className="legend-school" />School</div>
      <div className="legend-row"><i className="legend-park" />Park</div>
      {layers.population && <div className="legend-scale"><span>Lower density</span><b className="density-scale" /><span>Higher</span></div>}
      {layers.pollution && <div className="legend-scale"><span>Good AQI</span><b className="pollution-scale" /><span>Hazardous</span></div>}
      {!layers.population && !layers.pollution && <div className="legend-scale"><span>Priority</span><b className="health-scale" /><span>Healthy</span></div>}
    </div>
  );
}


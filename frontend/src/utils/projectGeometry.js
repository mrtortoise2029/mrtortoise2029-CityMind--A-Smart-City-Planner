const EARTH_RADIUS_METERS = 6_378_137;
const SQUARE_METERS_PER_ACRE = 4046.8564224;
const radians = (value) => value * Math.PI / 180;

export function calculateBoundaryMetrics(positions) {
  if (positions.length < 3) return { areaAcres: 0, areaSqKm: 0 };
  const ring = [...positions, positions[0]];
  let sum = 0;
  for (let index = 0; index < ring.length - 1; index += 1) {
    const [latitude1, longitude1] = ring[index];
    const [latitude2, longitude2] = ring[index + 1];
    sum += radians(longitude2 - longitude1)
      * (2 + Math.sin(radians(latitude1)) + Math.sin(radians(latitude2)));
  }
  const squareMeters = Math.abs(sum * EARTH_RADIUS_METERS * EARTH_RADIUS_METERS / 2);
  return {
    areaAcres: Number((squareMeters / SQUARE_METERS_PER_ACRE).toFixed(2)),
    areaSqKm: Number((squareMeters / 1_000_000).toFixed(4)),
  };
}

export function positionsToGeoJSON(positions) {
  return {
    type: 'Polygon',
    coordinates: [[...positions, positions[0]].map(([latitude, longitude]) => [longitude, latitude])],
  };
}

export function geoJSONToPositions(boundary) {
  const ring = boundary?.type === 'Polygon' ? boundary.coordinates?.[0] ?? [] : [];
  return ring.slice(0, -1).map(([longitude, latitude]) => [latitude, longitude]);
}

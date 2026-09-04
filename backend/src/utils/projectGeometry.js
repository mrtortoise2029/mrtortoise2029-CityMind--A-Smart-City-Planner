const EARTH_RADIUS_METERS = 6_378_137;
const SQUARE_METERS_PER_ACRE = 4046.8564224;

const radians = (degrees) => degrees * Math.PI / 180;

export function calculatePolygonAreaSqMeters(boundary) {
  const ring = boundary?.coordinates?.[0] ?? [];
  if (ring.length < 4) return 0;
  let sum = 0;
  for (let index = 0; index < ring.length - 1; index += 1) {
    const [longitude1, latitude1] = ring[index];
    const [longitude2, latitude2] = ring[index + 1];
    sum += radians(longitude2 - longitude1)
      * (2 + Math.sin(radians(latitude1)) + Math.sin(radians(latitude2)));
  }
  return Math.abs(sum * EARTH_RADIUS_METERS * EARTH_RADIUS_METERS / 2);
}

export function polygonMetrics(boundary) {
  const ring = boundary.coordinates[0].slice(0, -1);
  const squareMeters = calculatePolygonAreaSqMeters(boundary);
  const centroid = ring.reduce(
    (total, [longitude, latitude]) => ({
      latitude: total.latitude + latitude / ring.length,
      longitude: total.longitude + longitude / ring.length,
    }),
    { latitude: 0, longitude: 0 },
  );
  return {
    areaAcres: Number((squareMeters / SQUARE_METERS_PER_ACRE).toFixed(2)),
    areaSqKm: Number((squareMeters / 1_000_000).toFixed(4)),
    centroid,
  };
}

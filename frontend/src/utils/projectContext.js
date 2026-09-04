const KM_PER_LATITUDE_DEGREE = 111.32;

function pointOnSegment(longitude, latitude, [x1, y1], [x2, y2]) {
  const cross = (longitude - x1) * (y2 - y1) - (latitude - y1) * (x2 - x1);
  if (Math.abs(cross) > 1e-10) return false;
  return longitude >= Math.min(x1, x2) && longitude <= Math.max(x1, x2)
    && latitude >= Math.min(y1, y2) && latitude <= Math.max(y1, y2);
}

function pointInPolygon(latitude, longitude, ring) {
  let inside = false;
  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index, index += 1) {
    const currentPoint = ring[index];
    const previousPoint = ring[previous];
    if (pointOnSegment(longitude, latitude, currentPoint, previousPoint)) return true;
    const [currentLongitude, currentLatitude] = currentPoint;
    const [previousLongitude, previousLatitude] = previousPoint;
    const crosses = (currentLatitude > latitude) !== (previousLatitude > latitude)
      && longitude < ((previousLongitude - currentLongitude) * (latitude - currentLatitude))
        / (previousLatitude - currentLatitude) + currentLongitude;
    if (crosses) inside = !inside;
  }
  return inside;
}

export function isPointInProjectContext(latitude, longitude, boundary, bufferKm = 0) {
  const ring = boundary?.type === 'Polygon' ? boundary.coordinates?.[0] ?? [] : [];
  if (!ring.length) return true;
  if (Number(bufferKm) === 0) return pointInPolygon(Number(latitude), Number(longitude), ring);
  const latitudes = ring.map(([, lat]) => Number(lat));
  const longitudes = ring.map(([lng]) => Number(lng));
  const middleLatitude = (Math.min(...latitudes) + Math.max(...latitudes)) / 2;
  const latitudeBuffer = Number(bufferKm) / KM_PER_LATITUDE_DEGREE;
  const longitudeBuffer = Number(bufferKm)
    / (KM_PER_LATITUDE_DEGREE * Math.max(0.2, Math.cos(middleLatitude * Math.PI / 180)));
  return Number(latitude) >= Math.min(...latitudes) - latitudeBuffer
    && Number(latitude) <= Math.max(...latitudes) + latitudeBuffer
    && Number(longitude) >= Math.min(...longitudes) - longitudeBuffer
    && Number(longitude) <= Math.max(...longitudes) + longitudeBuffer;
}

export function filterMapDataToProjectContext(mapData, boundary, bufferKm) {
  if (!mapData) return mapData;
  const contains = (latitude, longitude) => isPointInProjectContext(
    latitude,
    longitude,
    boundary,
    bufferKm,
  );
  const wards = mapData.wards.filter(({ latitude, longitude }) => contains(latitude, longitude));
  const facilities = mapData.facilities.filter(({ latitude, longitude }) => contains(latitude, longitude));
  const roads = mapData.roads.filter((road) => road.geometry?.some(([latitude, longitude]) => (
    contains(latitude, longitude)
  )));
  return { ...mapData, wards, facilities, roads };
}

import { calculateBoundaryMetrics, geoJSONToPositions, positionsToGeoJSON } from './projectGeometry.js';
import { expect, test } from 'vitest';

const positions = [[23.78, 90.40], [23.78, 90.41], [23.79, 90.41], [23.79, 90.40]];

test('converts editable map vertices to closed GeoJSON and calculates area', () => {
  const boundary = positionsToGeoJSON(positions);
  expect(boundary.coordinates[0][0]).toEqual(boundary.coordinates[0].at(-1));
  expect(geoJSONToPositions(boundary)).toEqual(positions);
  expect(calculateBoundaryMetrics(positions).areaAcres).toBeGreaterThan(200);
});

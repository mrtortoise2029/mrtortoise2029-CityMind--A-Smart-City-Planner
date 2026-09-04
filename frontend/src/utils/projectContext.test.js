import { expect, test } from 'vitest';
import { filterMapDataToProjectContext, isPointInProjectContext } from './projectContext.js';

const boundary = { type: 'Polygon', coordinates: [[[90.40, 23.78], [90.41, 23.78], [90.41, 23.79], [90.40, 23.79], [90.40, 23.78]]] };

test('filters existing map data to the project boundary and buffer', () => {
  expect(isPointInProjectContext(23.785, 90.405, boundary, 0)).toBe(true);
  expect(isPointInProjectContext(23.80, 90.405, boundary, 0)).toBe(false);
  expect(isPointInProjectContext(23.795, 90.405, boundary, 1)).toBe(true);
  const filtered = filterMapDataToProjectContext({
    wards: [{ id: 1, latitude: 23.785, longitude: 90.405 }, { id: 2, latitude: 24, longitude: 91 }],
    facilities: [{ id: 1, latitude: 23.785, longitude: 90.405 }],
    roads: [{ id: 1, geometry: [[23.785, 90.405], [23.786, 90.406]] }],
  }, boundary, 0);
  expect(filtered.wards).toHaveLength(1);
  expect(filtered.facilities).toHaveLength(1);
  expect(filtered.roads).toHaveLength(1);
});

test('uses the actual polygon rather than its bounding box in boundary-only mode', () => {
  const triangle = { type: 'Polygon', coordinates: [[[90, 23], [91, 23], [90, 24], [90, 23]]] };
  expect(isPointInProjectContext(23.1, 90.1, triangle, 0)).toBe(true);
  expect(isPointInProjectContext(23.9, 90.9, triangle, 0)).toBe(false);
});

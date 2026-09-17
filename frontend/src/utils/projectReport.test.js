import { expect, test, vi } from 'vitest';
import { createProjectReportPayload, downloadProjectReport } from './projectReport.js';

const input = {
  project: { id: 1, name: 'Bashundhara Residential Area' },
  gapAnalysis: { overview: { overall_gap_percent: 72 } },
  recommendationResult: { recommendations: [{ rank: 1 }] },
};

test('builds a project-scoped evidence package', () => {
  const report = createProjectReportPayload(input);
  expect(report.project.id).toBe(1);
  expect(report.projectGapAnalysis.overview.overall_gap_percent).toBe(72);
  expect(report.recommendationAnalysis.recommendations[0].rank).toBe(1);
  expect(report.dataNotice).toMatch(/simulations/i);
});

test('downloads the report with a stable project filename', () => {
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  const createObjectURL = vi.fn(() => 'blob:citymind-report');
  const revokeObjectURL = vi.fn();
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL });
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectURL });
  const filename = downloadProjectReport(input);
  expect(filename).toBe('bashundhara-residential-area-citymind-report.json');
  expect(createObjectURL).toHaveBeenCalledOnce();
  expect(click).toHaveBeenCalledOnce();
  click.mockRestore();
});

test('exports an already aggregated backend report without replacing its labels', () => {
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:report') });
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
  const reportData = { project_id: 1, growth_prediction: { status: 'READY', data: { confidence: 'SIMULATED' } } };
  downloadProjectReport({ project: input.project, reportData });
  const exportedBlob = URL.createObjectURL.mock.calls[0][0];
  expect(exportedBlob.type).toBe('application/json');
  expect(reportData.growth_prediction.data.confidence).toBe('SIMULATED');
  click.mockRestore();
});

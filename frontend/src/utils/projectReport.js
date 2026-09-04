export function createProjectReportPayload({ gapAnalysis, project, recommendationResult }) {
  return {
    generatedAt: new Date().toISOString(),
    project,
    projectGapAnalysis: gapAnalysis,
    recommendationAnalysis: recommendationResult,
    dataNotice: 'Scores are deterministic planning evidence. Future scenarios are simulations, not approved forecasts.',
  };
}

export function downloadProjectReport(input) {
  const report = createProjectReportPayload(input);
  const filename = `${input.project.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-citymind-report.json`;
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.hidden = true;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  return filename;
}

import type { AnalysisReport, Finding } from './types';

const speechText = (text: string) => text
  .replace(/(\d)–(?=\d)/g, '$1 to ')
  .replace(/\b(\d+(?:\.\d+)?)s\b/g, '$1 seconds')
  .replace(/°/g, ' degrees').replace(/%/g, ' percent')
  .replace(/shoulder–hip–ankle/g, 'shoulder, hip and ankle')
  .replace(/\s+/g, ' ').trim();
export function narrateFinding(finding: Finding) {
  const observation = finding.observation.replace(/^At \d+(?:\.\d+)?s,\s*/i, '');
  return speechText(`At ${finding.timestamp.toFixed(1)} seconds, ${observation} ${finding.suggestion}`);
}
/** Narration is derived from evidence, never a second model inventing corrections. */
export function narrateReport(report: AnalysisReport) {
  const opening = report.status === 'insufficient'
    ? "I couldn't get a dependable movement measurement from this clip. Here's what I could see."
    : report.status === 'partial'
      ? "Okay, there's something we can work with here, though parts of the movement are still unclear."
      : "Okay, let's walk through what I saw.";
  const findings = report.findings.map(narrateFinding);
  const uncertainty = report.limitations[0] || 'This camera view cannot establish whether your technique is safe.';
  return speechText([opening, report.summary, ...findings, `One thing to keep in mind: ${uncertainty}`].join(' '));
}

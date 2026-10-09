import type { AnalysisReport, Finding } from './types';
import { getCoachingMoment, getCoachingReview } from './coaching';

export function narrateFinding(report: AnalysisReport, finding: Finding) {
  return getCoachingMoment(report, finding)?.spokenText || 'I couldn’t get a clear view of this part. Keep it in frame next time.';
}
/** Narration is derived from evidence, never a second model inventing corrections. */
export function narrateReport(report: AnalysisReport) {
  return getCoachingReview(report).spokenText;
}

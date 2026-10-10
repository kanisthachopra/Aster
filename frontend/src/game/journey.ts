import type { AnalysisReport } from '../analysis/types';

export interface JournalEntry { id: string; day: string; exercise: string; report: AnalysisReport; file: File | null; mediaPath?: string | null; filename?: string | null; }
export interface Journey { entries: JournalEntry[]; activity: string[]; protected: string[]; regular: number; reserve: number; week: string; }
const AWARDS = [5, 5, 5, 2.5, 2.5];
export function dayKey(now = new Date()) { return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`; }
export function shiftDay(day: string, offset: number) { const date = new Date(`${day}T12:00:00`); date.setDate(date.getDate() + offset); return dayKey(date); }
export function weekKey(day: string) { return shiftDay(day, -(new Date(`${day}T12:00:00`).getDay() + 6) % 7); }
export function createJourney(day = dayKey()): Journey { return { entries: [], activity: [], protected: [], regular: 0, reserve: 0, week: weekKey(day) }; }
export function settleWeek(journey: Journey, day = dayKey()): Journey {
  const week = weekKey(day);
  if (week <= journey.week) return journey;
  const fullWeek = Array.from({ length: 7 }, (_, i) => shiftDay(journey.week, i)).every(date => journey.activity.includes(date));
  const usedProtection = journey.protected.some(date => weekKey(date) === journey.week);
  return { ...journey, week, regular: 0, reserve: Math.min(100, journey.reserve + (fullWeek && !usedProtection ? 2.5 : 0)) };
}
export function finishReview(journey: Journey, report: AnalysisReport, file: File | null, day = dayKey()): Journey {
  const current = settleWeek(journey, day);
  if (report.status === 'insufficient' || current.entries.some(entry => entry.id === report.id)) return current;
  if (report.status === 'partial') return { ...current, entries: [...current.entries, { id: report.id, day, exercise: report.exercise, report, file }] };
  const alreadyToday = current.activity.includes(day);
  const completed = current.activity.filter(date => weekKey(date) === current.week).length;
  return { ...current, entries: [...current.entries, { id: report.id, day, exercise: report.exercise, report, file }],
    activity: alreadyToday ? current.activity : [...current.activity, day],
    regular: current.regular + (alreadyToday ? 0 : AWARDS[completed] ?? 0) };
}
export function protectDay(journey: Journey, missedDay: string, today = dayKey()): Journey {
  const current = settleWeek(journey, today);
  if (missedDay >= today || weekKey(missedDay) !== current.week || current.activity.includes(missedDay) || current.protected.includes(missedDay)
    || current.protected.filter(day => weekKey(day) === current.week).length >= 3 || current.regular + current.reserve < 10) return current;
  const fromRegular = Math.min(10, current.regular);
  return { ...current, regular: current.regular - fromRegular, reserve: current.reserve - (10 - fromRegular), protected: [...current.protected, missedDay] };
}
export function streak(journey: Journey, today = dayKey()) {
  const days = new Set([...journey.activity, ...journey.protected]);
  let date = days.has(today) ? today : shiftDay(today, -1), count = 0;
  while (days.has(date)) { count++; date = shiftDay(date, -1); }
  return count;
}

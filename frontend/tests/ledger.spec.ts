import { test, expect } from '@playwright/test';
import { createJourney, finishReview, protectDay, settleWeek, shiftDay, streak } from '../src/game/journey';
import type { AnalysisReport } from '../src/analysis/types';

// A report stub tests reward bookkeeping only; it is never presented as analysis evidence.
const report = (id: string, status: 'usable' | 'insufficient' = 'usable') => ({ id, status, exercise: 'pushup' } as AnalysisReport);
const monday = '2026-10-05';
test('only finished usable reviews earn energy; repeat clips cannot multiply daily credit', () => {
  const initial = createJourney(monday);
  expect(finishReview(initial, report('bad', 'insufficient'), null, monday)).toEqual(initial);
  const first = finishReview(initial, report('one'), null, monday);
  expect(first.regular).toBe(5);
  expect(finishReview(first, report('one'), null, monday)).toEqual(first);
  const second = finishReview(first, report('two'), null, monday);
  expect(second.entries).toHaveLength(2);
  expect(second.activity).toHaveLength(1);
  expect(second.regular).toBe(5);
});
test('weekly awards stop after five days; reserve requires seven actual days and caps at 100', () => {
  let journey = createJourney(monday);
  const totals = [5, 10, 15, 17.5, 20, 20, 20];
  for (let day = 0; day < 7; day++) {
    journey = finishReview(journey, report(String(day)), null, shiftDay(monday, day));
    expect(journey.regular).toBe(totals[day]);
  }
  const next = settleWeek(journey, shiftDay(monday, 7));
  expect(next.regular).toBe(0); expect(next.reserve).toBe(2.5);
  expect(settleWeek(next, shiftDay(monday, 8))).toEqual(next);
  expect(settleWeek({ ...journey, reserve: 99 }, shiftDay(monday, 7)).reserve).toBe(100);
  const fiveDays = { ...journey, activity: journey.activity.slice(0, 5) };
  expect(settleWeek(fiveDays, shiftDay(monday, 7)).reserve).toBe(0);
});
test('protection spends weekly energy before reserve, limits three days, never fabricates practice', () => {
  let journey = { ...createJourney(monday), regular: 15, reserve: 100 };
  const today = shiftDay(monday, 6);
  journey = protectDay(journey, monday, today);
  expect(journey.regular).toBe(5); expect(journey.reserve).toBe(100);
  expect(protectDay(journey, monday, today)).toEqual(journey);
  journey = protectDay(journey, shiftDay(monday, 1), today);
  expect(journey.regular).toBe(0); expect(journey.reserve).toBe(95);
  journey = protectDay(journey, shiftDay(monday, 2), today);
  expect(protectDay(journey, shiftDay(monday, 3), today)).toEqual(journey);
  expect(protectDay(journey, today, today)).toEqual(journey);
  expect(journey.activity).toEqual([]);
  expect(protectDay(createJourney(monday), monday, today).protected).toEqual([]);
});
test('an unprotected missed day breaks the streak; deletion does not erase activity', () => {
  const journey = { ...createJourney(monday), activity: [monday, shiftDay(monday, 2)] };
  expect(streak(journey, shiftDay(monday, 2))).toBe(1);
  expect(streak({ ...journey, protected: [shiftDay(monday, 1)] }, shiftDay(monday, 2))).toBe(3);
  expect(streak(journey, shiftDay(monday, 4))).toBe(0);
  const completed = finishReview(createJourney(monday), report('one'), null, monday);
  const deleted = { ...completed, entries: [] };
  expect(finishReview(deleted, report('new'), null, monday).regular).toBe(5);
});

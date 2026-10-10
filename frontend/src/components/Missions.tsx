import { dayKey, shiftDay, streak, weekKey, type Journey } from '../game/journey';
import { useState } from 'react';
export default function Missions({ journey, onProtect, persistent = false, timezone }: { journey: Journey; onProtect: (day: string, allowReserve: boolean) => void | Promise<void>; persistent?: boolean; timezone?: string }) {
  const [pending, setPending] = useState(''), [error, setError] = useState(''), [confirmReserve, setConfirmReserve] = useState('');
  const zone = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const today = persistent ? ['year', 'month', 'day'].map(type => parts.find(part => part.type === type)?.value).join('-') : dayKey();
  const week = weekKey(today), completed = journey.activity.filter(day => weekKey(day) === week).length;
  async function protect(day: string, allowReserve: boolean) {
    if (pending) return;
    if (journey.regular < 10 && !allowReserve) { setConfirmReserve(day); return; }
    setPending(day); setError('');
    try { await onProtect(day, allowReserve); setConfirmReserve(''); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Protection did not save. Please try again.'); }
    finally { setPending(''); }
  }
  const protectionCount = journey.protected.filter(day => weekKey(day) === week).length;
  const days = Array.from({ length: 7 }, (_, i) => shiftDay(week, i));
  return <section>
    <p className="dialogue-line">“The point is to learn something about your movement. The numbers come after.”</p>
    <div className="mission-stats"><div><strong>{streak(journey, today)}</strong><span>day streak</span></div><div><strong>{journey.regular}</strong><span>weekly energy</span></div><div><strong>{journey.reserve}</strong><span>reserve / 100</span></div></div>
    <div className={`mission-card ${journey.activity.length ? 'done' : ''}`}><span>{journey.activity.length ? '✓' : '01'}</span><div><strong>First contact with your movement</strong><p>Analyze a usable clip, review its evidence, then finish and return to the park.</p></div></div>
    <p className="eyebrow">THIS WEEK / {Math.min(5, completed)} OF 5 ACTIVITY DAYS</p>
    <div className="weekly-tasks">{[5, 5, 5, 2.5, 2.5].map((credit, i) => <div key={i} className={completed > i ? 'done' : ''}><span>{completed > i ? '✓' : `D${i + 1}`}</span><strong>+{credit}</strong><small>energy</small></div>)}</div>
    <p className="subtle">One qualifying completion per calendar day earns activity progress. Extra reviews are useful, but do not multiply the day’s reward.</p>
    <details className="mission-rules"><summary>How energy, reserves and protection work</summary><ul><li>Weekly energy resets on Monday. Days six and seven earn no regular energy.</li><li>Complete all seven actual activity days without using protection to earn 2.5 reserve at the weekly rollover. Reserve carries over, up to 100.</li><li>Protect a missed day for 10 credits. Weekly energy is spent first, then reserve. Maximum three protections per week.</li><li>Protection preserves a streak; it does not count as practice or improvement. An unprotected missed day resets the streak.</li><li>Movement comparisons do not prove physical transformation. Train according to your needs, including rest; rewards are not a training prescription.</li></ul></details>
    <p className="eyebrow">CALENDAR / {protectionCount} OF 3 PROTECTIONS USED</p>
    <div className="week-calendar">{days.map(day => { const actual = journey.activity.includes(day), protectedDay = journey.protected.includes(day), missed = day < today && !actual && !protectedDay; return <div key={day}><span>{new Date(`${day}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short' })}</span><strong>{actual ? '✓' : protectedDay ? '◇' : day === today ? 'Today' : '—'}</strong>{missed && <button className="text-button" disabled={!!pending || journey.regular + journey.reserve < 10 || protectionCount >= 3} onClick={() => void protect(day, false)}>Protect · 10</button>}</div>; })}</div>
    {confirmReserve && <div className="status-note"><p>Use {10 - Math.min(10, journey.regular)} saved reserve credits to protect {confirmReserve}?</p><button className="secondary" disabled={!!pending} onClick={() => void protect(confirmReserve, true)}>Use reserve</button><button className="text-button" disabled={!!pending} onClick={() => setConfirmReserve('')}>Keep my reserve</button></div>}
    {error && <p className="status-note" role="alert">{error}</p>}
    <p className="fine-print">{persistent ? 'Your account keeps this progress between visits.' : 'Guest progress lives in this tab’s memory and clears on reload.'} Calendar uses {zone}.</p>
  </section>;
}


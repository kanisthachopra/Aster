import { dayKey, shiftDay, streak, weekKey, type Journey } from '../game/journey';
export default function Missions({ journey, onProtect }: { journey: Journey; onProtect: (day: string) => void }) {
  const today = dayKey(), week = weekKey(today), completed = journey.activity.filter(day => weekKey(day) === week).length;
  const protectionCount = journey.protected.filter(day => weekKey(day) === week).length;
  const days = Array.from({ length: 7 }, (_, i) => shiftDay(week, i));
  return <section>
    <p className="dialogue-line">“The point is to learn something about your movement. The numbers come after.”</p>
    <div className="mission-stats"><div><strong>{streak(journey)}</strong><span>day streak</span></div><div><strong>{journey.regular}</strong><span>weekly energy</span></div><div><strong>{journey.reserve}</strong><span>reserve / 100</span></div></div>
    <div className={`mission-card ${journey.activity.length ? 'done' : ''}`}><span>{journey.activity.length ? '✓' : '01'}</span><div><strong>First contact with your movement</strong><p>Analyze a usable clip, review its evidence, then finish and return to the park.</p></div></div>
    <p className="eyebrow">THIS WEEK / {Math.min(5, completed)} OF 5 ACTIVITY DAYS</p>
    <div className="weekly-tasks">{[5, 5, 5, 2.5, 2.5].map((credit, i) => <div key={i} className={completed > i ? 'done' : ''}><span>{completed > i ? '✓' : `D${i + 1}`}</span><strong>+{credit}</strong><small>energy</small></div>)}</div>
    <p className="subtle">One qualifying completion per calendar day earns activity progress. Extra reviews are useful, but do not multiply the day’s reward.</p>
    <details className="mission-rules"><summary>How energy, reserves and protection work</summary><ul><li>Weekly energy resets on Monday. Days six and seven earn no regular energy.</li><li>Complete all seven actual activity days without using protection to earn 2.5 reserve at the weekly rollover. Reserve carries over, up to 100.</li><li>Protect a missed day for 10 credits. Weekly energy is spent first, then reserve. Maximum three protections per week.</li><li>Protection preserves a streak; it does not count as practice or improvement. An unprotected missed day resets the streak.</li><li>Movement comparisons do not prove physical transformation. Train according to your needs, including rest; rewards are not a training prescription.</li></ul></details>
    <p className="eyebrow">CALENDAR / {protectionCount} OF 3 PROTECTIONS USED</p>
    <div className="week-calendar">{days.map(day => { const actual = journey.activity.includes(day), protectedDay = journey.protected.includes(day), missed = day < today && !actual && !protectedDay; return <div key={day}><span>{new Date(`${day}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short' })}</span><strong>{actual ? '✓' : protectedDay ? '◇' : day === today ? 'Today' : '—'}</strong>{missed && <button className="text-button" disabled={journey.regular + journey.reserve < 10 || protectionCount >= 3} onClick={() => onProtect(day)}>Protect · 10</button>}</div>; })}</div>
    <p className="fine-print">Guest progress lives in this tab’s memory and clears on reload. Calendar uses {Intl.DateTimeFormat().resolvedOptions().timeZone}. Persistent accounts and cross-device progress come later.</p>
  </section>;
}


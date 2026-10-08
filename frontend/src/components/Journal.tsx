import { useEffect, useState } from 'react';
import { EXERCISES } from '../game/types';
import type { JournalEntry } from '../game/journey';

function Entry({ entry, onDelete }: { entry: JournalEntry; onDelete: (id: string, mediaOnly: boolean) => void }) {
  const [url, setUrl] = useState('');
  const [confirm, setConfirm] = useState<'clip' | 'entry' | null>(null);
  useEffect(() => { if (!entry.file) { setUrl(''); return; } const value = URL.createObjectURL(entry.file); setUrl(value); return () => URL.revokeObjectURL(value); }, [entry.file]);
  return <details className="journal-entry"><summary><span>{EXERCISES.find(ex => ex.id === entry.exercise)?.name}</span><small>{entry.day} · {entry.report.findings.length} observations</small></summary>
    <p>{entry.report.summary}</p>
    {entry.report.status === 'partial' && <p className="status-note">Limited observations · saved for reference, without activity or energy credit.</p>}
    {url ? <video src={url} controls preload="metadata" aria-label="Journal source recording" /> : <p className="fine-print">Source recording removed. Retained observations remain below.</p>}
    {entry.report.findings.map(item => <div className="journal-finding" key={item.id}><strong>{item.timestamp.toFixed(1)}s · {item.title}</strong><p>{item.observation}</p><p>{item.suggestion}</p></div>)}
    <details className="master-controls"><summary>Master Control · manage this entry</summary>
      <p className="fine-print">Removing a clip keeps its written observations. Removing the entry clears both. Earned activity history is separate from retained media.</p>
      {confirm ? <div role="alert"><p>{confirm === 'clip' ? 'Remove this recording from the guest journal?' : 'Remove this review and its recording from the guest journal?'}</p><button className="secondary" onClick={() => { onDelete(entry.id, confirm === 'clip'); setConfirm(null); }}>Remove {confirm === 'clip' ? 'recording' : 'entry'}</button><button className="text-button" onClick={() => setConfirm(null)}>Keep it</button></div> : <div className="tour-actions">{entry.file && <button className="text-button" onClick={() => setConfirm('clip')}>Remove recording</button>}<button className="text-button" onClick={() => setConfirm('entry')}>Remove review and recording</button></div>}
    </details>
  </details>;
}
export default function Journal({ entries, onDelete, onSettings }: { entries: JournalEntry[]; onDelete: (id: string, mediaOnly: boolean) => void; onSettings: () => void }) {
  return <section><p className="subtle">Your movement, your notes. Everything here belongs to this guest visit.</p>
    {entries.length ? [...entries].reverse().map(entry => <Entry key={entry.id} entry={entry} onDelete={onDelete} />) : <div className="empty-journal"><span>▤</span><h3>Your first page is waiting.</h3><p>Complete a usable movement review and finish at the station to add it here.</p></div>}
    <button className="secondary" onClick={onSettings}>Master Control · sound & comfort ↗</button>
    <p className="fine-print">Recordings and feedback remain in memory. Reloading or closing this page clears the guest journal. No personal recording is uploaded to a server.</p>
  </section>;
}

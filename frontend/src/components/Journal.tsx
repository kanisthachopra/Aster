import { useEffect, useState } from 'react';
import { EXERCISES } from '../game/types';
import type { JournalEntry } from '../game/journey';
import { apiRequest } from '../account/client';

function Entry({ entry, onDelete }: { entry: JournalEntry; onDelete: (id: string, mediaOnly: boolean) => void | Promise<void> }) {
  const [url, setUrl] = useState('');
  const [confirm, setConfirm] = useState<'clip' | 'entry' | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  async function playSaved() {
    setBusy(true); setError('');
    try { const result = await apiRequest<{ url: string }>('media/sign', { reviewId: entry.id }); setUrl(result.url); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'The recording did not load.'); }
    finally { setBusy(false); }
  }
  async function remove() {
    if (!confirm || busy) return;
    setBusy(true); setError('');
    try { await onDelete(entry.id, confirm === 'clip'); setConfirm(null); setUrl(''); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'This item could not be removed. Please try again.'); }
    finally { setBusy(false); }
  }
  useEffect(() => { if (!entry.file) { setUrl(''); return; } const value = URL.createObjectURL(entry.file); setUrl(value); return () => URL.revokeObjectURL(value); }, [entry.file]);
  return <details className="journal-entry"><summary><span>{EXERCISES.find(ex => ex.id === entry.exercise)?.name}</span><small>{entry.day} · {entry.report.findings.length} observations</small></summary>
    <p>{entry.report.summary}</p>
    {entry.report.status === 'partial' && <p className="status-note">Limited observations · saved for reference, without activity or energy credit.</p>}
    {url ? <><video src={url} controls preload="metadata" aria-label="Journal source recording" />{entry.mediaPath && <button className="text-button" disabled={busy} onClick={() => void playSaved()}>Refresh recording access</button>}</> : entry.mediaPath ? <button className="secondary" disabled={busy} onClick={() => void playSaved()}>{busy ? 'Opening your recording…' : 'Play my saved recording'}</button> : <p className="fine-print">Source recording not retained. Your written observations remain below.</p>}
    {error && <p className="status-note" role="alert">{error}</p>}
    {entry.report.findings.map(item => <div className="journal-finding" key={item.id}><strong>{item.timestamp.toFixed(1)}s · {item.title}</strong><p>{item.observation}</p><p>{item.suggestion}</p></div>)}
    <details className="master-controls"><summary>Master Control · manage this entry</summary>
      <p className="fine-print">Removing a clip keeps its written observations. Removing the entry clears both. Earned activity history is separate from retained media.</p>
      {confirm ? <div role="alert"><p>{confirm === 'clip' ? 'Permanently remove this recording from your journal? The notes will remain.' : 'Permanently remove this review and its recording from your journal?'}</p><button className="secondary" disabled={busy} onClick={() => void remove()}>{busy ? 'Removing…' : `Remove ${confirm === 'clip' ? 'recording' : 'entry'}`}</button><button className="text-button" disabled={busy} onClick={() => setConfirm(null)}>Keep it</button></div> : <div className="tour-actions">{(entry.file || entry.mediaPath) && <button className="text-button" onClick={() => setConfirm('clip')}>Remove recording</button>}<button className="text-button" onClick={() => setConfirm('entry')}>Remove review and recording</button></div>}
    </details>
  </details>;
}
export default function Journal({ entries, onDelete, onSettings, persistent = false }: { entries: JournalEntry[]; onDelete: (id: string, mediaOnly: boolean) => void | Promise<void>; onSettings: () => void; persistent?: boolean }) {
  return <section><p className="subtle">Your movement, your notes. {persistent ? 'Your private journey returns when you sign in.' : 'Everything here belongs to this guest visit.'}</p>
    {entries.length ? [...entries].reverse().map(entry => <Entry key={entry.id} entry={entry} onDelete={onDelete} />) : <div className="empty-journal"><span>▤</span><h3>Your first page is waiting.</h3><p>Complete a usable movement review and finish at the station to add it here.</p></div>}
    <button className="secondary" onClick={onSettings}>Master Control · sound & comfort ↗</button>
    <p className="fine-print">{persistent ? 'Notes are saved in your account. Recordings are saved only when you choose to upload them, and play through temporary private links. Master Control removes selected records; earned activity history remains.' : 'Recordings and feedback remain in memory. Reloading or closing this page clears the guest journal. No personal recording is uploaded to a server.'}</p>
  </section>;
}

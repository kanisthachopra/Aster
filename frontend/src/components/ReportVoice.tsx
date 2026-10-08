import { useCallback, useEffect, useRef, useState } from 'react';
import type { AnalysisReport } from '../analysis/types';
import { narrateFinding, narrateReport } from '../analysis/narration';

export interface ReviewSpeech {
  getStatus: () => Promise<{ available: boolean; message: string }>;
  speak: (text: string, options?: { signal?: AbortSignal; onStatus?: (status: 'preparing' | 'speaking') => void }) => Promise<{ status: 'completed' | 'unavailable' | 'error' | 'cancelled' | 'muted'; message?: string }>;
  stop: () => void;
}
export default function ReportVoice({ report, speech }: { report: AnalysisReport; speech?: ReviewSpeech }) {
  const transcript = narrateReport(report);
  const [state, setState] = useState('Checking voice connection…');
  const [playing, setPlaying] = useState(false);
  const [available, setAvailable] = useState(false);
  const [activeText, setActiveText] = useState(transcript);
  const controller = useRef<AbortController | null>(null);
  const mounted = useRef(false);
  const read = useCallback(async (text: string) => {
    if (!speech) return;
    controller.current?.abort(); speech.stop();
    const task = new AbortController(); controller.current = task;
    setPlaying(true); setActiveText(text); setState('Preparing your spoken feedback…');
    try {
      const result = await speech.speak(text, { signal: task.signal, onStatus: status => {
        if (!task.signal.aborted && mounted.current) setState(status === 'speaking' ? 'ORBIT is walking through your review.' : 'Preparing your spoken feedback…');
      } });
      if (!task.signal.aborted && mounted.current) {
        setPlaying(false);
        setState(result.status === 'completed' ? 'Review read aloud. You can listen again or choose a moment below.' : result.message || 'Voice paused. Your full review is still below.');
      }
    } catch {
      if (!task.signal.aborted && mounted.current) { setPlaying(false); setState('The voice connection failed. Try again; your review is still here.'); }
    }
  }, [speech]);
  useEffect(() => {
    mounted.current = true;
    let active = true;
    if (!speech) setState('Spoken feedback is not connected. You can read every observation below.');
    else void speech.getStatus().then(status => {
      if (!active) return;
      setAvailable(status.available); setState(status.message);
      if (status.available) void read(transcript);
    }).catch(() => { if (active) setState('The voice connection is unavailable. Your written feedback is ready.'); });
    // Abort only this reading: closing the station may already have started
    // the next mission line, which must not be cancelled by old-view cleanup.
    return () => { active = false; mounted.current = false; controller.current?.abort(); };
  }, [report.id, speech, transcript, read]);
  function stop() { controller.current?.abort(); speech?.stop(); setPlaying(false); setState('Voice paused. Listen again whenever you’re ready.'); }
  return <section className="report-voice" aria-label="Spoken feedback">
    <div className="voice-heading"><span className={`voice-indicator ${playing ? 'is-speaking' : ''}`} aria-hidden="true">◉</span><div><p className="eyebrow">ORBIT / YOUR REVIEW, OUT LOUD</p><p role="status">{state}</p></div></div>
    <div className="analysis-actions">{playing ? <button className="text-button" onClick={stop}>Stop voice</button> : <button className="text-button" disabled={!available} onClick={() => void read(transcript)}>Listen to review</button>}</div>
    {available && report.findings.length > 0 && <div className="voice-moments" aria-label="Listen to a specific observation">{report.findings.map(finding => <button className="text-button" key={finding.id} onClick={() => void read(narrateFinding(finding))}>Listen · {finding.timestamp.toFixed(1)}s · {finding.title}</button>)}</div>}
    <details><summary>Spoken transcript</summary><p>{activeText}</p></details>
    <p className="fine-print">When voice is connected, only this feedback text is sent to Deepgram. Your recording stays here.</p>
  </section>;
}

import { useCallback, useEffect, useRef, useState } from 'react';
import type { AnalysisReport } from '../analysis/types';
import { getCoachingReview } from '../analysis/coaching';
import type { SpeakOptions, SpeechResult } from '../speech/types';

export interface ReviewSpeech {
  getStatus: () => Promise<{ available: boolean; message: string }>;
  prepare?: () => Promise<SpeechResult>;
  speak: (text: string, options?: SpeakOptions) => Promise<SpeechResult>;
  stop: () => void;
}
type VoiceState = 'checking' | 'preparing' | 'speaking' | 'ready' | 'paused' | 'error' | 'muted';
export default function ReportVoice({ report, speech, showDetails = false, onMoment }: {
  report: AnalysisReport; speech?: ReviewSpeech; showDetails?: boolean; onMoment?: (timestamp: number) => void;
}) {
  const coaching = getCoachingReview(report), transcript = coaching.spokenText;
  const [state, setState] = useState<VoiceState>('checking');
  const [reason, setReason] = useState('');
  const [hasPlayed, setHasPlayed] = useState(false);
  const [activeText, setActiveText] = useState(transcript);
  const controller = useRef<AbortController | null>(null);
  const mounted = useRef(false);
  const interaction = useRef(0);
  const busy = state === 'checking' || state === 'preparing' || state === 'speaking';
  const read = useCallback(async (text: string) => {
    interaction.current++;
    if (!speech) { setReason('Voice is not connected in this window. Your written feedback is available.'); setState('error'); return; }
    controller.current?.abort(); speech.stop();
    const task = new AbortController(); controller.current = task;
    setActiveText(text); setReason(''); setState('preparing');
    try {
      const result = await speech.speak(text, { signal: task.signal, onStatus: status => {
        if (!task.signal.aborted && mounted.current) setState(status);
      } });
      if (!task.signal.aborted && mounted.current) {
        if (result.status === 'completed') { setHasPlayed(true); setState('ready'); }
        else if (result.status === 'cancelled') setState('paused');
        else { setReason(result.message || 'The voice connection stopped. Try again, or open your written feedback.'); setState(result.status === 'muted' ? 'muted' : 'error'); }
      }
    } catch {
      if (!task.signal.aborted && mounted.current) { setState('error'); setReason('Voice couldn’t connect. Try again, or open your written feedback.'); }
    }
  }, [speech]);
  useEffect(() => {
    mounted.current = true;
    let active = true;
    const initialInteraction = interaction.current;
    if (!speech) { setState('error'); setReason('Voice is not connected in this window. Your written feedback is available.'); }
    else void speech.getStatus().then(status => {
      if (!active || interaction.current !== initialInteraction) return;
      if (status.available) void read(transcript);
      else { setState('error'); setReason(status.message); }
    }).catch(() => { if (active && interaction.current === initialInteraction) { setState('error'); setReason('Voice couldn’t connect. Try again, or open your written feedback.'); } });
    // Abort only this reading: closing the station may already have started
    // the next mission line, which must not be cancelled by old-view cleanup.
    return () => { active = false; mounted.current = false; controller.current?.abort(); };
  }, [report.id, speech, transcript, read]);
  function stop() { interaction.current++; controller.current?.abort(); speech?.stop(); setState('paused'); }
  const label = state === 'checking' || state === 'preparing' ? 'One moment. Getting your voice reply ready.'
    : state === 'speaking' ? 'I’m talking you through your clip.'
      : state === 'ready' ? 'That’s your review. Take another look whenever you like.'
        : state === 'paused' ? 'Paused. Pick it up when you’re ready.'
          : state === 'muted' ? 'Voice is muted. Turn up Dialogue in Settings.'
            : 'Voice couldn’t play. You can retry or read your feedback.';
  return <section className="report-voice voice-first" aria-label="Spoken feedback" data-voice-state={state}>
    <div className="voice-heading"><span className={`voice-avatar ${state === 'speaking' ? 'is-speaking' : ''}`} aria-hidden="true"><i /><i /><i /><i /></span><div><p className="eyebrow">ORBIT</p><p role="status">{label}</p></div></div>
    <div className="voice-actions">{busy ? <button className="secondary" onClick={stop}>Stop voice <span aria-hidden="true">Ⅱ</span></button> : <button className="secondary" onClick={() => void read(transcript)}>{state === 'error' ? 'Try voice again' : hasPlayed ? 'Listen again' : 'Play feedback'} <span aria-hidden="true">▶</span></button>}</div>
    {(state === 'error' || state === 'muted') && <details className="voice-help"><summary>Voice connection help</summary><p>{reason}</p></details>}
    {showDetails && <div className="voice-written">{coaching.moments.length > 0 && <div className="voice-moments" aria-label="Listen to one part">{coaching.moments.map(moment => <button className="text-button" key={moment.id} onClick={() => { onMoment?.(moment.timestamp); void read(moment.spokenText); }}>Hear {moment.title.toLowerCase()} · {moment.timestamp.toFixed(1)}s</button>)}</div>}<details><summary>What ORBIT says</summary><p>{activeText}</p></details><p className="fine-print">Only feedback text goes to the voice service. Your video stays here.</p></div>}
  </section>;
}

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Exercise } from '../game/types';
import { analyzeVideo } from '../analysis/analyzeVideo';
import { POSE_CONNECTIONS, type AnalysisProgress, type AnalysisReport, type EvidenceFrame } from '../analysis/types';
import { visible } from '../analysis/measurements';
import { drawTrackedFrame } from '../analysis/drawTrackedFrame';
import { coachingReport, getCoachingReview } from '../analysis/coaching';
import { DEFAULT_COACHING_CONTEXT, type CoachingContext } from '../analysis/coachingContext';
import ReportVoice, { type ReviewSpeech } from './ReportVoice';
import RecordingGuide from './RecordingGuide';
import CoachCheckIn from './CoachCheckIn';
import CoachingConversation from './CoachingConversation';

function PoseOverlay({ frame }: { frame?: EvidenceFrame }) {
  if (!frame) return null;
  const points = frame.landmarks;
  return <svg className="pose-overlay" viewBox="0 0 1 1" preserveAspectRatio="none" aria-label="Measured pose landmarks for this sampled frame">
    {POSE_CONNECTIONS.map(([a, b]) => visible(points[a]) && visible(points[b]) && <line key={`${a}-${b}`} x1={points[a].x} y1={points[a].y} x2={points[b].x} y2={points[b].y} />)}
    {points.map((point, i) => i >= 11 && visible(point) && <circle key={i} cx={point.x} cy={point.y} r=".005" />)}
  </svg>;
}
export default function ClipPreview({ exercise, onFinish, onSpeak, speech, persistent = false, reducedMotion = false }: { exercise: Exercise; onFinish: (report: AnalysisReport, file: File, saveMedia?: boolean) => void | Promise<void>; onSpeak: (key: string) => void; speech?: ReviewSpeech; persistent?: boolean; reducedMotion?: boolean }) {
  const [context, setContext] = useState<CoachingContext>({...DEFAULT_COACHING_CONTEXT});
  const segmentEnd = useRef<number | null>(null);
  const [file, setFile] = useState<File | null>(null), [url, setUrl] = useState(''), [error, setError] = useState('');
  const [duration, setDuration] = useState<number | null>(null), [report, setReport] = useState<AnalysisReport | null>(null);
  const [progress, setProgress] = useState<AnalysisProgress | null>(null), [busy, setBusy] = useState(false), [acknowledged, setAcknowledged] = useState(false);
  const [frame, setFrame] = useState<EvidenceFrame>(), [showPose, setShowPose] = useState(false), [dimensions, setDimensions] = useState([16, 9]);
  const input = useRef<HTMLInputElement>(null), video = useRef<HTMLVideoElement>(null), controller = useRef<AbortController | null>(null);
  const results = useRef<HTMLElement>(null);
  const liveCanvas = useRef<HTMLCanvasElement>(null);
  const [showTracking, setShowTracking] = useState(true);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [saveMedia, setSaveMedia] = useState(false), [finishing, setFinishing] = useState(false), [finishError, setFinishError] = useState('');
  async function finish() {
    if (!report || !file || finishing) return;
    setFinishing(true); setFinishError('');
    try { await onFinish(coachingReport(report, getCoachingReview(report, context)), file, saveMedia); }
    catch (reason) { setFinishError(reason instanceof Error ? reason.message : 'Your review did not save. Please try again.'); }
    finally { setFinishing(false); }
  }
  const coaching = useMemo(() => report ? getCoachingReview(report, context) : null, [report, context]);
  const trackedJoints = progress?.frame?.landmarks.filter((point, i) => i >= 11 && visible(point)).length ?? 0;
  const scrollBehavior = (): ScrollBehavior => document.querySelector('.app.reduce-motion') || matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth';
  useEffect(() => { if (report) results.current?.scrollIntoView({ block: 'nearest', behavior: scrollBehavior() }); }, [report]);
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => { if (!file) { setUrl(''); return; } const objectUrl = URL.createObjectURL(file); setUrl(objectUrl); return () => URL.revokeObjectURL(objectUrl); }, [file]);
  function select(next?: File) {
    if (!next || finishing) return;
    controller.current?.abort(); speech?.stop(); setBusy(false); setProgress(null); setReport(null); setDetailsOpen(false); setAcknowledged(false); setFrame(undefined); setShowPose(false); setError(''); setDuration(null);
    if (!['video/mp4', 'video/webm', 'video/quicktime'].includes(next.type)) { setFile(null); setError('Choose an MP4, WebM or MOV video. Your browser must support its video codec.'); return; }
    if (next.size > 150 * 1024 * 1024 || next.size === 0) { setFile(null); setError('Choose a non-empty video under 150 MB.'); return; }
    setFile(next);
  }
  function focus(timestamp: number, frames = report?.frames, reveal = true) {
    if (!video.current) return;
    segmentEnd.current = null; video.current.pause(); video.current.currentTime = timestamp;
    const nearest = frames?.reduce<EvidenceFrame | undefined>((best, item) => !best || Math.abs(item.timestamp - timestamp) < Math.abs(best.timestamp - timestamp) ? item : best, undefined);
    setFrame(nearest); setShowPose(true);
    if (reveal) video.current.scrollIntoView({ block: 'center', behavior: scrollBehavior() });
  }
  function replay(timestamp: number, endTimestamp?: number) {
    focus(timestamp, report?.frames, false);
    if (!video.current) return;
    segmentEnd.current = endTimestamp ?? Math.min(timestamp + 3, video.current.duration);
    void video.current.play().catch(() => setError('Press play on your recording to watch this moment.'));
  }
  async function analyze() {
    if (!file || busy || finishing) return;
    // Activate audio while this click still counts as a browser user gesture.
    void speech?.prepare?.();
    const task = new AbortController(); controller.current?.abort(); controller.current = task;
    setBusy(true); setError(''); setReport(null); setDetailsOpen(false); setAcknowledged(false); setShowPose(false); video.current?.pause(); onSpeak('analysis-start');
    try {
      const result = await analyzeVideo(file, exercise.id, update => { if (!task.signal.aborted) setProgress(update); }, task.signal, { onFrame: (bitmap, sample) => {
        if (!task.signal.aborted && liveCanvas.current) drawTrackedFrame(liveCanvas.current, bitmap, sample);
      } });
      if (task.signal.aborted) return;
      setReport(result); focus(getCoachingReview(result, context).moments[0]?.timestamp ?? result.frames.find(item => item.metrics)?.timestamp ?? 0, result.frames, false);
    } catch (cause) { if (!task.signal.aborted) setError(cause instanceof Error ? cause.message : 'I could not process this clip. Try a different recording.'); }
    finally { if (controller.current === task) { setBusy(false); setProgress(null); } }
  }
  function cancel() { controller.current?.abort(); setBusy(false); setProgress(null); setError('Analysis stopped. Your clip is still here when you’re ready.'); }
  return <div className={`analysis-workspace voice-review ${report ? 'has-review' : ''}`}>
    <div className="review-steps" aria-label="Review steps"><span className={file ? 'done' : 'active'}>01 · Record</span><span className={busy ? 'active' : report ? 'done' : ''}>02 · Analyze</span><span className={report ? 'active' : ''}>03 · Review</span><span>04 · Return</span></div>
    {!report && <><details className="recording-tips"><summary>Show me how to record</summary><RecordingGuide exercise={exercise} reducedMotion={reducedMotion} onSpeak={speech ? text => { speech.stop(); void speech.speak(text).catch(() => setError('Voice tips could not play. The instructions are shown above.')); } : undefined} /></details></>}
    <div className={`review-grid review-stage ${!report ? "with-checkin" : ""}`}>
      <section className="clip-section"><p className="eyebrow">YOUR RECORDING / STAYS ON THIS COMPUTER</p>
        {url ? <div className="video-wrap"><div className="evidence-player" style={{ aspectRatio: `${dimensions[0]} / ${dimensions[1]}`, width: `min(100%, ${320 * dimensions[0] / dimensions[1]}px, ${38 * dimensions[0] / dimensions[1]}vh)`, marginInline: 'auto' }}>
          <video ref={video} key={url} src={url} controls={!busy} tabIndex={busy ? -1 : 0} preload="metadata" aria-label={`${exercise.name} recording preview`} onPlay={() => setShowPose(false)}
            onTimeUpdate={event => { if (segmentEnd.current !== null && event.currentTarget.currentTime >= segmentEnd.current) { event.currentTarget.pause(); segmentEnd.current = null; } }}
            onSeeking={() => setShowPose(false)} onSeeked={event => {
              const element = event.currentTarget;
              const sample = report?.frames.find(item => Math.abs(item.timestamp - element.currentTime) < .05);
              setFrame(sample); setShowPose(element.paused && !!sample);
            }}
            onLoadedMetadata={event => { const element = event.currentTarget, seconds = element.duration; setDimensions([element.videoWidth || 16, element.videoHeight || 9]); if (Number.isFinite(seconds) && (seconds < 2 || seconds > 120)) { setError('Choose a playable clip between 2 and 120 seconds.'); setFile(null); } else setDuration(Number.isFinite(seconds) ? seconds : null); }}
            onError={() => { setError('This browser could not play that recording. Try an MP4 with H.264 video or a WebM file.'); setFile(null); }} />
          {showPose && <PoseOverlay frame={frame} />}
          {busy && <div className={`live-tracking ${showTracking ? '' : 'tracking-hidden'}`}>
            <canvas ref={liveCanvas} aria-label="Live analysis: sampled recording with measured pose skeleton" />
            <div className="tracking-label"><span>{progress?.frame ? `${progress.frame.timestamp.toFixed(1)}s / ${duration?.toFixed(1) ?? '…'}s` : 'Getting ready'}</span><span>{trackedJoints ? 'FOLLOWING YOUR MOVEMENT' : progress?.frame ? 'THIS PART IS UNCLEAR' : 'LOOKING FOR YOU'}</span></div>
          </div>}
        </div><div className="file-meta"><span title={file?.name}>{file?.name}</span><span>{duration === null ? 'Duration unavailable' : `${duration.toFixed(1)}s`}</span></div>
        {showPose && frame && <p className="evidence-caption">A closer look · {frame.timestamp.toFixed(1)}s</p>}</div> : <button className="upload-area" onClick={() => input.current?.click()}><span className="upload-mark">↑</span><strong>Show me your set.</strong><span>Choose a video. I’ll talk you through it.</span><small>MP4, WebM or MOV · 2–120 seconds · up to 150 MB</small></button>}
        <input ref={input} className="visually-hidden" type="file" accept="video/mp4,video/webm,video/quicktime" aria-label="Choose exercise video" onChange={event => { select(event.target.files?.[0]); event.target.value = ''; }} />
        {url && !busy && <div className="analysis-actions">{!report && <button className="primary" onClick={() => void analyze()}>Analyze movement <span>↗</span></button>}<button className="text-button" onClick={() => input.current?.click()}>Choose another clip</button>{report && <button className="text-button" onClick={() => void analyze()}>Check again</button>}</div>}
        {busy && <div className="analysis-progress" role="status" aria-live="polite"><strong>{progress?.stage === 'sampling' ? 'Watching your set…' : progress?.stage === 'summarizing' ? 'Putting your feedback together…' : 'Getting ready to watch…'}</strong><progress aria-label="Movement analysis progress" max={progress?.total || 1} value={progress?.completed || 0}/><button className="text-button" onClick={cancel}>Stop analysis</button></div>}
        {busy && <div className="tracking-explanation"><label><input type="checkbox" checked={showTracking} onChange={event => setShowTracking(event.target.checked)} /> Show movement tracking</label></div>}
        {error && <p role="alert" className="error-message">{error}</p>}
        {!report && <p className="clip-privacy">{persistent ? 'Movement analysis runs on this computer. Saving a recording to your private journal is optional.' : 'Your video stays on this computer.'}</p>}
      </section>
    {!report && <CoachCheckIn exercise={exercise} value={context} onChange={setContext} disabled={busy || finishing} />}
    {report && coaching && <section ref={results} className="analysis-results" aria-label="Movement analysis results"><p className="eyebrow">ORBIT / LET’S TAKE A LOOK</p>
      <h3>{coaching.title}</h3><p className="result-summary">{coaching.summary}</p>
      <ReportVoice key={`${report.id}-${context.discomfort}`} report={report} review={coaching} speech={speech} showDetails={detailsOpen} onMoment={timestamp => focus(timestamp, report.frames, false)} />
      {coaching.moments.length > 0 && <div className="review-moments" aria-label="Moments to look at">{coaching.moments.slice(0, 2).map(moment => <button key={moment.id} className="review-moment" onClick={() => replay(moment.timestamp, moment.endTimestamp)}><span>▶ {moment.timestamp.toFixed(1)}s</span><strong>{moment.title}</strong></button>)}</div>}
      <div className="coach-focus"><span className="coach-focus-label">{coaching.safetyFirst ? 'YOUR CHECK-IN MATTERS' : coaching.focus.detected ? 'ONE CHANGE TO TRY' : coaching.focus.id === 'capture' ? 'A CLEARER VIEW' : 'A PRACTICE CUE, NOT A DETECTED FAULT'}</span><p>{coaching.focus.cue}</p></div>
      <p className="review-uncertainty">{coaching.uncertainty}</p>
      <CoachingConversation key={report.id} report={report} review={coaching} context={context} speech={speech} persistent={persistent} onDiscomfort={discomfort => { speech?.stop(); setContext(value => ({...value, discomfort})); }} />
      <button className="feedback-details-toggle" aria-expanded={detailsOpen} aria-controls="written-feedback" onClick={() => setDetailsOpen(value => !value)}>{detailsOpen ? 'Hide written feedback' : 'View written feedback'} <span aria-hidden="true">{detailsOpen ? '−' : '+'}</span></button>
    </section>}
    </div>
    {report && coaching && <div id="written-feedback" className="written-feedback" hidden={!detailsOpen}>
      <h3>Your feedback, in writing.</h3><p>{coaching.focus.observation}</p><p><strong>Try this:</strong> {coaching.focus.cue}</p><p><strong>Why:</strong> {coaching.focus.why}</p>{coaching.strength && <p>{coaching.strength}</p>}
      {coaching.moments.map(moment => <article className="plain-finding" key={moment.id}><button className="evidence-time" onClick={() => focus(moment.timestamp)}>▶ {moment.timestamp.toFixed(1)}s</button><div><h4>{moment.title}</h4><p>{moment.observation}</p><p>{moment.cue}</p><p>{moment.why}</p></div></article>)}
      <p className="fine-print">{coaching.uncertainty}</p>
      <details className="measurement-details"><summary>Measurements, limits and sources</summary>
      <div className="measurement-stats"><span><strong>{report.poseFrames ?? report.frames.filter(f => f.landmarks.length).length}/{report.sampledFrames}</strong> person detected</span><span><strong>{report.usableFrames}/{report.sampledFrames}</strong> measurable {exercise.id === 'squat' ? 'knee' : 'elbow'} samples</span><span><strong>{report.estimatedRepetitions || 'Not confirmed'}</strong> estimated motion cycles</span></div>
      <p className="fine-print">Person detection and measurable joints are different. Neither is a form score. A hidden head or foot does not invalidate an arm measurement; I only discuss what is visible.</p>
      <div className="findings-list">{report.findings.map(finding => <article className="finding-card" key={finding.id}><button className="evidence-time" onClick={() => focus(finding.timestamp)} aria-label={`View evidence at ${finding.timestamp.toFixed(1)} seconds`}>▶ {finding.timestamp.toFixed(1)}s</button><div><h4>{finding.title}</h4><p>{finding.observation}</p><p className="finding-suggestion">{finding.suggestion}</p></div></article>)}</div>
      {report.frames.some(item => item.metrics) && <div className="sample-strip"><span>Inspect actual samples</span>{report.frames.filter(item => item.metrics).filter((_, i, all) => i % Math.max(1, Math.floor(all.length / 6)) === 0).slice(0, 7).map(item => <button key={item.timestamp} className="text-button" onClick={() => focus(item.timestamp)}>{item.timestamp.toFixed(1)}s</button>)}</div>}
      <details className="mission-rules"><summary>What this review cannot tell you</summary><ul>{report.limitations.map(line => <li key={line}>{line}</li>)}</ul></details>
      <div className="source-links"><span>Method & reference reading</span>{[...coaching.sources, ...report.sources].filter((source, i, all) => all.findIndex(item => item.url === source.url) === i).map(source => <a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.title} ↗</a>)}</div>
      </details>
    </div>}
    {report && (report.status !== 'insufficient' ? <div className="review-completion"><label><input type="checkbox" checked={acknowledged} disabled={finishing} onChange={event => setAcknowledged(event.target.checked)} /> I’ve listened to or read my feedback.</label>
      {persistent && <label><input type="checkbox" checked={saveMedia} disabled={finishing} onChange={event => setSaveMedia(event.target.checked)} /> Also save this recording to my private journal.<small>Uploads this video to your account’s private Supabase storage. Leave unchecked to save only your notes and progress.</small></label>}
      {finishError && <p role="alert" className="status-note">{finishError}</p>}
      <button className="primary" disabled={!acknowledged || !file || finishing} onClick={() => void finish()}>{finishing ? 'Saving your review…' : report.status === 'partial' ? 'Save review & return ↗' : 'Finish review & return ↗'}</button><small>{report.status === 'partial' ? 'Some of the movement was unclear. This review can be saved without workout credit.' : 'Your activity updates when you return to the park.'}</small></div> : <p className="status-note">Try another clip when you’re ready. This one won’t earn workout credit.</p>)}
  </div>;
}

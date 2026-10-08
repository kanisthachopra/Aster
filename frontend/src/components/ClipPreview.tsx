import { useEffect, useRef, useState } from 'react';
import type { Exercise } from '../game/types';
import { analyzeVideo } from '../analysis/analyzeVideo';
import { POSE_CONNECTIONS, type AnalysisProgress, type AnalysisReport, type EvidenceFrame } from '../analysis/types';
import { visible } from '../analysis/measurements';
import { drawTrackedFrame } from '../analysis/drawTrackedFrame';
import ReportVoice, { type ReviewSpeech } from './ReportVoice';

function PoseOverlay({ frame }: { frame?: EvidenceFrame }) {
  if (!frame) return null;
  const points = frame.landmarks;
  return <svg className="pose-overlay" viewBox="0 0 1 1" preserveAspectRatio="none" aria-label="Measured pose landmarks for this sampled frame">
    {POSE_CONNECTIONS.map(([a, b]) => visible(points[a]) && visible(points[b]) && <line key={`${a}-${b}`} x1={points[a].x} y1={points[a].y} x2={points[b].x} y2={points[b].y} />)}
    {points.map((point, i) => i >= 11 && visible(point) && <circle key={i} cx={point.x} cy={point.y} r=".005" />)}
  </svg>;
}
export default function ClipPreview({ exercise, onFinish, onSpeak, speech }: { exercise: Exercise; onFinish: (report: AnalysisReport, file: File) => void; onSpeak: (key: string) => void; speech?: ReviewSpeech }) {
  const [file, setFile] = useState<File | null>(null), [url, setUrl] = useState(''), [error, setError] = useState('');
  const [duration, setDuration] = useState<number | null>(null), [report, setReport] = useState<AnalysisReport | null>(null);
  const [progress, setProgress] = useState<AnalysisProgress | null>(null), [busy, setBusy] = useState(false), [acknowledged, setAcknowledged] = useState(false);
  const [frame, setFrame] = useState<EvidenceFrame>(), [showPose, setShowPose] = useState(false), [dimensions, setDimensions] = useState([16, 9]);
  const input = useRef<HTMLInputElement>(null), video = useRef<HTMLVideoElement>(null), controller = useRef<AbortController | null>(null);
  const results = useRef<HTMLElement>(null);
  const liveCanvas = useRef<HTMLCanvasElement>(null);
  const [showTracking, setShowTracking] = useState(true);
  const trackedJoints = progress?.frame?.landmarks.filter((point, i) => i >= 11 && visible(point)).length ?? 0;
  const scrollBehavior = (): ScrollBehavior => document.querySelector('.app.reduce-motion') || matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth';
  useEffect(() => { if (report) results.current?.scrollIntoView({ block: 'start', behavior: scrollBehavior() }); }, [report]);
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => { if (!file) { setUrl(''); return; } const objectUrl = URL.createObjectURL(file); setUrl(objectUrl); return () => URL.revokeObjectURL(objectUrl); }, [file]);
  function select(next?: File) {
    if (!next) return;
    controller.current?.abort(); speech?.stop(); setBusy(false); setProgress(null); setReport(null); setAcknowledged(false); setFrame(undefined); setShowPose(false); setError(''); setDuration(null);
    if (!['video/mp4', 'video/webm', 'video/quicktime'].includes(next.type)) { setFile(null); setError('Choose an MP4, WebM or MOV video. Your browser must support its video codec.'); return; }
    if (next.size > 150 * 1024 * 1024 || next.size === 0) { setFile(null); setError('Choose a non-empty video under 150 MB.'); return; }
    setFile(next);
  }
  function focus(timestamp: number, frames = report?.frames, reveal = true) {
    if (!video.current) return;
    video.current.pause(); video.current.currentTime = timestamp;
    const nearest = frames?.reduce<EvidenceFrame | undefined>((best, item) => !best || Math.abs(item.timestamp - timestamp) < Math.abs(best.timestamp - timestamp) ? item : best, undefined);
    setFrame(nearest); setShowPose(true);
    if (reveal) video.current.scrollIntoView({ block: 'center', behavior: scrollBehavior() });
  }
  async function analyze() {
    if (!file || busy) return;
    const task = new AbortController(); controller.current?.abort(); controller.current = task;
    setBusy(true); setError(''); setReport(null); setAcknowledged(false); setShowPose(false); video.current?.pause(); onSpeak('analysis-start');
    try {
      const result = await analyzeVideo(file, exercise.id, update => { if (!task.signal.aborted) setProgress(update); }, task.signal, { onFrame: (bitmap, sample) => {
        if (!task.signal.aborted && liveCanvas.current) drawTrackedFrame(liveCanvas.current, bitmap, sample);
      } });
      if (task.signal.aborted) return;
      setReport(result); focus(result.findings[0]?.timestamp ?? result.frames.find(item => item.metrics)?.timestamp ?? 0, result.frames, false);
    } catch (cause) { if (!task.signal.aborted) setError(cause instanceof Error ? cause.message : 'I could not process this clip. Try a different recording.'); }
    finally { if (controller.current === task) { setBusy(false); setProgress(null); } }
  }
  function cancel() { controller.current?.abort(); setBusy(false); setProgress(null); setError('Analysis stopped. Your clip is still here when you’re ready.'); }
  return <div className="analysis-workspace">
    <div className="review-steps" aria-label="Review steps"><span className={file ? 'done' : 'active'}>01 · Record</span><span className={busy ? 'active' : report ? 'done' : ''}>02 · Analyze</span><span className={report ? 'active' : ''}>03 · Review</span><span>04 · Return</span></div>
    <div className="review-grid">
      <section className="capture-guide"><p className="eyebrow">ORBIT / CAMERA BRIEFING</p><h3>Start with the view you have.</h3><p className="subtle">One person. One exercise. I’ll review visible joints and explain what this angle leaves uncertain.</p>
        <ol>{exercise.capture.map(line => <li key={line}>{line}</li>)}</ol>
        <div className="camera-guide"><svg viewBox="0 0 200 90" role="img" aria-label={`Suggested side view for ${exercise.name.toLowerCase()}; keep the working joints in the frame.`}>
          <path d="M15 38h22v20H15zM37 44l10-6v20l-10-6M47 46l48-28v60L47 50M101 82h90"/>
          {exercise.id === 'pushup' ? <><circle cx="116" cy="40" r="6"/><path d="m122 45 31 10 29 23m-56-31-9 18 8 13m-5 0h13m42 0h12"/><circle cx="126" cy="47" r="2"/><circle cx="117" cy="65" r="2"/></>
            : exercise.id === 'pullup' ? <><path d="M107 13h69m-61 0v8m53-8v8"/><circle cx="143" cy="32" r="6"/><path d="M143 38v22m0-18-22-9-6-12m28 21 20-9 5-12m-25 39-8 16m8-16 8 16"/><circle cx="121" cy="33" r="2"/><circle cx="163" cy="33" r="2"/></>
              : <><circle cx="139" cy="27" r="6"/><path d="m140 33-7 22 28 8-11 15m-10-43 25 8m-15 35h16"/><circle cx="133" cy="55" r="2"/><circle cx="161" cy="63" r="2"/><circle cx="150" cy="78" r="2"/></>}
        </svg><small>VISIBLE WORKING JOINTS · 2–120 SECONDS</small></div>
        <p className="fine-print">ORBIT measures visible joint motion. A single view cannot establish safe technique, diagnose pain or determine shoulder rotation and hidden joints.</p>
      </section>
      <section className="clip-section"><p className="eyebrow">YOUR RECORDING / STAYS ON THIS COMPUTER</p>
        {url ? <div className="video-wrap"><div className="evidence-player" style={{ aspectRatio: `${dimensions[0]} / ${dimensions[1]}`, width: `min(100%, ${320 * dimensions[0] / dimensions[1]}px, ${38 * dimensions[0] / dimensions[1]}vh)`, marginInline: 'auto' }}>
          <video ref={video} key={url} src={url} controls={!busy} tabIndex={busy ? -1 : 0} preload="metadata" aria-label={`${exercise.name} recording preview`} onPlay={() => setShowPose(false)}
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
            <div className="tracking-label"><span>{progress?.frame ? `${progress.frame.timestamp.toFixed(2)}s / ${duration?.toFixed(1) ?? '…'}s` : 'Preparing first frame'}</span><span>{trackedJoints ? `${trackedJoints} VISIBLE JOINTS` : progress?.frame ? 'JOINTS UNCLEAR IN THIS FRAME' : 'WAITING FOR FIRST MEASUREMENT'}</span></div>
          </div>}
        </div><div className="file-meta"><span title={file?.name}>{file?.name}</span><span>{duration === null ? 'Duration unavailable' : `${duration.toFixed(1)}s`}</span></div>
        {showPose && frame && <p className="evidence-caption">Sampled evidence · {frame.timestamp.toFixed(2)}s · visible landmarks only</p>}</div> : <button className="upload-area" onClick={() => input.current?.click()}><span className="upload-mark">↑</span><strong>Select your recording</strong><span>MP4, WebM or MOV · 2–120 seconds</span><small>150 MB maximum</small></button>}
        <input ref={input} className="visually-hidden" type="file" accept="video/mp4,video/webm,video/quicktime" aria-label="Choose exercise video" onChange={event => { select(event.target.files?.[0]); event.target.value = ''; }} />
        {url && !busy && <div className="analysis-actions"><button className="primary" onClick={() => void analyze()}>{report ? 'Analyze again' : 'Analyze movement'} <span>↗</span></button><button className="text-button" onClick={() => input.current?.click()}>Choose another clip</button></div>}
        {busy && <div className="analysis-progress" role="status" aria-live="polite"><strong>{progress?.message || 'Preparing ORBIT’s vision…'}</strong><progress aria-label="Movement analysis progress" max={progress?.total || 1} value={progress?.completed || 0}/><span>{progress?.completed || 0} / {progress?.total || '…'} samples</span><button className="text-button" onClick={cancel}>Stop analysis</button></div>}
        {busy && <div className="tracking-explanation"><label><input type="checkbox" checked={showTracking} onChange={event => setShowTracking(event.target.checked)} /> Show movement tracking</label><p className="fine-print">The lines follow joints measured in this exact frame. Gaps mean a joint is hidden or uncertain. This is sampled motion, not a live form score.</p></div>}
        {error && <p role="alert" className="error-message">{error}</p>}
        <p className="fine-print">Actual pose detection runs locally in a background worker. Your recording is never sent to an AI service. Loading the model for the first review can take a moment.</p>
      </section>
    </div>
    {report && <section ref={results} className="analysis-results" aria-label="Movement analysis results"><p className="eyebrow">ORBIT / {report.status === 'usable' ? 'LET’S LOOK AT THE EVIDENCE' : report.status === 'partial' ? 'USEFUL OBSERVATIONS · LIMITED VIEW' : 'WHAT THIS RECORDING SHOWS'}</p>
      <h3>{report.status === 'usable' ? 'Here’s what I could measure.' : report.status === 'partial' ? 'Let’s work with what I can see.' : 'Here’s where the view falls short.'}</h3><p className="result-summary" role="status">{report.summary}</p>
      <ReportVoice key={report.id} report={report} speech={speech} />
      <div className="measurement-stats"><span><strong>{report.poseFrames ?? report.frames.filter(f => f.landmarks.length).length}/{report.sampledFrames}</strong> person detected</span><span><strong>{report.usableFrames}/{report.sampledFrames}</strong> measurable {exercise.id === 'squat' ? 'knee' : 'elbow'} samples</span><span><strong>{report.estimatedRepetitions || 'Not confirmed'}</strong> estimated motion cycles</span></div>
      <p className="fine-print">Person detection and measurable joints are different. Neither is a form score. A hidden head or foot does not invalidate an arm measurement; I only discuss what is visible.</p>
      <div className="findings-list">{report.findings.map(finding => <article className="finding-card" key={finding.id}><button className="evidence-time" onClick={() => focus(finding.timestamp)} aria-label={`View evidence at ${finding.timestamp.toFixed(1)} seconds`}>▶ {finding.timestamp.toFixed(1)}s</button><div><h4>{finding.title}</h4><p>{finding.observation}</p><p className="finding-suggestion">{finding.suggestion}</p></div></article>)}</div>
      {report.frames.some(item => item.metrics) && <div className="sample-strip"><span>Inspect actual samples</span>{report.frames.filter(item => item.metrics).filter((_, i, all) => i % Math.max(1, Math.floor(all.length / 6)) === 0).slice(0, 7).map(item => <button key={item.timestamp} className="text-button" onClick={() => focus(item.timestamp)}>{item.timestamp.toFixed(1)}s</button>)}</div>}
      <details className="mission-rules"><summary>What this review cannot tell you</summary><ul>{report.limitations.map(line => <li key={line}>{line}</li>)}</ul></details>
      <div className="source-links"><span>Method & reference reading</span>{report.sources.map(source => <a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.title} ↗</a>)}</div>
      {report.status !== 'insufficient' ? <div className="review-completion"><label><input type="checkbox" checked={acknowledged} onChange={event => setAcknowledged(event.target.checked)} /> I’ve reviewed these observations and their limits.</label><button className="primary" disabled={!acknowledged || !file} onClick={() => file && onFinish(report, file)}>{report.status === 'partial' ? 'Save observations & return ↗' : 'Finish review & return ↗'}</button><small>{report.status === 'partial' ? 'Save this limited review to your journal. An exercise cycle was not confirmed, so no activity or energy is awarded.' : 'Your activity and energy update when you return to the park.'}</small></div> : <p className="status-note">No activity or energy awarded. You can keep inspecting these samples, try another view or leave the station.</p>}
    </section>}
  </div>;
}

import { useEffect, useRef, useState } from 'react';
import type { Exercise } from '../game/types';

export default function ClipPreview({ exercise }: { exercise: Exercise }) {
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [duration, setDuration] = useState<number | null>(null);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!file) { setUrl(''); return; }
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);
  function select(next?: File) {
    setError(''); setDuration(null);
    if (!next) return;
    if (!['video/mp4', 'video/webm', 'video/quicktime'].includes(next.type)) {
      setFile(null); setError('Choose an MP4, WebM or MOV video. Your browser must support its video codec.'); return;
    }
    if (next.size > 150 * 1024 * 1024 || next.size === 0) {
      setFile(null); setError('Choose a non-empty video under 150 MB.'); return;
    }
    setFile(next);
  }
  return <div className="review-grid">
    <section className="capture-guide">
      <p className="eyebrow">01 / PREPARE YOUR CAMERA</p>
      <h3>Give me a clear view.</h3>
      <p className="subtle">One short clip. Your usual movement.</p>
      <ol>{exercise.capture.map(line => <li key={line}>{line}</li>)}</ol>
      <div className="capture-sketch" aria-hidden="true"><span>▣</span><i /><span className="person">♙</span><small>SIDE VIEW · FULL BODY</small></div>
      <p className="fine-print">Capture guidance is provisional and will be validated with the analysis pipeline.</p>
    </section>
    <section className="clip-section">
      <p className="eyebrow">02 / YOUR RECORDING</p>
      {url ? <div className="video-wrap">
        <video key={url} src={url} controls preload="metadata" aria-label={`${exercise.name} recording preview`}
          onLoadedMetadata={event => {
            const seconds = event.currentTarget.duration;
            if (Number.isFinite(seconds) && (seconds <= 0 || seconds > 60)) {
              setError('Choose a playable clip between 1 and 60 seconds.'); setFile(null);
            } else setDuration(Number.isFinite(seconds) ? seconds : null);
          }}
          onError={() => { setError('This browser could not play that recording. Try an MP4 with H.264 video or a WebM file.'); setFile(null); }} />
        <div className="file-meta"><span>{file?.name}</span><span>{duration === null ? 'Duration unavailable' : `${duration.toFixed(1)}s`}</span></div>
      </div> : <button className="upload-area" onClick={() => input.current?.click()}>
        <span className="upload-mark">↑</span><strong>Select your recording</strong><span>MP4, WebM or MOV · up to 60 seconds</span><small>150 MB maximum</small>
      </button>}
      <input ref={input} className="visually-hidden" type="file" accept="video/mp4,video/webm,video/quicktime" aria-label="Choose exercise video"
        onChange={event => { select(event.target.files?.[0]); event.target.value = ''; }} />
      {url && <><button className="text-button" onClick={() => input.current?.click()}>Choose another clip ↗</button>{duration === null && <p className="fine-print">This recording may omit duration metadata. You can preview it here; its length will need checking before analysis.</p>}</>}
      {error && <p role="alert" className="error-message">{error}</p>}
      <div className="status-note"><span className="status-dot" /><p><strong>Local preview only</strong><br />This file stays in your browser. Real movement analysis is the next build step; no feedback or credits are generated here.</p></div>
    </section>
  </div>;
}

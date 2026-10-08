import { useCallback, useEffect, useRef, useState } from 'react';
import { World, type ArrivalBeat } from './game/World';
import { AudioDirector } from './game/AudioDirector';
import { EXERCISES, loadSettings, type ExerciseId, type Phase, type LookMode, type Survey } from './game/types';
import { LANDING } from './game/terrain';
import Panel from './components/Panel';
import ClipPreview from './components/ClipPreview';
import SurveyMap from './components/SurveyMap';
import RobotTour from './components/RobotTour';
import Missions from './components/Missions';
import Journal from './components/Journal';
import { createJourney, dayKey, finishReview, protectDay, settleWeek } from './game/journey';
import type { AnalysisReport } from './analysis/types';

type Overlay = 'settings' | 'robot' | 'onboarding' | 'tour' | 'review' | 'access' | 'journal' | 'missions' | null;
const ARRIVAL_LINES: Record<ArrivalBeat, { speaker: string; line: string; label: string }> = {
  threshold: { speaker: 'TRAVELLER', line: 'Okay… still standing. Let’s see what’s in here.', label: 'HABITAT DISCOVERED' },
  lights: { speaker: 'TRAVELLER', line: 'Oh. Look at this place.', label: 'RESTORING HABITAT POWER' },
  machine: { speaker: 'TRAVELLER', line: 'Hang on… did that thing just move?', label: 'SERVICE BAY / INITIALIZING' },
  robot: { speaker: 'ORBIT', line: 'Oh! A visitor. Give me a second—it’s been quiet here.', label: 'ORBIT / ACTIVATING' },
  greeting: { speaker: 'ORBIT', line: 'I’m ORBIT. You look like you’ve had quite a walk.', label: 'FIRST CONTACT' },
};

export default function App() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const world = useRef<World | null>(null);
  const audio = useRef<AudioDirector | null>(null);
  const [phase, setPhase] = useState<Phase>('title');
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [selected, setSelected] = useState<ExerciseId>('pullup');
  const [near, setNear] = useState<ExerciseId | null>(null);
  const [lookMode, setLookMode] = useState<LookMode>('off');
  const [survey, setSurvey] = useState<Survey>({ ...LANDING, bearing: 0, discovered: false, inside: false });
  const [mapExpanded, setMapExpanded] = useState(false);
  const [beat, setBeat] = useState<ArrivalBeat>('threshold');
  const [callsign, setCallsign] = useState('');
  const [ready, setReady] = useState(false);
  const [failure, setFailure] = useState('');
  const [audioFailure, setAudioFailure] = useState(false);
  const [settings, setSettings] = useState(loadSettings);
  const [message, setMessage] = useState('');
  const [journey, setJourney] = useState(() => createJourney());
  const speakGuide = useCallback((key: string) => audio.current?.guide(key), []);
  const exercise = EXERCISES.find(item => item.id === selected)!;
  const nearbyExercise = EXERCISES.find(item => item.id === near);

  useEffect(() => {
    try {
      world.current = new World(canvas.current!, {
        opened: () => setPhase('entry'), arrived: () => setPhase('arrival'),
        introduced: () => { setPhase('park'); setOverlay('onboarding'); },
        station: id => { setSelected(id); setPhase('station'); setOverlay('review'); },
        proximity: id => setNear(previous => previous === id ? previous : id),
        capture: setLookMode, survey: setSurvey,
        beat: next => { setBeat(next); audio.current?.arrivalBeat(next); },
        step: () => audio.current?.footstep(),
      });
      audio.current = new AudioDirector(loadSettings());
      setReady(true);
    } catch (error) { setFailure(error instanceof Error ? error.message : 'Graphics unavailable'); }
    return () => { world.current?.dispose(); audio.current?.dispose(); };
  }, []);
  useEffect(() => { world.current?.setPhase(phase); audio.current?.setPhase(phase); }, [phase, ready]);
  useEffect(() => {
    world.current?.pause(overlay !== null);
    audio.current?.setReading(overlay !== null);
  }, [overlay, ready]);
  useEffect(() => {
    world.current?.setReducedMotion(settings.reducedMotion); audio.current?.applySettings(settings);
    world.current?.setLookSensitivity(settings.lookSensitivity);
    try { localStorage.setItem('aster.preferences', JSON.stringify(settings)); } catch { /* Preferences remain usable in memory. */ }
  }, [settings, ready]);
  useEffect(() => { world.current?.select(selected); }, [selected, phase, ready]);
  useEffect(() => { const timer = setInterval(() => setJourney(previous => settleWeek(previous)), 60000); return () => clearInterval(timer); }, []);
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(''), 6500);
    return () => clearTimeout(timer);
  }, [message]);

  async function start() {
    try { await audio.current?.start(); } catch { setAudioFailure(true); }
    setPhase('opening');
  }
  function closePanel() {
    if (overlay === 'review') {
      setPhase('park');
      setMessage('Your station will be here when you’re ready. Another exercise, perhaps?');
    }
    setOverlay(null);
  }
  function choose(id: ExerciseId) { setSelected(id); setOverlay(null); setMessage('Follow the blue markers. I’ll meet you at the station.'); }
  function completeReview(report: AnalysisReport, file: File) {
    if (report.status !== 'usable') return;
    const updated = finishReview(journey, report, file);
    setJourney(updated); setOverlay(null); setPhase('park'); audio.current?.cue();
    const earned = Math.max(0, updated.regular - settleWeek(journey).regular);
    setMessage(journey.activity.length === 0 ? `First mission complete. ${earned ? `+${earned} Energy Credits. ` : ''}Your review is in the Journal. Master Control lets you manage it.` : `Review added to your guest journal. ${earned ? `+${earned} Energy Credits.` : 'Today’s activity was already recorded.'}`);
    speakGuide(journey.activity.length === 0 ? 'first-review' : 'analysis-ready');
  }
  const lookHint = lookMode === 'locked' ? 'MOUSE / Look · ESC / Release' : lookMode === 'free' ? 'HOLD + DRAG / Look · ESC / Release' : 'CLICK WORLD / Capture mouse';

  return <main className={`app ${settings.reducedMotion ? 'reduce-motion' : ''}`}>
    <canvas ref={canvas} className={`world-canvas ${lookMode !== 'off' ? 'looking' : ''}`} aria-label="Explore the lunar landscape. WASD to move, click to enable mouse look, Escape to release, and E at a station." />
    <div className="world-vignette" aria-hidden="true" />
    {failure ? <section className="fallback"><p className="eyebrow">GRAPHICS CONNECTION LOST</p><h1>The outpost is out of view.</h1><p>Enable hardware acceleration and try a desktop browser with WebGL2 support.</p><details><summary>Technical detail</summary>{failure}</details><button className="primary" onClick={() => location.reload()}>Reconnect</button></section> : <>
      {phase === 'title' && <section className="title-screen">
        <div className="title-top"><span className="insignia">✧</span><span>EARTHAN EXPEDITION<br /><b>HUMAN PERFORMANCE DIVISION</b></span></div>
        <div className="title-content"><p className="eyebrow">A NEW WORLD. THE SAME HUMAN POTENTIAL.</p>
          <h1 aria-label="Aster Outpost 07"><span className="title-letters" aria-hidden="true">{'ASTER'.split('').map((letter, i) => <i key={i} style={{ animationDelay: `${i * 70}ms` }}>{letter}</i>)}</span><span>OUTPOST 07</span></h1>
          <div className="title-rule" />
          <nav className="title-menu" aria-label="Main menu">
            <button disabled={!ready} onClick={() => void start()}><span className="menu-number">01</span>{ready ? 'Begin expedition' : 'Establishing connection…'}<span className="menu-arrow">↗</span></button>
            <button disabled={!ready} onClick={() => setOverlay('settings')}><span className="menu-number">02</span>Settings<span className="menu-arrow">↗</span></button>
          </nav>
        </div>
        <div className="title-bottom"><span><i className="tiny-light" /> SYSTEMS ONLINE</span><span>MOVEMENT LAB / 0.3</span></div>
        <div className="coordinate-label"><span>SECTOR 07</span><strong>Somewhere worth<br />starting again.</strong><small>24° 18′ N &nbsp; / &nbsp; 61° 07′ E</small></div>
      </section>}

      {phase !== 'title' && <header className="hud-header">
        <div className="hud-brand">✧ <span>ASTER<small>OUTPOST 07</small></span></div>
        <div className="hud-location"><span className="status-dot" />{['guided', 'opening', 'entry'].includes(phase) ? 'ARRIVAL SECTOR' : 'TRAINING HABITAT'}<small>DEVELOPMENT PREVIEW</small></div>
        <div className="hud-actions">{['park', 'station'].includes(phase) && <><button className={journey.activity.length ? 'mission-unlocked' : ''} onClick={() => setOverlay('missions')}>Missions <span>◇ {journey.regular + journey.reserve}</span></button><button onClick={() => setOverlay('journal')}>Journal <span>▤</span></button></>}<button onClick={() => setOverlay('settings')}>Settings <span>☷</span></button></div>
      </header>}

      {phase === 'opening' && <><div className="cinematic-bars" aria-hidden="true" /><div className="cinematic-caption"><p className="eyebrow">SURFACE CONTACT ESTABLISHED</p><p>A long way from home.</p></div><button className="skip-button" onClick={() => setPhase('entry')}>Skip opening →</button></>}

      {phase === 'entry' && <section className="entry-panel">
        <p className="eyebrow">EARTHAN INTERGALACTIC EMPIRE / ARRIVALS</p><h2>Every journey<br />begins somewhere.</h2><p className="subtle">The outpost is waiting.</p>
        <button className="choice-button" onClick={() => setPhase('guided')}><span><small>01 / FIRST ARRIVAL</small>New to this world</span><b>↗</b></button>
        <button className="choice-button" onClick={() => setOverlay('access')}><span><small>02 / RETURNING CITIZEN</small>Already a user</span><b>↗</b></button>
      </section>}

      {phase === 'guided' && <><div className="objective"><p className="eyebrow">SURFACE EXPEDITION</p><h2>{survey.discovered ? 'A shelter in the distance.' : 'Find what’s out there.'}</h2><p>{survey.discovered ? 'Find the entrance on the southern side of the dome.' : 'Explore the basin. Your survey picked up a faint signal.'}</p></div><div className="crosshair" aria-hidden="true">·</div>
        <div className="control-strip"><span><kbd>W A S D</kbd> Explore</span><span><kbd>SPACE</kbd> Jump</span><span>{lookHint}</span></div>
        <button className="skip-route" onClick={() => setPhase('arrival')}>Preview dome arrival →</button></>}

      {phase === 'arrival' && <><div className="cinematic-bars" aria-hidden="true" /><div className="cinematic-caption" aria-live="polite"><p className="eyebrow">{ARRIVAL_LINES[beat].label}</p><p><small>{ARRIVAL_LINES[beat].speaker}</small>{ARRIVAL_LINES[beat].line}</p></div></>}

      {phase === 'park' && !overlay && <>
        <div className="objective"><p className="eyebrow">YOUR NEXT STEP / {exercise.number}</p><h2>{exercise.name}</h2><p>Follow the blue floor markers.</p><button className="text-button" onClick={() => setOverlay('robot')}>Choose another station ↗</button></div>
        <div className="crosshair" aria-hidden="true">·</div>
        {nearbyExercise && <button className="station-prompt" onClick={() => { setSelected(nearbyExercise.id); setPhase('station'); setOverlay('review'); }}><kbd>E</kbd><span>Enter {nearbyExercise.name.toLowerCase()} station<small>{nearbyExercise.label}</small></span></button>}
        <div className="control-strip"><span><kbd>W A S D</kbd> Move</span><span><kbd>SPACE</kbd> Jump</span><span>{lookHint}</span></div>
      </>}
      {['guided', 'park'].includes(phase) && !overlay && <SurveyMap survey={survey} expanded={mapExpanded} onToggle={() => { world.current?.releasePointer(); setMapExpanded(value => !value); }} />}
      {lookMode === 'free' && !overlay && <aside className="capture-help">This window blocks full mouse capture. Hold and drag here, or open <strong>127.0.0.1:5174</strong> in Edge or Chrome for game-style look.</aside>}
      {message && phase === 'park' && !overlay && <div className="robot-aside" role="status"><span>ORBIT / GUIDE</span><p>{message}</p></div>}
      {audioFailure && <div className="audio-warning" role="status">Audio could not start. The world remains playable.</div>}
    </>}

    {overlay === 'onboarding' && <Panel title="What should I call you?" eyebrow="ORBIT / FIRST CONTACT" onClose={() => setOverlay('robot')}>
      <p className="dialogue-line">“You made it. I’m ORBIT. Before we get into all the training stuff… what should I call you?”</p>
      <form onSubmit={event => { event.preventDefault(); setOverlay('tour'); }}>
        <label className="callsign-field">Your callsign<input autoComplete="off" maxLength={32} value={callsign} onChange={event => setCallsign(event.target.value)} placeholder="How should ORBIT address you?" /></label>
        <p className="fine-print">Guest expedition: no account needed. Your callsign, recordings and progress stay in this visit and clear on reload.</p>
        <button className="primary" type="submit">{callsign.trim() ? 'Meet your guide' : 'Continue as traveller'} ↗</button>
      </form>
    </Panel>}

    {overlay === 'tour' && <Panel title="Let me show you around." eyebrow="ORBIT / YOUR FIRST EXPEDITION" onClose={() => setOverlay('robot')}><RobotTour onDone={() => setOverlay('robot')} onSpeak={speakGuide} /></Panel>}

    {overlay === 'robot' && <Panel title="There you are, traveller." eyebrow="ORBIT / YOUR OUTPOST COMPANION" onClose={closePanel}>
      <p className="dialogue-line">“{callsign.trim() || 'Traveller'}, a whole moon, and you found the one place with a pull-up bar. I think we’ll get along.”</p>
      <p className="subtle">Where shall we begin?</p>
      <div className="exercise-options">{EXERCISES.map(item => <button className="choice-button" key={item.id} onClick={() => choose(item.id)}><span><small>{item.number} / {item.label}</small>{item.name}</span><b>↗</b></button>)}</div>
      <button className="text-button" onClick={() => setOverlay('tour')}>Walk me through the outpost again</button>
      <p className="preview-note">Your recording stays on this computer. At the station, select a clip and press Analyze movement to begin.</p>
    </Panel>}

    {overlay === 'review' && <Panel title={exercise.name} eyebrow={`TRAINING STATION ${exercise.number} / ${exercise.label}`} onClose={closePanel} wide>
      <div className="review-intro"><span className="orbit-icon">◈</span><p><strong>ORBIT</strong>“{exercise.cue} Let’s start with your recording.”</p><span className="phase-tag">CAPTURE</span></div>
      <ClipPreview key={selected} exercise={exercise} onFinish={completeReview} onSpeak={speakGuide} />
      <div className="panel-footer"><span>Leaving early keeps today’s activity unchanged.</span><button className="secondary" onClick={closePanel}>Leave station <span>↗</span></button></div>
    </Panel>}

    {overlay === 'settings' && <Panel title="Make yourself at home." eyebrow="OUTPOST / SETTINGS" onClose={closePanel}>
      <p className="subtle">A little more space. A little less noise.</p>
      <label className="setting-row"><span>Music<small>Original temporary sound sketch</small></span><input aria-label="Music volume" type="range" min="0" max="1" step="0.05" value={settings.music} onChange={e => setSettings(s => ({ ...s, music: Number(e.target.value) }))} /><output>{Math.round(settings.music * 100)}%</output></label>
      <label className="setting-row"><span>World sounds<small>Breathing and interface cues</small></span><input aria-label="World sounds volume" type="range" min="0" max="1" step="0.05" value={settings.effects} onChange={e => setSettings(s => ({ ...s, effects: Number(e.target.value) }))} /><output>{Math.round(settings.effects * 100)}%</output></label>
      <label className="setting-row"><span>Dialogue<small>Local voice audition · subtitles stay visible</small></span><input aria-label="Dialogue volume" type="range" min="0" max="1" step="0.05" value={settings.dialogue} onChange={e => setSettings(s => ({ ...s, dialogue: Number(e.target.value) }))} /><output>{Math.round(settings.dialogue * 100)}%</output></label>
      <label className="setting-row"><span>Mouse sensitivity<small>Direct aim, without camera smoothing</small></span><input aria-label="Mouse sensitivity" type="range" min="0.3" max="2" step="0.1" value={settings.lookSensitivity} onChange={e => setSettings(s => ({ ...s, lookSensitivity: Number(e.target.value) }))} /><output>{settings.lookSensitivity.toFixed(1)}×</output></label>
      <label className="setting-row"><span>Reduced motion<small>Gentler scenery and camera movement; full introduction</small></span><input type="checkbox" checked={settings.reducedMotion} onChange={e => setSettings(s => ({ ...s, reducedMotion: e.target.checked }))} /></label>
      <p className="preview-note">Click the world to capture the mouse. Escape releases it. If this embedded window blocks capture, use Edge or Chrome for unrestricted game-style look. Character voices are locally synthesized auditions.</p>
      <button className="primary" onClick={closePanel}>Return ↗</button>
    </Panel>}

    {overlay === 'access' && <Panel title="Authorization terminal." eyebrow="EARTHAN INTERGALACTIC EMPIRE" onClose={closePanel}>
      <p className="dialogue-line">“Your journey deserves a secure home.”</p><p className="subtle">Account creation, sign-in and recovery are not connected in this first world preview. No credentials are collected here.</p>
      <button className="primary" onClick={() => { setOverlay(null); setPhase('guided'); }}>Explore the preview ↗</button>
    </Panel>}

    {overlay === 'journal' && <Panel title="Your field journal." eyebrow="OUTPOST / PERSONAL RECORDS" onClose={closePanel}>
      <Journal entries={journey.entries} onSettings={() => setOverlay('settings')} onDelete={(id, mediaOnly) => setJourney(previous => ({ ...previous, entries: mediaOnly ? previous.entries.map(entry => entry.id === id ? { ...entry, file: null } : entry) : previous.entries.filter(entry => entry.id !== id) }))} /><button className="primary" onClick={closePanel}>Back to the park ↗</button>
    </Panel>}
    {overlay === 'missions' && <Panel title="A little better, each time." eyebrow={`ORBIT / MISSIONS / ${dayKey()}`} onClose={closePanel}><Missions journey={settleWeek(journey)} onProtect={day => setJourney(previous => protectDay(previous, day))} /><button className="primary" onClick={closePanel}>Back to the park ↗</button></Panel>}
  </main>;
}

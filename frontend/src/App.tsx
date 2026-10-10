import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { World, type ArrivalBeat } from './game/World';
import { AudioDirector } from './game/AudioDirector';
import { EXERCISES, loadSettings, type ExerciseId, type Phase, type LookMode, type Survey } from './game/types';
import { LANDING } from './game/terrain';
import Panel from './components/Panel';
import ClipPreview from './components/ClipPreview';
import type { ReviewSpeech } from './components/ReportVoice';
import SurveyMap from './components/SurveyMap';
import RobotTour from './components/RobotTour';
import Missions from './components/Missions';
import Journal from './components/Journal';
import { createJourney, dayKey, finishReview, protectDay, settleWeek } from './game/journey';
import type { AnalysisReport } from './analysis/types';
import dialogueScript from './game/dialogue.json';
import MiniGames from './components/MiniGames';
import { GAME_STATIONS, type MiniGameId } from './game/miniGames';
import AccountPanel from './components/AccountPanel';
import { apiRequest, saveReview, type AccountSession } from './account/client';

type Overlay = 'settings' | 'robot' | 'onboarding' | 'tour' | 'review' | 'access' | 'journal' | 'missions' | 'games' | null;
const ARRIVAL_LINES: Record<ArrivalBeat, { speaker: string; line: string; label: string }> = {
  threshold: { speaker: 'TRAVELLER', line: dialogueScript.threshold.text, label: 'HABITAT DISCOVERED' },
  lights: { speaker: 'TRAVELLER', line: dialogueScript.lights.text, label: 'RESTORING HABITAT POWER' },
  machine: { speaker: 'TRAVELLER', line: dialogueScript.machine.text, label: 'SERVICE BAY / INITIALIZING' },
  robot: { speaker: 'ORBIT', line: dialogueScript.robot.text, label: 'ORBIT / ACTIVATING' },
  greeting: { speaker: 'ORBIT', line: dialogueScript.greeting.text, label: 'FIRST CONTACT' },
};

export default function App() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const world = useRef<World | null>(null);
  const audio = useRef<AudioDirector | null>(null);
  const [phase, setPhase] = useState<Phase>('title');
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [selected, setSelected] = useState<ExerciseId>('pullup');
  const [near, setNear] = useState<ExerciseId | null>(null);
  const [nearGame, setNearGame] = useState<MiniGameId | null>(null);
  const [selectedGame, setSelectedGame] = useState<MiniGameId>('signal');
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
  const [session, setSession] = useState<AccountSession | null>(null);
  const sessionRef = useRef<AccountSession | null>(null);
  const sessionVersion = useRef(0);
  const [accountMode, setAccountMode] = useState<'register' | 'login' | 'manage'>('login');
  const [accountError, setAccountError] = useState('');
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [saveProgress, setSaveProgress] = useState<number | null>(null);
  const signedIn = session?.authenticated === true;
  function storeSession(next: AccountSession) { sessionVersion.current++; sessionRef.current = next; setSession(next); }
  async function refreshSession() {
    setAccountError('');
    const version = sessionVersion.current;
    try {
      const next = await apiRequest<AccountSession>('session');
      if (version !== sessionVersion.current) return;
      storeSession(next);
      if (next.authenticated && next.profile) { setCallsign(next.profile.callsign); if (next.journey) setJourney(next.journey); }
    } catch (reason) { if (version === sessionVersion.current) setAccountError(reason instanceof Error ? reason.message : 'Account connection unavailable.'); }
  }
  useEffect(() => { void refreshSession(); }, []);
  function openAccount(mode: 'register' | 'login' | 'manage') { setAccountMode(mode); setOverlay('access'); }
  function authenticated(next: AccountSession) {
    storeSession(next); setCallsign(next.profile?.callsign || '');
    if (next.journey) setJourney(next.journey);
    if (accountMode === 'manage') return;
    void audio.current?.start().catch(() => setAudioFailure(true));
    setPhase('park'); setOverlay(next.profile?.onboardingComplete ? 'robot' : 'tour');
    setMessage('You’re back. Your journal and progress are ready.');
  }
  function signedOut() {
    storeSession({ configured: true, authenticated: false, emailAvailable: session?.emailAvailable ?? false });
    setJourney(createJourney()); setCallsign(''); setOverlay(null); setPhase('title');
    audio.current?.stopDialogue();
  }
  const speakGuide = useCallback((key: string) => audio.current?.guide(key), []);
  const reviewSpeech = useMemo<ReviewSpeech>(() => ({
    getStatus: async () => audio.current ? audio.current.getSpeechStatus() : { available: false, message: 'Voice is still starting. Your written feedback is ready.' },
    prepare: async () => audio.current ? audio.current.prepareSpeech() : { status: 'unavailable', message: 'Voice is still starting.' },
    speak: async (text, options) => audio.current ? audio.current.speakText(text, options) : { status: 'unavailable', message: 'Voice is not available yet.' },
    stop: () => audio.current?.stopDialogue(),
  }), []);
  const exercise = EXERCISES.find(item => item.id === selected)!;
  const nearbyExercise = EXERCISES.find(item => item.id === near);
  const nearbyGame = GAME_STATIONS.find(item => item.id === nearGame);

  useEffect(() => {
    try {
      world.current = new World(canvas.current!, {
        ready: () => setReady(true),
        opened: () => setPhase('entry'), arrived: () => setPhase('arrival'),
        introduced: () => { setPhase('park'); setOverlay('onboarding'); },
        station: id => { setSelected(id); setPhase('station'); setOverlay('review'); },
        proximity: id => setNear(previous => previous === id ? previous : id),
        game: id => { setSelectedGame(id); setOverlay('games'); },
        gameProximity: id => setNearGame(previous => previous === id ? previous : id),
        capture: setLookMode, survey: setSurvey,
        beat: next => { setBeat(next); audio.current?.arrivalBeat(next); },
        step: () => audio.current?.footstep(),
      });
      audio.current = new AudioDirector(loadSettings());
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
  useEffect(() => {
    const timer = setInterval(() => {
      if (sessionRef.current?.authenticated) {
        const owner = sessionRef.current.profile?.id;
        if (!savingRef.current) void apiRequest<ReturnType<typeof createJourney>>('journey').then(next => {
          if (owner === sessionRef.current?.profile?.id && !savingRef.current) setJourney(next);
        }).catch(() => { /* The next explicit action shows a connection error. */ });
      } else setJourney(previous => settleWeek(previous));
    }, 60000); return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(''), 6500);
    return () => clearTimeout(timer);
  }, [message]);

  async function start() {
    try { await audio.current?.start(); } catch { setAudioFailure(true); }
    if (signedIn) { setPhase('park'); setOverlay(session.profile?.onboardingComplete ? 'robot' : 'tour'); }
    else setPhase('opening');
  }
  function closePanel() {
    if (savingRef.current) { setMessage('Your review is still saving. Please wait a moment.'); return; }
    audio.current?.stopDialogue();
    if (overlay === 'review') {
      setPhase('park');
      setMessage('No problem. Your station’s still here if you want another go.');
    }
    setOverlay(null);
  }
  function choose(id: ExerciseId) { setSelected(id); setOverlay(null); setMessage('Follow the blue markers. I’ll meet you at the station.'); }
  async function completeReview(report: AnalysisReport, file: File, saveMedia = false) {
    if (report.status === 'insufficient') return;
    if (savingRef.current) return;
    savingRef.current = true; setSaving(true);
    const owner = sessionRef.current?.profile?.id;
    let updated;
    try {
      updated = signedIn ? await saveReview(report, saveMedia ? file : null, setSaveProgress) : finishReview(journey, report, file);
      if (signedIn && owner !== sessionRef.current?.profile?.id) throw new Error('Your account changed while saving. Sign in again before continuing.');
    } finally { savingRef.current = false; setSaving(false); setSaveProgress(null); }
    setJourney(updated); setOverlay(null); setPhase('park');
    if (report.status === 'partial') {
      setMessage('Saved those observations in your journal. There’s not enough evidence for an activity credit yet; the recording tips explain what would help.');
      speakGuide('analysis-partial'); return;
    }
    audio.current?.cue();
    const earned = Math.max(0, updated.regular - settleWeek(journey).regular);
    setMessage(journey.activity.length === 0 ? `First mission complete. ${earned ? `+${earned} Energy Credits. ` : ''}Your review is in the Journal. Master Control lets you manage it.` : `Review added to your ${signedIn ? 'private' : 'guest'} journal. ${earned ? `+${earned} Energy Credits.` : 'Today’s activity was already recorded.'}`);
    speakGuide(journey.activity.length === 0 ? 'first-review' : 'analysis-ready');
  }
  async function deleteEntry(id: string, mediaOnly: boolean) {
    if (!signedIn) { setJourney(previous => ({ ...previous, entries: mediaOnly ? previous.entries.map(entry => entry.id === id ? { ...entry, file: null } : entry) : previous.entries.filter(entry => entry.id !== id) })); return; }
    const owner = sessionRef.current?.profile?.id;
    const next = await apiRequest<ReturnType<typeof createJourney>>('journal/delete', { reviewId: id, mediaOnly });
    if (owner === sessionRef.current?.profile?.id) setJourney(next);
  }
  async function protectMissedDay(day: string, allowReserve: boolean) {
    if (!signedIn) { setJourney(previous => protectDay(previous, day)); return; }
    const owner = sessionRef.current?.profile?.id;
    const next = await apiRequest<ReturnType<typeof createJourney>>('protect', { day, allowReserve });
    if (owner === sessionRef.current?.profile?.id) setJourney(next);
  }
  async function completeTour() {
    if (signedIn && session.profile) {
      try { const next = await apiRequest<{ profile: NonNullable<AccountSession['profile']> }>('profile', { onboardingComplete: true }); storeSession({ ...session, profile: next.profile }); }
      catch { setMessage('You can explore now. Your introduction could not be saved, so we may show it again next time.'); }
    }
    setOverlay('robot');
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
            <button disabled={!ready} onClick={() => void start()}><span className="menu-number">01</span>{ready ? signedIn ? 'Resume expedition' : 'Begin expedition' : 'Establishing connection…'}<span className="menu-arrow">↗</span></button>
            <button onClick={() => openAccount(signedIn ? 'manage' : 'login')}><span className="menu-number">02</span>{signedIn ? 'My account' : 'Sign in'}<span className="menu-arrow">↗</span></button>
            {!signedIn && <button onClick={() => openAccount('register')}><span className="menu-number">03</span>Create an outpost ID<span className="menu-arrow">↗</span></button>}
            <button onClick={() => setOverlay('settings')}><span className="menu-number">{signedIn ? '03' : '04'}</span>Settings<span className="menu-arrow">↗</span></button>
          </nav>
          <p className="title-account-note">{signedIn ? `Welcome back, ${session.profile?.callsign || 'traveller'}. Your journey is saved.` : 'Sign in to keep your journal. Or begin and explore as a guest.'}</p>
        </div>
        <div className="title-bottom"><span role="status"><i className="tiny-light" /> {ready ? 'SYSTEMS ONLINE' : 'PREPARING THE OUTPOST'}</span><span>MOVEMENT LAB / LIVE PREVIEW</span></div>
        <div className="coordinate-label"><span>SECTOR 07</span><strong>Somewhere worth<br />starting again.</strong><small>24° 18′ N &nbsp; / &nbsp; 61° 07′ E</small></div>
      </section>}

      {phase !== 'title' && <header className="hud-header">
        <div className="hud-brand">✧ <span>ASTER<small>OUTPOST 07</small></span></div>
        <div className="hud-location"><span className="status-dot" />{['guided', 'opening', 'entry'].includes(phase) ? 'ARRIVAL SECTOR' : 'TRAINING HABITAT'}<small>DEVELOPMENT PREVIEW</small></div>
        <div className="hud-actions">{['park', 'station'].includes(phase) && <><button className={journey.activity.length ? 'mission-unlocked' : ''} onClick={() => setOverlay('missions')}>Missions <span>◇ {journey.regular + journey.reserve}</span></button><button onClick={() => setOverlay('journal')}>Journal <span>▤</span></button><button onClick={() => setOverlay('games')}>Play <span>✧</span></button><button onClick={() => openAccount(signedIn ? 'manage' : 'login')}>{signedIn ? 'Account' : 'Sign in'} <span>◈</span></button></>}<button onClick={() => setOverlay('settings')}>Settings <span>☷</span></button></div>
      </header>}

      {phase === 'opening' && <><div className="cinematic-bars" aria-hidden="true" /><div className="cinematic-caption"><p className="eyebrow">SURFACE CONTACT ESTABLISHED</p><p><small>TRAVELLER</small>{dialogueScript.opening.text}</p></div><button className="skip-button" onClick={() => setPhase('entry')}>Skip opening →</button></>}

      {phase === 'entry' && <section className="entry-panel">
        <p className="eyebrow">EARTHAN INTERGALACTIC EMPIRE / ARRIVALS</p><h2>Every journey<br />begins somewhere.</h2><p className="subtle">The outpost is waiting.</p>
        <button className="choice-button" onClick={() => setPhase('guided')}><span><small>01 / FIRST ARRIVAL</small>New to this world</span><b>↗</b></button>
        <button className="choice-button" onClick={() => openAccount('login')}><span><small>02 / RETURNING CITIZEN</small>Already a user</span><b>↗</b></button>
      </section>}

      {phase === 'guided' && <><div className="objective"><p className="eyebrow">SURFACE EXPEDITION</p><h2>{survey.discovered ? 'A shelter in the distance.' : 'Find what’s out there.'}</h2><p>{survey.discovered ? 'Find the entrance on the southern side of the dome.' : 'Explore the basin. Your survey picked up a faint signal.'}</p></div><div className="crosshair" aria-hidden="true">·</div>
        <div className="control-strip"><span><kbd>W A S D</kbd> Explore</span><span><kbd>SPACE</kbd> Jump</span><span>{lookHint}</span></div>
        <button className="skip-route" onClick={() => setPhase('arrival')}>Preview dome arrival →</button></>}

      {phase === 'arrival' && <><div className="cinematic-bars" aria-hidden="true" /><div className="cinematic-caption" aria-live="polite"><p className="eyebrow">{ARRIVAL_LINES[beat].label}</p><p><small>{ARRIVAL_LINES[beat].speaker}</small>{ARRIVAL_LINES[beat].line}</p></div></>}

      {phase === 'park' && !overlay && <>
        <div className="objective"><p className="eyebrow">YOUR NEXT STEP / {exercise.number}</p><h2>{exercise.name}</h2><p>Follow the blue floor markers.</p><button className="text-button" onClick={() => setOverlay('robot')}>Choose another station ↗</button></div>
        <div className="crosshair" aria-hidden="true">·</div>
        {nearbyExercise && <button className="station-prompt" onClick={() => { setSelected(nearbyExercise.id); setPhase('station'); setOverlay('review'); }}><kbd>E</kbd><span>Enter {nearbyExercise.name.toLowerCase()} station<small>{nearbyExercise.label}</small></span></button>}
        {!nearbyExercise && nearbyGame && <button className="station-prompt" onClick={() => { setSelectedGame(nearbyGame.id); setOverlay('games'); }}><kbd>E</kbd><span>Play {nearbyGame.label}<small>RECREATION / TAKE A BREAK</small></span></button>}
        <div className="control-strip"><span><kbd>W A S D</kbd> Move</span><span><kbd>SPACE</kbd> Jump</span><span>{lookHint}</span></div>
      </>}
      {['guided', 'park'].includes(phase) && !overlay && <SurveyMap survey={survey} expanded={mapExpanded} onToggle={() => { world.current?.releasePointer(); setMapExpanded(value => !value); }} />}
      {lookMode === 'free' && !overlay && <aside className="capture-help">This window blocks full mouse capture. Hold and drag here, or open <strong>127.0.0.1:5174</strong> in Edge or Chrome for game-style look.</aside>}
      {message && phase === 'park' && !overlay && <div className="robot-aside" role="status"><span>ORBIT / GUIDE</span><p>{message}</p></div>}
      {audioFailure && <div className="audio-warning" role="status">Audio could not start. The world remains playable.</div>}
    </>}

    {overlay === 'onboarding' && <Panel title="What should I call you?" eyebrow="ORBIT / FIRST CONTACT" onClose={() => setOverlay('robot')}>
      <p className="dialogue-line">“Before I start calling you ‘hey, you’… what’s your name?”</p>
      <form onSubmit={event => { event.preventDefault(); setOverlay('tour'); }}>
        <label className="callsign-field">Your callsign<input autoComplete="off" maxLength={32} value={callsign} onChange={event => setCallsign(event.target.value)} placeholder="How should ORBIT address you?" /></label>
        <p className="fine-print">{session?.configured ? 'Create an outpost ID to keep your journal and progress between visits. You can also explore as a guest.' : 'Guest expedition: your recordings and progress stay in this visit and clear on reload.'}</p>
        {session?.configured && <button className="primary" type="button" onClick={() => openAccount('register')}>Create my outpost ID ↗</button>}
        <button className="primary" type="submit">{callsign.trim() ? 'Meet your guide' : 'Continue as traveller'} ↗</button>
      </form>
    </Panel>}

    {overlay === 'tour' && <Panel title="Let me show you around." eyebrow="ORBIT / YOUR FIRST EXPEDITION" onClose={() => void completeTour()}><RobotTour onDone={() => void completeTour()} onSpeak={speakGuide} persistent={signedIn} /></Panel>}

    {overlay === 'robot' && <Panel title="There you are, traveller." eyebrow="ORBIT / YOUR OUTPOST COMPANION" onClose={closePanel}>
      <p className="dialogue-line">“{callsign.trim() || 'Traveller'}, pick something you’d like to work on. I’ll meet you there.”</p>
      <p className="subtle">Where shall we begin?</p>
      <div className="exercise-options">{EXERCISES.map(item => <button className="choice-button" key={item.id} onClick={() => choose(item.id)}><span><small>{item.number} / {item.label}</small>{item.name}</span><b>↗</b></button>)}</div>
      <button className="text-button" onClick={() => setOverlay('tour')}>Walk me through the outpost again</button>
      <p className="preview-note">Analysis runs on this computer. {signedIn ? 'Your notes and progress save to your private account. Saving the video is optional.' : 'This guest visit clears on reload.'} At the station, choose a clip and press Analyze movement.</p>
    </Panel>}

    {overlay === 'review' && <Panel title={exercise.name} eyebrow={`TRAINING STATION ${exercise.number} / ${exercise.label}`} onClose={closePanel} wide>
      <ClipPreview key={selected} exercise={exercise} onFinish={completeReview} onSpeak={speakGuide} speech={reviewSpeech} persistent={signedIn} />
      {saving && <p role="status">{saveProgress !== null ? `Saving your private recording: ${saveProgress}%` : 'Saving your review and progress…'}</p>}
      <div className="panel-footer"><span>Leaving early keeps today’s activity unchanged.</span><button className="secondary" disabled={saving} onClick={closePanel}>Leave station <span>↗</span></button></div>
    </Panel>}

    {overlay === 'settings' && <Panel title="Make yourself at home." eyebrow="OUTPOST / SETTINGS" onClose={closePanel}>
      <p className="subtle">A little more space. A little less noise.</p>
      <label className="setting-row"><span>Music<small>Original temporary sound sketch</small></span><input aria-label="Music volume" type="range" min="0" max="1" step="0.05" value={settings.music} onChange={e => setSettings(s => ({ ...s, music: Number(e.target.value) }))} /><output>{Math.round(settings.music * 100)}%</output></label>
      <label className="setting-row"><span>World sounds<small>Footsteps, machinery and interface cues</small></span><input aria-label="World sounds volume" type="range" min="0" max="1" step="0.05" value={settings.effects} onChange={e => setSettings(s => ({ ...s, effects: Number(e.target.value) }))} /><output>{Math.round(settings.effects * 100)}%</output></label>
      <label className="setting-row"><span>Dialogue<small>Traveller & ORBIT · subtitles stay visible</small></span><input aria-label="Dialogue volume" type="range" min="0" max="1" step="0.05" value={settings.dialogue} onChange={e => setSettings(s => ({ ...s, dialogue: Number(e.target.value) }))} /><output>{Math.round(settings.dialogue * 100)}%</output></label>
      <label className="setting-row"><span>Mouse sensitivity<small>Direct aim, without camera smoothing</small></span><input aria-label="Mouse sensitivity" type="range" min="0.3" max="2" step="0.1" value={settings.lookSensitivity} onChange={e => setSettings(s => ({ ...s, lookSensitivity: Number(e.target.value) }))} /><output>{settings.lookSensitivity.toFixed(1)}×</output></label>
      <label className="setting-row"><span>Reduced motion<small>Gentler scenery and camera movement; full introduction</small></span><input type="checkbox" checked={settings.reducedMotion} onChange={e => setSettings(s => ({ ...s, reducedMotion: e.target.checked }))} /></label>
      <p className="preview-note">Click the world to capture the mouse. Escape releases it. Traveller and ORBIT use recorded Deepgram voices. New feedback is spoken as your review finishes.</p>
      <button className="secondary" onClick={() => openAccount(signedIn ? 'manage' : 'register')}>{signedIn ? 'My outpost ID & recovery' : 'Save my journey with an outpost ID'} ↗</button>
      <button className="primary" onClick={closePanel}>Return ↗</button>
    </Panel>}

    {overlay === 'access' && (session?.configured ? <AccountPanel key={accountMode} mode={accountMode} session={session} onAuthenticated={authenticated} onClose={closePanel} onLogout={signedOut} /> : <Panel title="Connecting to your account." eyebrow="ORBIT / ACCOUNT ACCESS" onClose={closePanel}>
      <p className="dialogue-line">“Your journey deserves a secure home.”</p><p className="subtle">{accountError || session?.message || 'Checking the account connection…'}</p>
      <button className="secondary" onClick={() => void refreshSession()}>Check connection again</button><button className="primary" onClick={() => { setOverlay(null); setPhase('guided'); }}>Explore as a guest ↗</button>
    </Panel>)}

    {overlay === 'journal' && <Panel title="Your field journal." eyebrow="OUTPOST / PERSONAL RECORDS" onClose={closePanel}>
      <Journal entries={journey.entries} persistent={signedIn} onSettings={() => setOverlay('settings')} onDelete={deleteEntry} /><button className="primary" onClick={closePanel}>Back to the park ↗</button>
    </Panel>}
    {overlay === 'missions' && <Panel title="A little better, each time." eyebrow={`ORBIT / MISSIONS / ${dayKey()}`} onClose={closePanel}><Missions journey={signedIn ? journey : settleWeek(journey)} onProtect={protectMissedDay} persistent={signedIn} timezone={session?.profile?.timezone} /><button className="primary" onClick={closePanel}>Back to the park ↗</button></Panel>}
    {overlay === 'games' && <Panel title="Recreation deck." eyebrow="OUTPOST / OFF DUTY" onClose={closePanel} wide><MiniGames initialGame={selectedGame} onExit={closePanel} reducedMotion={settings.reducedMotion} /></Panel>}
  </main>;
}

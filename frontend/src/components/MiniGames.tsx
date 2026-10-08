import { useCallback, useEffect, useRef, useState } from 'react';
import type { MiniGameId } from '../game/miniGames';

const GAMES: Array<{ id: MiniGameId; title: string; subtitle: string; icon: string }> = [
  { id: 'signal', title: 'Signal response', subtitle: 'REACTION', icon: '◎' },
  { id: 'memory', title: 'Echo sequence', subtitle: 'MEMORY', icon: '▦' },
  { id: 'timing', title: 'Orbital alignment', subtitle: 'PRECISION', icon: '◌' },
];

/** Recreation scores are deliberately local: these games never touch the activity ledger. */
export default function MiniGames({ initialGame = 'signal', onExit, reducedMotion = false }: {
  initialGame?: MiniGameId; onExit: () => void; reducedMotion?: boolean;
}) {
  const [game, setGame] = useState<MiniGameId>(initialGame);
  const [best, setBest] = useState<Partial<Record<MiniGameId, number>>>({});
  const [systemReduced, setSystemReduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setSystemReduced(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  const record = useCallback((score: number) => setBest(previous => ({ ...previous,
    [game]: previous[game] === undefined ? score : game === 'signal' ? Math.min(previous[game]!, score) : Math.max(previous[game]!, score),
  })), [game]);
  return <section className="recreation-deck" aria-label="Recreation games">
    <div className="recreation-intro"><p>Take a breath. Try something small.</p><span>NO WORKOUT CREDITS · JUST PLAY</span></div>
    <nav className="game-selector" aria-label="Choose a mini-game">{GAMES.map(item => <button key={item.id}
      type="button" aria-pressed={game === item.id} onClick={() => setGame(item.id)}>
      <span className="game-symbol" aria-hidden="true">{item.icon}</span><span><small>{item.subtitle}</small>{item.title}</span>
    </button>)}</nav>
    <div className={`game-console game-${game}`} key={game}>
      <div className="game-console-header"><span>OUTPOST EXPERIMENT / {GAMES.findIndex(item => item.id === game) + 1}</span>
        <span>SESSION BEST <b>{best[game] === undefined ? '—' : `${best[game]}${game === 'signal' ? ' ms' : game === 'timing' ? ' / 100' : best[game] === 1 ? ' step' : ' steps'}`}</b></span></div>
      {game === 'signal' && <SignalGame onScore={record} />}
      {game === 'memory' && <MemoryGame onScore={record} />}
      {game === 'timing' && <TimingGame onScore={record} reducedMotion={reducedMotion || systemReduced} />}
    </div>
    <div className="recreation-footer"><p>Your best scores last while this panel is open. Exercise missions and energy stay separate.</p>
      <button className="secondary" onClick={onExit}>Return to the park ↗</button></div>
  </section>;
}

function SignalGame({ onScore }: { onScore: (score: number) => void }) {
  const [phase, setPhase] = useState<'idle' | 'waiting' | 'ready' | 'result'>('idle');
  const [message, setMessage] = useState('Wait for the amber light to turn mint. Then respond as quickly as you can.');
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const signalAt = useRef(0);
  const current = useRef(phase); current.current = phase;
  useEffect(() => {
    const hidden = () => { if (document.hidden) { clearTimeout(timer.current); setPhase('idle'); setMessage('Trial paused while you were away. Start when you’re ready.'); } };
    document.addEventListener('visibilitychange', hidden);
    return () => { clearTimeout(timer.current); document.removeEventListener('visibilitychange', hidden); };
  }, []);
  function act() {
    if (current.current === 'waiting') {
      clearTimeout(timer.current); setPhase('result'); setMessage('A little early. Wait until the light says RESPOND. Give it another go.');
    } else if (current.current === 'ready') {
      const milliseconds = Math.round(performance.now() - signalAt.current);
      onScore(milliseconds); setPhase('result'); setMessage(`${milliseconds} ms. Signal received. Ready for another?`);
    } else {
      setPhase('waiting'); setMessage('Hold steady. Wait for RESPOND…');
      timer.current = setTimeout(() => { signalAt.current = performance.now(); setPhase('ready'); setMessage('RESPOND'); }, 1600 + Math.random() * 2400);
    }
  }
  return <div className="signal-game">
    <div className={`signal-beacon ${phase}`} aria-hidden="true"><div /><span>{phase === 'ready' ? 'RESPOND' : phase === 'waiting' ? 'STAND BY' : 'SIGNAL LAB'}</span></div>
    <p className="game-message" role="status">{message}</p>
    <button className={`primary game-action ${phase === 'ready' ? 'ready' : ''}`} onClick={act}>
      {phase === 'waiting' ? 'Waiting for signal…' : phase === 'ready' ? 'Respond now' : phase === 'result' ? 'Try again' : 'Start signal trial'}
    </button><p className="game-keyhint">Click the button, or focus it and press <kbd>Space</kbd>. Reacting early ends the round.</p>
  </div>;
}

const PAD_NAMES = ['North', 'East', 'South', 'West'];
function MemoryGame({ onScore }: { onScore: (score: number) => void }) {
  const [sequence, setSequence] = useState<number[]>([]);
  const [phase, setPhase] = useState<'idle' | 'show' | 'input' | 'result'>('idle');
  const [lit, setLit] = useState<number | null>(null);
  const [entered, setEntered] = useState(0);
  const [message, setMessage] = useState('Watch the numbered pads, then repeat their order. Each round adds one signal.');
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const pressRef = useRef<(pad: number) => void>(() => {});
  useEffect(() => {
    if (phase !== 'show') return;
    let index = 0;
    const next = () => {
      setLit(sequence[index]);
      timer.current = setTimeout(() => {
        setLit(null); index++;
        timer.current = setTimeout(() => {
          if (index < sequence.length) next();
          else { setPhase('input'); setMessage(`Your turn. Repeat ${sequence.length} ${sequence.length === 1 ? 'signal' : 'signals'}.`); }
        }, 240);
      }, 650);
    };
    timer.current = setTimeout(next, 600);
    return () => clearTimeout(timer.current);
  }, [phase, sequence]);
  useEffect(() => {
    const hidden = () => { if (document.hidden) { clearTimeout(timer.current); setLit(null); setPhase('idle'); setMessage('Sequence paused while you were away. Start a fresh round.'); } };
    const keys = (event: KeyboardEvent) => {
      if (!event.repeat && !event.ctrlKey && !event.metaKey && !event.altKey && /^[1-4]$/.test(event.key)) { event.preventDefault(); pressRef.current(Number(event.key) - 1); }
    };
    document.addEventListener('visibilitychange', hidden); window.addEventListener('keydown', keys);
    return () => { clearTimeout(timer.current); document.removeEventListener('visibilitychange', hidden); window.removeEventListener('keydown', keys); };
  }, []);
  function start() { setEntered(0); setSequence([Math.floor(Math.random() * 4)]); setPhase('show'); setMessage('Watch the sequence.'); }
  function press(pad: number) {
    if (phase !== 'input') return;
    if (sequence[entered] !== pad) { setPhase('result'); setMessage(`Signal lost. You completed ${sequence.length - 1} ${sequence.length === 2 ? 'step' : 'steps'}. Try a new sequence?`); return; }
    const count = entered + 1; setEntered(count);
    if (count === sequence.length) {
      onScore(sequence.length);
      if (sequence.length === 8) { setPhase('result'); setMessage('Eight signals, perfectly recalled. Array calibrated.'); }
      else { setMessage('That’s it. One more signal…'); setEntered(0); setSequence(previous => [...previous, Math.floor(Math.random() * 4)]); setPhase('show'); }
    }
  }
  pressRef.current = press;
  return <div className="memory-game">
    <div className="memory-readout"><span>SEQUENCE <b>{sequence.length || '—'} / 8</b></span><span>{phase === 'input' ? `${entered} ENTERED` : phase === 'show' ? 'WATCH' : 'READY'}</span></div>
    <div className="memory-pads">{PAD_NAMES.map((name, index) => <button key={name} className={`memory-pad pad-${index} ${lit === index ? 'lit' : ''}`}
      aria-label={`${index + 1} ${name}`} disabled={phase !== 'input'} onClick={() => press(index)}>
      <span>{index + 1}</span><small>{lit === index ? 'SIGNAL' : name.toUpperCase()}</small>
    </button>)}</div>
    <p className="game-message" role="status">{message}</p>
    <button className="primary game-action" onClick={start} disabled={phase === 'show' || phase === 'input'}>{phase === 'idle' ? 'Start sequence' : phase === 'result' ? 'Try a new sequence' : 'Sequence in progress'}</button>
    <p className="game-keyhint">Use <kbd>1</kbd><kbd>2</kbd><kbd>3</kbd><kbd>4</kbd> or click the numbered pads.</p>
  </div>;
}

function TimingGame({ onScore, reducedMotion }: { onScore: (score: number) => void; reducedMotion: boolean }) {
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState('Lock the signal in the center band. Closer to 50 means a cleaner alignment.');
  const [cell, setCell] = useState(0);
  const marker = useRef<HTMLDivElement>(null);
  const startTime = useRef(0);
  useEffect(() => {
    if (!running) return;
    startTime.current = performance.now();
    // Predetermined motion stays on the compositor, independent of React renders.
    const animation = marker.current?.animate([
      { transform: 'translateX(0%)' }, { transform: 'translateX(100%)' }, { transform: 'translateX(0%)' },
    ], { duration: 3200, iterations: Infinity, easing: 'linear' });
    const interval = reducedMotion ? setInterval(() => {
      const cycle = ((performance.now() - startTime.current) % 3200) / 1600;
      setCell(Math.round((cycle <= 1 ? cycle : 2 - cycle) * 10));
    }, 80) : undefined;
    const hidden = () => { if (document.hidden) { setRunning(false); setMessage('Orbit paused while you were away. Start a fresh alignment.'); } };
    document.addEventListener('visibilitychange', hidden);
    return () => { animation?.cancel(); clearInterval(interval); document.removeEventListener('visibilitychange', hidden); };
  }, [running, reducedMotion]);
  function act() {
    if (running) {
      const cycle = ((performance.now() - startTime.current) % 3200) / 1600;
      const value = reducedMotion ? cell * 10 : (cycle <= 1 ? cycle : 2 - cycle) * 100;
      if (marker.current) marker.current.style.transform = `translateX(${value}%)`;
      const score = Math.max(0, Math.round(100 - Math.abs(value - 50) * 2));
      setRunning(false); onScore(score); setMessage(`${score} / 100. Locked at ${Math.round(value)}. ${score >= 90 ? 'Beautiful alignment.' : 'Try to catch the center on your next pass.'}`);
    } else { setCell(0); setRunning(true); setMessage('Lock the orbit when the signal reaches the center.'); }
  }
  return <div className="timing-game">
    <div className="orbit-display" aria-hidden="true"><div className="orbit-ring outer" /><div className="orbit-ring inner" /><span>◈</span></div>
    {reducedMotion ? <div className="timing-numeric" aria-label="Signal position"><span>CURRENT</span><strong>{cell * 10}</strong><small>TARGET 50</small></div>
      : <div className="timing-track" aria-hidden="true"><div className="timing-target" /><div className="timing-marker" ref={marker}><i /></div><div className="timing-ticks"><span>0</span><span>50 / TARGET</span><span>100</span></div></div>}
    <p className="game-message" role="status">{message}</p><button className="primary game-action" onClick={act}>{running ? 'Lock orbit' : 'Start orbit'}</button>
    <p className="game-keyhint">Click, or focus the button and press <kbd>Space</kbd>. {reducedMotion ? 'Reduced motion: watch the number reach 50.' : 'The center band marks 45–55.'}</p>
  </div>;
}

import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import type { Exercise, ExerciseId } from '../game/types';
import './recording-guide.css';

type Point = [number, number];
type Joint = 'head' | 'shoulder' | 'elbow' | 'wrist' | 'hip' | 'knee' | 'ankle' | 'farElbow' | 'farWrist' | 'farKnee' | 'farAnkle';
type Pose = Record<Joint, Point>;
type Props = { exercise: Exercise; reducedMotion?: boolean; onSpeak?: (text: string) => void };
const DURATION = 4400;
const JOINTS: Joint[] = ['head', 'shoulder', 'elbow', 'wrist', 'hip', 'knee', 'ankle', 'farElbow', 'farWrist', 'farKnee', 'farAnkle'];
const BONES: [Joint, Joint][] = [['shoulder', 'farElbow'], ['farElbow', 'farWrist'], ['hip', 'farKnee'], ['farKnee', 'farAnkle'], ['head', 'shoulder'], ['shoulder', 'hip'], ['shoulder', 'elbow'], ['elbow', 'wrist'], ['hip', 'knee'], ['knee', 'ankle']];
const POSES: Record<ExerciseId, [Pose, Pose]> = {
  pullup: [
    { head: [448,128], shoulder: [449,148], elbow: [421,106], wrist: [421,70], hip: [449,205], knee: [431,235], ankle: [442,258], farElbow: [478,106], farWrist: [481,70], farKnee: [460,235], farAnkle: [470,258] },
    { head: [448,66], shoulder: [449,86], elbow: [415,103], wrist: [421,70], hip: [449,143], knee: [431,181], ankle: [442,209], farElbow: [484,103], farWrist: [481,70], farKnee: [460,181], farAnkle: [470,209] },
  ],
  pushup: [
    { head: [369,170], shoulder: [389,188], elbow: [386,221], wrist: [387,258], hip: [465,214], knee: [505,235], ankle: [547,258], farElbow: [400,222], farWrist: [402,258], farKnee: [516,233], farAnkle: [558,255] },
    { head: [360,211], shoulder: [382,226], elbow: [419,239], wrist: [387,258], hip: [465,239], knee: [505,249], ankle: [547,258], farElbow: [432,237], farWrist: [402,258], farKnee: [516,247], farAnkle: [558,255] },
  ],
  squat: [
    { head: [440,91], shoulder: [441,113], elbow: [478,132], wrist: [498,124], hip: [445,181], knee: [442,219], ankle: [451,258], farElbow: [482,125], farWrist: [505,117], farKnee: [456,217], farAnkle: [466,256] },
    { head: [458,145], shoulder: [452,168], elbow: [483,179], wrist: [513,171], hip: [417,208], knee: [468,226], ankle: [451,258], farElbow: [490,173], farWrist: [520,165], farKnee: [482,224], farAnkle: [466,256] },
  ],
};
const COPY: Record<ExerciseId, { placement: string; frame: string; top: string; bottom: string; height: string }> = {
  pullup: { placement: 'Place the phone to one side or at a three-quarter angle, roughly around hip or chest height. Step it back until the bar and your arms fit.', frame: 'Check the raised and lowered positions. Keep the bar, hands, elbows and shoulders in view. Leave space above and below you.', top: 'Raised position: keep hands and bar in view.', bottom: 'Lowered position: leave room for your arms.', height: 'HIP / CHEST HEIGHT' },
  pushup: { placement: 'Set the phone low, near your body height in the push-up position. A side or three-quarter view helps. Use a steady support.', frame: 'Check the top and bottom positions. Keep shoulders, elbows and hands visible. Include your hips and feet when you can.', top: 'Top position: check the whole body fits.', bottom: 'Bottom position: hands and elbows still visible.', height: 'LOW, NEAR BODY HEIGHT' },
  squat: { placement: 'Set the phone roughly around hip height, to one side or at a three-quarter angle. Use a steady support and leave space to move.', frame: 'Check standing and lowered positions. Keep hips, knees and ankles in view. Leave room around the movement, not just around one pose.', top: 'Standing: leave a little space above you.', bottom: 'Lowered: keep hips, knees and ankles in view.', height: 'AROUND HIP HEIGHT' },
};
const STEPS = ['Place the camera', 'Check both ends', 'Record a short set'];
function pointTransform(point: Point) { return `translate(${point[0]}px, ${point[1]}px)`; }
function boneTransform(a: Point, b: Point) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  return `translate(${a[0]}px, ${a[1]}px) rotate(${Math.atan2(dy, dx)}rad) scaleX(${Math.hypot(dx, dy)})`;
}
function mixPose(id: ExerciseId, amount: number): Pose {
  const [first, second] = POSES[id];
  return Object.fromEntries(JOINTS.map(joint => [joint, [first[joint][0] + (second[joint][0] - first[joint][0]) * amount, first[joint][1] + (second[joint][1] - first[joint][1]) * amount]])) as Pose;
}

/** A capture/framing illustration, not a biomechanical reference or form prescription. */
export default function RecordingGuide({ exercise, reducedMotion = false, onSpeak }: Props) {
  const id = useId();
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [portrait, setPortrait] = useState(false);
  const [position, setPosition] = useState<0 | 1>(0);
  const [phase, setPhase] = useState(0);
  const [systemReduced, setSystemReduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [visible, setVisible] = useState(true);
  const container = useRef<HTMLElement>(null);
  const drawing = useRef<SVGSVGElement>(null);
  const animations = useRef<Animation[]>([]);
  const controls = useRef<(HTMLButtonElement | null)[]>([]);
  const frozenTime = useRef(0);
  const reduced = reducedMotion || systemReduced;
  const copy = COPY[exercise.id];
  const details = [copy.placement, copy.frame, 'Record a few repetitions at your usual pace, with one person and one exercise in the clip. Keep the phone still. A playable 2–120 second clip works.'];
  const still = reduced || !playing;

  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const change = () => setSystemReduced(media.matches);
    media.addEventListener('change', change);
    return () => media.removeEventListener('change', change);
  }, []);
  useEffect(() => {
    if (!container.current) return;
    const observer = new IntersectionObserver(entries => setVisible(entries[0]?.isIntersecting ?? false));
    observer.observe(container.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const root = drawing.current;
    if (!root) return;
    const samples = Array.from({ length: 33 }, (_, index) => mixPose(exercise.id, (1 - Math.cos(index / 32 * Math.PI * 2)) / 2));
    const options = { duration: DURATION, iterations: Infinity, easing: 'linear' };
    const list: Animation[] = [];
    root.querySelectorAll<SVGGElement>('[data-bone]').forEach((element, index) => {
      const [start, end] = BONES[index];
      list.push(element.animate(samples.map(pose => ({ transform: boneTransform(pose[start], pose[end]) })), options));
    });
    root.querySelectorAll<SVGGElement>('[data-joint]').forEach(element => {
      const joint = element.dataset.joint as Joint;
      list.push(element.animate(samples.map(pose => ({ transform: pointTransform(pose[joint]) })), options));
    });
    const placement = root.querySelector<SVGGElement>('[data-placement]');
    if (placement && step === 0) list.push(placement.animate([
      { transform: 'translateX(14px)', offset: 0 }, { transform: 'translateX(-12px)', offset: .25 },
      { transform: 'translateX(-12px)', offset: .85 }, { transform: 'translateX(14px)', offset: 1 },
    ], { ...options, easing: 'cubic-bezier(.77, 0, .175, 1)' }));
    animations.current = list;
    list.forEach(animation => { animation.pause(); animation.currentTime = frozenTime.current; });
    return () => { list.forEach(animation => animation.cancel()); animations.current = []; };
  }, [exercise.id, step]);
  useEffect(() => {
    const list = animations.current;
    if (reduced) { list.forEach(animation => { animation.pause(); animation.currentTime = position * DURATION / 2; }); return; }
    if (playing && visible) list.forEach(animation => animation.play());
    else list.forEach(animation => animation.pause());
    if (!playing || !visible) return;
    // Captions update only at the two meaningful positions, never on every rendered frame.
    const timer = window.setInterval(() => {
      const time = Number(list[0]?.currentTime ?? 0) % DURATION;
      frozenTime.current = time;
      setPhase(time > DURATION / 4 && time < DURATION * .75 ? 1 : 0);
    }, 160);
    return () => clearInterval(timer);
  }, [playing, reduced, visible, position, step, exercise.id]);

  function chooseStep(next: number) {
    frozenTime.current = 0; setPosition(0); setPhase(0); setStep(next);
  }
  function keyStep(event: KeyboardEvent<HTMLButtonElement>, current: number) {
    const next = event.key === 'ArrowRight' ? (current + 1) % 3 : event.key === 'ArrowLeft' ? (current + 2) % 3 : event.key === 'Home' ? 0 : event.key === 'End' ? 2 : null;
    if (next === null) return;
    event.preventDefault(); chooseStep(next); controls.current[next]?.focus();
  }
  function showPosition(next: 0 | 1) {
    setPlaying(false); setPosition(next); setPhase(next); frozenTime.current = next * DURATION / 2;
    animations.current.forEach(animation => { animation.pause(); animation.currentTime = frozenTime.current; });
  }
  const selectedPosition = reduced ? position : phase;
  const caption = step === 0 ? selectedPosition === 0 ? 'Place it to one side, with space to step back.' : 'Set it down. Keep the camera steady while recording.'
    : selectedPosition === 0 ? (exercise.id === 'pullup' ? copy.bottom : copy.top) : (exercise.id === 'pullup' ? copy.top : copy.bottom);
  const pose = POSES[exercise.id][0];
  const phoneY = exercise.id === 'pushup' ? 214 : 156;
  return <section className="recording-guide" ref={container} aria-label={`${exercise.name} recording walkthrough`}>
    <div className="recording-guide-heading"><div><p className="recording-guide-eyebrow">ORBIT / GET A CLEARER VIEW</p><h3>A little room to move.</h3></div><span className="recording-guide-tag">{exercise.name}</span></div>
    <div role="tablist" aria-label="Recording steps" className="recording-guide-steps">{STEPS.map((title, index) => <button key={title} type="button" role="tab" id={`${id}-tab-${index}`} aria-selected={step === index} aria-controls={`${id}-content`} tabIndex={step === index ? 0 : -1} ref={element => { controls.current[index] = element; }} onClick={() => chooseStep(index)} onKeyDown={event => keyStep(event, index)}><span>0{index + 1}</span>{title}</button>)}</div>
    <div role="tabpanel" id={`${id}-content`} aria-labelledby={`${id}-tab-${step}`} tabIndex={0}>
      <div className="recording-guide-visual" data-paused={still} data-step={step}>
        <svg ref={drawing} viewBox="0 0 640 310" role="img" aria-labelledby={`${id}-drawing-title ${id}-drawing-desc`}>
          <title id={`${id}-drawing-title`}>{exercise.name}: phone placement and full movement framing</title>
          <desc id={`${id}-drawing-desc`}>A steady phone at {copy.height.toLowerCase()} points toward one person. A frame leaves space around both ends of the movement. This schematic explains recording, not ideal exercise technique.</desc>
          <defs><linearGradient id={`${id}-view`} x1="0" x2="1"><stop offset="0" stopColor="#a5e3d8" stopOpacity=".12"/><stop offset="1" stopColor="#a5e3d8" stopOpacity="0"/></linearGradient></defs>
          <path d="M32 274H610" className="rg-ground" />
          <path d={`M166 ${phoneY} 302 66V266Z`} fill={`url(#${id}-view)`} />
          <path d={`m180 ${phoneY} 72 0m-7-5 7 5-7 5`} className="rg-ray" />
          <text x="205" y="193" textAnchor="middle" className="rg-note">SIDE OR ¾ VIEW</text>
          <g data-placement="true">
            <g transform={`translate(108 ${phoneY})`}>
              <path d={exercise.id === 'pushup' ? 'M0 25V53m0-17-25 17m25-17 25 17' : 'M0 28V111m0-66-35 66m35-66 35 66'} className="rg-tripod" />
              <g transform={portrait ? 'rotate(90)' : undefined}>
                <rect x="-57" y="-33" width="114" height="66" rx="11" className="rg-phone" />
                <rect x="-46" y="-25" width="92" height="50" rx="4" className="rg-phone-screen" />
                <circle cx="-51" cy="0" r="2" fill="#bad4d6" />
                <path d="M-32-13h9m-9 0v8m55-8h-9m9 0v8M-32 13h9m-9 0V5m55 8h-9m9 0V5" className="rg-phone-corners" />
                <circle cx="34" cy="-16" r="3" fill={step === 2 ? '#ffbba5' : '#9bdaca'} />
                <path d="M-10 0h20M0-10v20" className="rg-phone-corners" opacity=".45" />
              </g>
            </g>
          </g>
          <text x="108" y={exercise.id === 'pushup' ? 157 : 73} textAnchor="middle" className="rg-label">{portrait ? 'PORTRAIT WORKS TOO' : 'LANDSCAPE = MORE ROOM'}</text>
          <text x="108" y={exercise.id === 'pushup' ? 174 : 90} textAnchor="middle" className="rg-note">{copy.height}</text>
          <rect x="302" y="32" width="302" height="247" rx="12" className={`rg-camera-frame ${step === 1 ? 'is-active' : ''}`} />
          <path d="M318 58V48h16m254 10V48h-16M318 252v11h16m254-11v11h-16" className="rg-frame-corners" />
          <text x="320" y="20" className="rg-note">WHAT YOUR CAMERA SEES</text>
          <text x="590" y="20" textAnchor="end" className="rg-note">{step === 2 ? '● REC' : 'PREVIEW'}</text>
          {exercise.id === 'pullup' && <><path d="M391 70h120M400 70v192m103-192v192" className="rg-equipment"/><path d="M394 70h116" className="rg-bar" /></>}
          <path d="M340 265h238" className="rg-ground" />
          {BONES.map(([a, b], index) => <g key={`${a}-${b}`} data-bone={index} style={{ transform: boneTransform(pose[a], pose[b]) }} className={index < 4 ? 'rg-bone rg-far' : 'rg-bone'}><line x1="0" y1="0" x2="1" y2="0" vectorEffect="non-scaling-stroke" /></g>)}
          {JOINTS.filter(joint => !joint.startsWith('far')).map(joint => <g data-joint={joint} key={joint} style={{ transform: pointTransform(pose[joint]) }} className="rg-joint"><circle r={joint === 'head' ? 11 : 3.8} className={joint === 'head' ? 'rg-head' : undefined} />{joint === 'head' && <path d="M4-3h2" className="rg-face" />}</g>)}
          {step === 1 && <><path d="M568 84v-18m-4 4 4-4 4 4M568 235v18m-4-4 4 4 4-4" className="rg-room"/><text x="560" y="154" textAnchor="end" className="rg-note">LEAVE</text><text x="560" y="168" textAnchor="end" className="rg-note">ROOM</text></>}
        </svg>
        <p className="recording-guide-caption" data-testid="recording-caption"><span aria-hidden="true">{step === 2 ? '●' : '◈'}</span>{caption}</p>
      </div>
      <div className="recording-guide-controls">
        <div className="recording-guide-orientation" role="group" aria-label="Phone orientation"><button type="button" aria-pressed={!portrait} onClick={() => setPortrait(false)}>Landscape</button><button type="button" aria-pressed={portrait} onClick={() => setPortrait(true)}>Portrait</button></div>
        <div className="recording-guide-playback">{!reduced && <button type="button" onClick={() => setPlaying(!playing)} aria-label={playing ? 'Pause recording example' : 'Play recording example'}>{playing ? 'Ⅱ Pause' : '▷ Play'}</button>}{still && <div role="group" aria-label="Example positions"><button type="button" aria-pressed={selectedPosition === 0} onClick={() => showPosition(0)}>Position 1</button><button type="button" aria-pressed={selectedPosition === 1} onClick={() => showPosition(1)}>Position 2</button></div>}</div>
      </div>
      {reduced && <p className="recording-guide-reduced">Motion is off. Choose either position to check the framing.</p>}
      <p className="recording-guide-detail">{details[step]}</p>
      {step === 0 && <p className="recording-guide-small">Landscape helps fit the whole movement. Portrait works too if the relevant joints stay in view.</p>}
      <div className="recording-guide-footer">{onSpeak && <button type="button" className="recording-guide-read" onClick={() => onSpeak(`${STEPS[step]}. ${details[step]} ${step === 0 ? 'Landscape helps fit the whole movement. Portrait works too.' : ''}`)}>Read these tips</button>}<span>Framing example, not a form demonstration.</span></div>
    </div>
    <p className="recording-guide-existing"><span aria-hidden="true">↗</span><span><strong>Already have a clip?</strong> Try it as it is. Other camera angles are welcome. ORBIT will explain what it can see and what needs another view.</span></p>
  </section>;
}

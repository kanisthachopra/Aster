export type Phase = 'title' | 'opening' | 'entry' | 'guided' | 'arrival' | 'park' | 'station';
export type ExerciseId = 'pullup' | 'pushup' | 'squat';
export interface Exercise {
  id: ExerciseId; number: string; name: string; label: string;
  position: [number, number]; cue: string; capture: string[];
}
export const EXERCISES: Exercise[] = [
  { id: 'pullup', number: '01', name: 'Pull-ups', label: 'ASCENT', position: [-18, 58],
    cue: 'Got a clip of your set? Let’s take a look.',
    capture: ['A side or three-quarter view usually shows the arm movement best. Other views are welcome too.', 'Keep shoulders, elbows, hands and the bar in view throughout the set. Step the camera back if they leave the frame.', 'Record at your usual pace with a steady camera. Missing feet need not prevent an arm review.'] },
  { id: 'pushup', number: '02', name: 'Push-ups', label: 'GROUNDWORK', position: [0, 73],
    cue: 'Show me a few reps. We’ll go through them together.',
    capture: ['Try a side or three-quarter view, with the camera near your height in the push-up position.', 'Check the top and bottom position before recording: shoulders, elbows and wrists should stay visible at both.', 'Hips and feet help with body-line observations. If something is cropped, I’ll explain which observations are still possible.'] },
  { id: 'squat', number: '03', name: 'Squats', label: 'FOUNDATION', position: [18, 58],
    cue: 'Take your usual pace. I’ll mark the moments worth looking at.',
    capture: ['A side or three-quarter view makes knee movement easier to measure; you can try an existing clip from another angle.', 'Keep hips, knees and ankles visible while standing and at your lowest point. A cropped head need not prevent a leg review.', 'Set the camera down somewhere steady with enough light. One exercise and one person per clip works best.'] },
];
export type LookMode = 'off' | 'locked' | 'free';
export interface Survey { x: number; z: number; bearing: number; discovered: boolean; inside: boolean; }
export interface Settings { music: number; effects: number; dialogue: number; lookSensitivity: number; reducedMotion: boolean; }
export const DEFAULT_SETTINGS: Settings = { music: 0.35, effects: 0.45, dialogue: .75, lookSensitivity: 1, reducedMotion: false };
export function loadSettings(): Settings {
  try {
    const raw = JSON.parse(localStorage.getItem('aster.preferences') || '{}');
    const volume = (v: unknown, fallback: number) => typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : fallback;
    return { music: volume(raw.music, .35), effects: volume(raw.effects, .45), dialogue: volume(raw.dialogue, .75), lookSensitivity: typeof raw.lookSensitivity === 'number' && Number.isFinite(raw.lookSensitivity) ? Math.max(.3, Math.min(2, raw.lookSensitivity)) : 1, reducedMotion: typeof raw.reducedMotion === 'boolean' ? raw.reducedMotion : matchMedia('(prefers-reduced-motion: reduce)').matches };
  } catch { return DEFAULT_SETTINGS; }
}

export type Phase = 'title' | 'opening' | 'entry' | 'guided' | 'arrival' | 'park' | 'station';
export type ExerciseId = 'pullup' | 'pushup' | 'squat';
export interface Exercise {
  id: ExerciseId; number: string; name: string; label: string;
  position: [number, number]; cue: string; capture: string[];
}
export const EXERCISES: Exercise[] = [
  { id: 'pullup', number: '01', name: 'Pull-ups', label: 'ASCENT', position: [-18, 58],
    cue: 'A little gravity. A lot of possibility.',
    capture: ['Place the camera to your side, with the bar, both hands and your whole body visible.', 'Keep the camera still and leave space above the bar and below your feet.', 'Record a short set at your usual pace. One exercise per clip.'] },
  { id: 'pushup', number: '02', name: 'Push-ups', label: 'GROUNDWORK', position: [0, 73],
    cue: 'Every good ascent starts from the ground.',
    capture: ['Place the camera to your side, around body height while in the push-up position.', 'Keep your hands, shoulders, hips and feet in frame for the whole movement.', 'Use a stable, well-lit view. Avoid placing equipment in front of your body.'] },
  { id: 'squat', number: '03', name: 'Squats', label: 'FOUNDATION', position: [18, 58],
    cue: 'Let’s build a stronger foundation.',
    capture: ['Use a stable side view with your whole body and both feet in frame.', 'Leave enough space above your head while standing and below your feet.', 'Record a short set at your usual pace. Other angles may be requested if needed.'] },
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

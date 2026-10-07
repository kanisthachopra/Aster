import type { LookMode } from './types';

/** Pointer lock is optional: a denied request must never disable mouse look. */
export class MouseLook {
  mode: LookMode = 'off';
  private last: [number, number] | null = null;
  private edge = 0;
  private cleanups: Array<() => void> = [];
  constructor(private canvas: HTMLCanvasElement, private enabled: () => boolean,
    private turn: (dx: number, dy: number) => void, private changed: (mode: LookMode) => void) {
    const activate = (event: PointerEvent) => {
      if (!enabled() || event.button !== 0) return;
      this.last = [event.clientX, event.clientY]; this.setMode('free');
      try {
        const result = canvas.requestPointerLock?.();
        result?.catch(() => { if (this.mode !== 'off') this.setMode('free'); });
      } catch { this.setMode('free'); }
    };
    const move = (event: PointerEvent) => {
      if (!enabled() || this.mode === 'off') { this.last = null; return; }
      if (document.pointerLockElement === canvas) turn(event.movementX, event.movementY);
      else {
        if (this.last) turn(event.clientX - this.last[0], event.clientY - this.last[1]);
        this.last = [event.clientX, event.clientY];
        const rect = canvas.getBoundingClientRect();
        const ratio = (event.clientX - rect.left) / rect.width;
        this.edge = ratio < .06 ? -1 : ratio > .94 ? 1 : 0;
      }
    };
    const lock = () => {
      if (document.pointerLockElement === canvas) this.setMode('locked');
      else if (this.mode === 'locked') this.release();
    };
    const denied = () => { if (enabled() && this.mode !== 'off') this.setMode('free'); };
    const escape = (event: KeyboardEvent) => { if (event.code === 'Escape') this.release(); };
    const blur = () => this.release();
    const leave = () => { this.edge = 0; this.last = null; };
    // Babylon prevents pointerdown's default, suppressing compatibility mousedown events.
    canvas.addEventListener('pointerdown', activate); canvas.addEventListener('pointerleave', leave);
    document.addEventListener('pointermove', move); document.addEventListener('pointerlockchange', lock);
    document.addEventListener('pointerlockerror', denied); window.addEventListener('keydown', escape);
    window.addEventListener('blur', blur);
    this.cleanups.push(() => {
      canvas.removeEventListener('pointerdown', activate); canvas.removeEventListener('pointerleave', leave);
      document.removeEventListener('pointermove', move); document.removeEventListener('pointerlockchange', lock);
      document.removeEventListener('pointerlockerror', denied); window.removeEventListener('keydown', escape);
      window.removeEventListener('blur', blur);
    });
  }
  private setMode(mode: LookMode) { this.mode = mode; this.changed(mode); }
  update(dt: number) { if (this.mode === 'free' && this.enabled()) this.turn(this.edge * dt * 470, 0); }
  release() {
    this.setMode('off'); this.last = null; this.edge = 0;
    if (document.pointerLockElement === this.canvas) document.exitPointerLock();
  }
  dispose() { this.release(); this.cleanups.forEach(fn => fn()); }
}

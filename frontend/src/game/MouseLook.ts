import type { LookMode } from './types';

/** Relative movement is the only FPS input. Embedded browsers use explicit drag, never edge scrolling. */
export class MouseLook {
  mode: LookMode = 'off';
  private last: [number, number] | null = null;
  private dragPointer: number | null = null;
  private active = false;
  private generation = 0;
  private attempt = 0;
  private pending: { generation: number; attempt: number; raw: boolean } | null = null;
  private cleanups: Array<() => void> = [];

  constructor(private canvas: HTMLCanvasElement, private enabled: () => boolean,
    private turn: (dx: number, dy: number) => void, private changed: (mode: LookMode) => void) {
    const activate = (event: PointerEvent) => {
      if (!enabled() || event.button !== 0 || !event.isPrimary) return;
      this.active = true;
      this.dragPointer = event.pointerId;
      this.last = [event.clientX, event.clientY];
      if (document.pointerLockElement === canvas) { this.setMode('locked'); return; }
      this.setMode('free');
      try { canvas.setPointerCapture(event.pointerId); } catch { /* Synthetic input may not be capturable. */ }
      if (!this.pending) this.request(true, this.generation);
    };
    const move = (event: PointerEvent) => {
      if (!enabled() || !this.active) return;
      if (document.pointerLockElement === canvas) {
        this.turn(event.movementX, event.movementY);
      } else if (event.pointerId === this.dragPointer && (event.buttons & 1) !== 0) {
        if (this.last) this.turn(event.clientX - this.last[0], event.clientY - this.last[1]);
        this.last = [event.clientX, event.clientY];
      }
    };
    const stopDrag = (event: PointerEvent) => {
      if (event.pointerId === this.dragPointer) this.clearDrag();
    };
    const lock = () => {
      if (document.pointerLockElement === canvas) {
        this.pending = null;
        if (!this.active || !enabled()) { document.exitPointerLock(); return; }
        this.clearDrag(); this.setMode('locked');
      } else if (this.mode === 'locked') this.release();
    };
    const denied = () => {
      const pending = this.pending;
      if (pending) this.failed(pending.generation, pending.attempt, pending.raw);
    };
    const escape = (event: KeyboardEvent) => { if (event.code === 'Escape') this.release(); };
    const blur = () => this.release();
    const visibility = () => { if (document.hidden) this.release(); };
    canvas.addEventListener('pointerdown', activate);
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', stopDrag);
    document.addEventListener('pointercancel', stopDrag);
    document.addEventListener('pointerlockchange', lock);
    document.addEventListener('pointerlockerror', denied);
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('keydown', escape);
    window.addEventListener('blur', blur);
    this.cleanups.push(() => {
      canvas.removeEventListener('pointerdown', activate);
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', stopDrag);
      document.removeEventListener('pointercancel', stopDrag);
      document.removeEventListener('pointerlockchange', lock);
      document.removeEventListener('pointerlockerror', denied);
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('keydown', escape); window.removeEventListener('blur', blur);
    });
  }

  private request(raw: boolean, generation: number) {
    if (!this.active || !this.enabled() || generation !== this.generation) return;
    const attempt = ++this.attempt;
    this.pending = { generation, attempt, raw };
    try {
      if (!this.canvas.requestPointerLock) { this.pending = null; return; }
      // Raw input removes OS pointer acceleration; unsupported browsers receive a normal lock request.
      const result = raw ? this.canvas.requestPointerLock({ unadjustedMovement: true }) : this.canvas.requestPointerLock();
      result?.catch(() => this.failed(generation, attempt, raw));
    } catch { this.failed(generation, attempt, raw); }
  }
  private failed(generation: number, attempt: number, raw: boolean) {
    if (this.pending?.attempt !== attempt || generation !== this.generation || !this.active) return;
    this.pending = null;
    if (raw) this.request(false, generation);
    else this.setMode('free');
  }
  private clearDrag() {
    const pointer = this.dragPointer;
    this.dragPointer = null; this.last = null;
    if (pointer !== null && this.canvas.hasPointerCapture(pointer)) this.canvas.releasePointerCapture(pointer);
  }
  private setMode(mode: LookMode) { if (this.mode !== mode) { this.mode = mode; this.changed(mode); } }
  update(_dt: number) { if (!this.enabled() && this.active) this.release(); }
  release() {
    this.active = false; this.generation++; this.pending = null;
    this.clearDrag(); this.setMode('off');
    if (document.pointerLockElement === this.canvas) document.exitPointerLock();
  }
  dispose() { this.release(); this.cleanups.forEach(fn => fn()); }
}

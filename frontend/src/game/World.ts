import { Color3, Color4 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Engine } from '@babylonjs/core/Engines/engine';
import { Scene } from '@babylonjs/core/scene';
import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator';
import { GlowLayer } from '@babylonjs/core/Layers/glowLayer';
import { PointLight } from '@babylonjs/core/Lights/pointLight';
import { DefaultRenderingPipeline } from '@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/defaultRenderingPipeline';
import { ImageProcessingConfiguration } from '@babylonjs/core/Materials/imageProcessingConfiguration';
import '@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent';
import '@babylonjs/core/Culling/ray';
import { Environment } from './Environment';
import { Park } from './Park';
import { createHands, createAvatar } from './Characters';
import { MouseLook } from './MouseLook';
import { EXERCISES, type ExerciseId, type Phase, type LookMode, type Survey } from './types';
import { HABITAT, LANDING, clamp, smooth, terrainHeight } from './terrain';
import { installEnvironmentLighting } from './SurfaceMaterials';
import { GAME_STATIONS, type MiniGameId } from './miniGames';

export type ArrivalBeat = 'threshold' | 'lights' | 'machine' | 'robot' | 'greeting';
type Events = {
  arrived: () => void; opened: () => void; introduced: () => void;
  station: (id: ExerciseId) => void; proximity: (id: ExerciseId | null, distance: number) => void;
  capture: (mode: LookMode) => void; survey: (survey: Survey) => void;
  beat: (beat: ArrivalBeat) => void; step: () => void;
  game?: (id: MiniGameId) => void; gameProximity?: (id: MiniGameId | null, distance: number) => void;
  ready?: () => void;
};

export class World {
  private engine: Engine;
  private scene: Scene;
  private camera: FreeCamera;
  private environment: Environment;
  private park: Park;
  private hands: ReturnType<typeof createHands>;
  private avatar: ReturnType<typeof createAvatar>;
  private look: MouseLook;
  private phase: Phase = 'title';
  private phaseTime = 0;
  private clock = 0;
  private paused = false;
  private stationFramePending = true;
  private reduced = false;
  private lookSensitivity = 1;
  private keys = new Set<string>();
  private speed = 0;
  private height = 0;
  private vertical = 0;
  private selected: ExerciseId | null = null;
  private near: ExerciseId | null = null;
  private nearGame: MiniGameId | null = null;
  private portraitLight: PointLight;
  private discovered = false;
  private inside = false;
  private lastSurvey = 0;
  private lastStep = 0;
  private lastBeat = '';
  private lastPhaseEvent = false;
  private arrivalStart = Vector3.Zero();
  private arrivalFocus = Vector3.Zero();
  private cleanups: Array<() => void> = [];

  constructor(canvas: HTMLCanvasElement, private events: Events) {
    this.engine = new Engine(canvas, true, { stencil: true, preserveDrawingBuffer: true });
    this.engine.renderEvenInBackground = false;
    this.engine.setHardwareScalingLevel(Math.max(1, window.devicePixelRatio / 1.5));
    this.scene = new Scene(this.engine); this.scene.clearColor = new Color4(.006, .012, .02, 1);
    this.scene.fogMode = Scene.FOGMODE_EXP2; this.scene.fogDensity = .00135; this.scene.fogColor = new Color3(.12, .105, .092);
    this.scene.imageProcessingConfiguration.toneMappingEnabled = true;
    this.scene.imageProcessingConfiguration.toneMappingType = ImageProcessingConfiguration.TONEMAPPING_ACES;
    this.scene.imageProcessingConfiguration.exposure = 1.45;
    this.scene.imageProcessingConfiguration.contrast = 1.07;
    this.camera = new FreeCamera('player', new Vector3(-64, 24, -2), this.scene);
    this.camera.inputs.clear(); this.camera.minZ = .025; this.camera.maxZ = 1800; this.camera.fov = 1.02;
    this.camera.setTarget(new Vector3(0, 14, 65));
    installEnvironmentLighting(this.scene);
    const pipeline = new DefaultRenderingPipeline('outpost-cinematic-render', true, this.scene, [this.camera]);
    pipeline.fxaaEnabled = true; pipeline.bloomEnabled = true; pipeline.bloomThreshold = 1.2; pipeline.bloomWeight = .12; pipeline.bloomKernel = 48; pipeline.bloomScale = .35;
    const sky = new HemisphericLight('ambient-sky', Vector3.Up(), this.scene);
    sky.intensity = .5; sky.diffuse = new Color3(.55, .69, .82); sky.groundColor = new Color3(.18, .13, .095);
    const sun = new DirectionalLight('distant-sun', new Vector3(.65, -.7, .35), this.scene);
    sun.position.set(-80, 120, -60); sun.diffuse = new Color3(1, .86, .69); sun.intensity = 1.8;
    this.portraitLight = new PointLight('helmet-reflected-fill', Vector3.Zero(), this.scene);
    this.portraitLight.diffuse = new Color3(.65, .78, .86); this.portraitLight.intensity = .35; this.portraitLight.range = 7;
    const glow = new GlowLayer('atmospheric-lights', this.scene, { mainTextureRatio: .5, blurKernelSize: 48 }); glow.intensity = .42;
    this.environment = new Environment(this.scene); this.park = new Park(this.scene);
    this.hands = createHands(this.scene, this.camera); this.avatar = createAvatar(this.scene);
    this.avatar.root.setEnabled(false);
    const shadows = new ShadowGenerator(2048, sun); shadows.usePercentageCloserFiltering = true; shadows.filteringQuality = ShadowGenerator.QUALITY_LOW; shadows.bias = .002;
    for (const mesh of this.scene.meshes) {
      if (['boulder', 'pylon', 'barbell', 'support', 'console', 'bench', 'planter', 'robot-body'].some(word => mesh.name.includes(word)) || mesh.isDescendantOf(this.avatar.root)) shadows.addShadowCaster(mesh);
    }
    this.scene.onNewMeshAddedObservable.add(mesh => { if (mesh.name === 'scanned-geological-boulders') shadows.addShadowCaster(mesh); });
    this.look = new MouseLook(canvas, () => !this.paused && ['guided', 'park'].includes(this.phase), (dx, dy) => {
      this.camera.rotation.y += dx * .0022 * this.lookSensitivity;
      this.camera.rotation.x = clamp(this.camera.rotation.x + dy * .0022 * this.lookSensitivity, -1.25, 1.25);
    }, events.capture);
    this.bindKeys();
    let lastRender = performance.now();
    this.engine.runRenderLoop(() => {
      const now = performance.now();
      const frozenReview = this.paused && this.phase === 'station';
      if (frozenReview && !this.stationFramePending) return;
      // Reading panels need only gentle background life. Leave CPU/GPU time for local video inference.
      if (this.paused && !frozenReview && now - lastRender < 1000 / 12) return;
      const dt = Math.min((now - lastRender) / 1000, .1);
      lastRender = now; this.update(dt); this.scene.render();
      this.stationFramePending = false;
    });
    const resize = () => { this.engine.resize(); this.stationFramePending = true; }; window.addEventListener('resize', resize); this.cleanups.push(() => window.removeEventListener('resize', resize));
    let readinessSent = false;
    const notifyReady = () => {
      if (readinessSent || this.scene.isDisposed) return;
      readinessSent = true; clearTimeout(readinessTimeout); events.ready?.();
    };
    // Optional art should not permanently strand the visitor if an image fails to decode.
    const readinessTimeout = window.setTimeout(notifyReady, 20000);
    void this.environment.ready.then(() => { if (!this.scene.isDisposed) this.scene.executeWhenReady(notifyReady); });
    this.cleanups.push(() => clearTimeout(readinessTimeout));
  }
  private bindKeys() {
    const down = (event: KeyboardEvent) => {
      if (event.code === 'Escape') { this.keys.clear(); this.speed = 0; }
      if (this.paused || !['guided', 'park'].includes(this.phase)) return;
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'KeyE', 'ArrowLeft', 'ArrowRight'].includes(event.code)) event.preventDefault();
      this.keys.add(event.code);
      if (event.code === 'Space' && this.height === 0 && !event.repeat) this.vertical = 4.2;
      if (event.code === 'KeyE' && this.phase === 'park' && !event.repeat) {
        if (this.nearGame) this.events.game?.(this.nearGame); else if (this.near) this.events.station(this.near);
      }
    };
    const up = (event: KeyboardEvent) => this.keys.delete(event.code);
    const blur = () => { this.keys.clear(); this.speed = 0; };
    window.addEventListener('keydown', down); window.addEventListener('keyup', up); window.addEventListener('blur', blur);
    this.cleanups.push(() => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', blur); });
  }
  setPhase(phase: Phase) {
    this.stationFramePending = true;
    const previous = this.phase;
    this.phase = phase; this.phaseTime = 0; this.keys.clear(); this.speed = 0; this.height = 0; this.vertical = 0; this.lastPhaseEvent = false;
    if (phase === 'entry' && previous === 'opening') {
      this.camera.rotation.set(-.18, Math.atan2(-LANDING.x, 60 - LANDING.z), 0);
    }
    if (phase === 'opening' || (phase === 'guided' && previous !== 'entry' && previous !== 'opening')) {
      this.inside = false; this.discovered = false; this.park.setInside(false);
      this.camera.position.set(LANDING.x, terrainHeight(LANDING.x, LANDING.z) + 1.73, LANDING.z);
      this.camera.rotation.set(phase === 'opening' ? .5 : -.025, 0, 0);
    }
    if (phase === 'arrival') {
      this.discovered = true; this.lastBeat = ''; this.avatar.root.setEnabled(true);
      // A deliberately selected preview begins at the airlock; walking there retains the actual view.
      if (Vector3.Distance(this.camera.position, new Vector3(0, 1.85, 15)) > 35) {
        this.camera.position.set(0, 1.85, 12); this.camera.setTarget(new Vector3(0, 1.6, 24));
      }
      this.arrivalStart.copyFrom(this.camera.position);
      this.arrivalFocus.copyFrom(this.camera.position.add(this.camera.getForwardRay().direction.scale(12)));
    }
    if (phase === 'park' && previous !== 'station') {
      this.inside = true; this.park.setInside(true);
      if (previous !== 'arrival') { this.camera.position.set(0, 1.85, 32); this.camera.rotation.set(0, 0, 0); }
    }
    if (!['guided', 'park'].includes(phase)) this.releasePointer();
    this.avatar.root.setEnabled(phase === 'arrival');
  }
  pause(value: boolean) { this.paused = value; this.stationFramePending = true; this.keys.clear(); this.speed = 0; if (value) this.releasePointer(); }
  setReducedMotion(value: boolean) { this.reduced = value; }
  setLookSensitivity(value: number) { this.lookSensitivity = clamp(Number.isFinite(value) ? value : 1, .3, 2); }
  releasePointer() { this.look?.release(); }
  select(id: ExerciseId) { this.selected = id; }
  private once(callback: () => void) { if (!this.lastPhaseEvent) { this.lastPhaseEvent = true; callback(); } }
  private arrival() {
    const time = this.phaseTime;
    const third = time > .5 && time < 9.4 && !this.reduced;
    this.avatar.root.setEnabled(third);
    const walk = smooth((time - 1.5) / 6.5), gait = Math.sin(walk * Math.PI);
    this.avatar.root.position.set(0, .2 + (!this.reduced ? Math.sin(time * 12) * .013 * gait : 0), 16 + walk * 16);
    this.avatar.legs.forEach((leg, i) => { leg.rotation.x = Math.sin(time * 6 + i * Math.PI) * .34 * gait; });
    this.avatar.arms.forEach((arm, i) => { arm.rotation.x = -Math.sin(time * 6 + i * Math.PI) * .22 * gait; });
    this.avatar.knees.forEach((knee, i) => { knee.rotation.x = Math.max(0, -Math.sin(time * 6 + i * Math.PI)) * .46 * gait; });
    this.inside = time > 4; this.park.openEntrance(time / 1.7);
    let position: Vector3, focus: Vector3;
    if (time < 10) {
      if (this.reduced) position = Vector3.Lerp(this.arrivalStart, new Vector3(0, 1.85, 32), smooth(time / 10));
      else if (time < 4) position = Vector3.Lerp(this.arrivalStart, new Vector3(1.8, 2.05, 25), smooth(time / 4));
      else if (time < 7) position = Vector3.Lerp(new Vector3(1.8, 2.05, 25), new Vector3(3.5, 2.45, 35), smooth((time - 4) / 3));
      else position = Vector3.Lerp(new Vector3(3.5, 2.45, 35), new Vector3(0, 1.85, 32), smooth((time - 7) / 3));
      const portrait = this.avatar.root.position.add(new Vector3(0, 1.5, .12));
      focus = Vector3.Lerp(this.arrivalFocus, portrait, smooth(time / 2.5));
      focus = Vector3.Lerp(focus, new Vector3(0, 8, 60), smooth((time - 6) / 4));
    } else {
      position = new Vector3(0, 1.85, 32);
      const sky = new Vector3(0, 8, 60), bay = new Vector3(-26, 1.9, 40);
      focus = Vector3.Lerp(sky, bay, smooth((time - 12) / 3));
      focus = Vector3.Lerp(focus, this.park.robot.position, smooth((time - 17) / 3));
    }
    this.camera.position.copyFrom(position); this.camera.setTarget(focus);
    const beat: ArrivalBeat = time < 10 ? 'threshold' : time < 14 ? 'lights' : time < 18 ? 'machine' : time < 24 ? 'robot' : 'greeting';
    if (beat !== this.lastBeat) { this.lastBeat = beat; this.events.beat(beat); }
    if (time >= 29) this.once(this.events.introduced);
    return { power: smooth((time - 10) / 4), robot: clamp((time - 14) / 13, 0, 1) };
  }
  private update(dt: number) {
    this.portraitLight.position.copyFrom(this.camera.position.add(new Vector3(1.8, .7, -.5)));
    this.portraitLight.intensity = ['opening', 'arrival'].includes(this.phase) ? .6 : .12;
    this.clock += dt; if (!this.paused) this.phaseTime += dt;
    this.environment.update(this.clock, this.reduced);
    this.look.update(dt);
    let power = this.inside ? 1 : 0, robot = this.inside ? 1 : 0;
    if (this.phase === 'arrival') { const state = this.arrival(); power = state.power; robot = state.robot; }
    const firstPerson = ['opening', 'entry', 'guided', 'park', 'station'].includes(this.phase) || (this.phase === 'arrival' && this.phaseTime > 9.5);
    this.hands.root.setEnabled(firstPerson);
    const handsHeight = (this.phase === 'opening' ? .13 : -.08) + (this.reduced ? 0 : Math.sin(this.clock * (this.speed > .1 ? 8 : 1.6)) * (this.speed > .1 ? .008 : .003));
    this.hands.root.position.y += (handsHeight - this.hands.root.position.y) * Math.min(1, dt * 6);
    this.hands.fingers.forEach((finger, i) => { finger.rotation.x = this.phase === 'opening' ? Math.sin(this.phaseTime * .7 + i * .15) * .11 : .12; });
    if (this.phase === 'title') {
      this.camera.position.set(-64 + (this.reduced ? 0 : Math.sin(this.clock * .045) * 2), 24, -2);
      this.camera.setTarget(new Vector3(0, 15, 65));
    }
    if (!this.paused && this.phase === 'opening') {
      this.camera.rotation.x = .5 - smooth((this.phaseTime - 3) / 7) * .68;
      this.camera.rotation.y = smooth((this.phaseTime - 5) / 5) * Math.atan2(-LANDING.x, 60 - LANDING.z);
      if (this.phaseTime >= 12) this.once(this.events.opened);
    }
    if (!this.paused && ['guided', 'park'].includes(this.phase)) this.move(dt);
    this.park.update(this.clock, power, robot, this.camera.position, this.phase === 'park' ? this.selected : null, this.reduced);
    if (!this.paused && this.clock - this.lastSurvey > .12) {
      this.lastSurvey = this.clock;
      let nearest: ExerciseId | null = null, distance = Infinity;
      for (const ex of EXERCISES) {
        const d = Math.hypot(this.camera.position.x - ex.position[0], this.camera.position.z - ex.position[1]);
        if (d < distance) { distance = d; nearest = ex.id; }
      }
      this.near = this.phase === 'park' && distance < 6 ? nearest : null; this.events.proximity(this.near, distance);
      let gameDistance = Infinity; this.nearGame = null;
      if (this.phase === 'park') for (const game of GAME_STATIONS) {
        const d = Math.hypot(this.camera.position.x - game.position[0], this.camera.position.z - game.position[1]);
        if (d < gameDistance) { gameDistance = d; this.nearGame = d < 4.2 ? game.id : null; }
      }
      if (this.near && distance < gameDistance) this.nearGame = null;
      if (this.nearGame) { this.near = null; this.events.proximity(null, distance); }
      this.events.gameProximity?.(this.nearGame, gameDistance);
      // Discovery requires a clear terrain line of sight, not just a distance threshold.
      if (!this.discovered && this.phase === 'guided' && Math.hypot(this.camera.position.x, this.camera.position.z - 60) < 110) {
        let clear = true;
        for (let i = 1; i < 16; i++) {
          const p = Vector3.Lerp(this.camera.position, new Vector3(0, 20, 60), i / 16);
          if (terrainHeight(p.x, p.z) > p.y) clear = false;
        }
        this.discovered = clear;
      }
      this.events.survey({ x: this.camera.position.x, z: this.camera.position.z, bearing: ((this.camera.rotation.y * 180 / Math.PI) % 360 + 360) % 360, discovered: this.discovered, inside: this.inside });
    }
  }
  private move(dt: number) {
    const forward = Number(this.keys.has('KeyW')) - Number(this.keys.has('KeyS'));
    const strafe = Number(this.keys.has('KeyD')) - Number(this.keys.has('KeyA'));
    this.camera.rotation.y += (Number(this.keys.has('ArrowRight')) - Number(this.keys.has('ArrowLeft'))) * dt * 1.1;
    const moving = forward !== 0 || strafe !== 0;
    this.speed = moving ? Math.min(this.speed + dt * 4, this.phase === 'guided' ? 8 : 5.5) : 0;
    const yaw = this.camera.rotation.y, length = Math.hypot(forward, strafe) || 1;
    let x = this.camera.position.x + (Math.sin(yaw) * forward + Math.cos(yaw) * strafe) / length * this.speed * dt;
    let z = this.camera.position.z + (Math.cos(yaw) * forward - Math.sin(yaw) * strafe) / length * this.speed * dt;
    this.vertical -= 8.5 * dt; this.height = Math.max(0, this.height + this.vertical * dt); if (this.height === 0) this.vertical = 0;
    if (this.phase === 'guided') {
      x = clamp(x, -185, 185); z = clamp(z, -160, 175);
      const resolved = this.environment.collisions.move(this.camera.position, { x, z }, terrainHeight(this.camera.position.x, this.camera.position.z) + this.height);
      x = resolved.x; z = resolved.z;
      if (this.park.contains(x, z)) { x = this.camera.position.x; z = this.camera.position.z; }
      this.camera.position.set(x, terrainHeight(x, z) + 1.73 + this.height, z);
      if (Math.hypot(x, z - 15.5) < 5) this.once(this.events.arrived);
    } else {
      // The sealed rear sectors and habitat shell are physical movement boundaries.
      z = Math.min(z, 82.5);
      const resolved = this.park.collisions.move(this.camera.position, { x, z }, .15 + this.height);
      x = resolved.x; z = resolved.z;
      if (Math.hypot(x, z - HABITAT.z) > 39.5) { x = this.camera.position.x; z = this.camera.position.z; }
      this.camera.position.set(x, 1.85 + this.height, z);
    }
    if (moving && this.height === 0 && this.clock - this.lastStep > (this.speed > 5 ? .38 : .55)) { this.lastStep = this.clock; this.events.step(); }
  }
  dispose() { this.look.dispose(); this.cleanups.forEach(fn => fn()); this.engine.stopRenderLoop(); this.scene.dispose(); this.engine.dispose(); }
}

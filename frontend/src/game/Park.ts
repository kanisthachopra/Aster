import { Scene } from '@babylonjs/core/scene';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Material } from '@babylonjs/core/Materials/material';
import { FresnelParameters } from '@babylonjs/core/Materials/fresnelParameters';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { PointLight } from '@babylonjs/core/Lights/pointLight';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { EXERCISES, type ExerciseId } from './types';
import { HABITAT, smooth } from './terrain';
import { material } from './Environment';
import { surfaceMaterial, deckTexture } from './SurfaceMaterials';
import { CollisionWorld } from './Collision';
import { GAME_STATIONS } from './miniGames';

export class Park {
  readonly collisions = new CollisionWorld();
  robot: TransformNode;
  private robotEye: StandardMaterial;
  private doors: Mesh[] = [];
  private lights: PointLight[] = [];
  private illuminants: StandardMaterial[] = [];
  private arrows: Mesh[] = [];
  private robotFins: Mesh[] = [];
  private entranceDoors: Mesh[] = [];
  private gameProps: Mesh[] = [];
  constructor(private scene: Scene) {
    const metal = surfaceMaterial(scene, 'brushed-titanium', '#42545c', .38, .68);
    const pale = surfaceMaterial(scene, 'structural-ceramic', '#b8c0bb', .34, .12);
    const dark = material(scene, 'deck-composite', '#17262d');
    const amber = material(scene, 'standby-amber', '#bf935d', .18);
    const glass = material(scene, 'frosted-silicate-glass', '#93b2b6');
    glass.alpha = .17; glass.specularColor.set(.8, .88, .9); glass.specularPower = 120;
    glass.useReflectionOverAlpha = false; glass.useSpecularOverAlpha = false;
    glass.reflectionTexture = scene.environmentTexture?.clone() ?? null;
    if (glass.reflectionTexture) glass.reflectionTexture.level = .12;
    glass.opacityFresnelParameters = new FresnelParameters();
    glass.opacityFresnelParameters.leftColor = new Color3(.8, .8, .8); glass.opacityFresnelParameters.rightColor = new Color3(.2, .2, .2);
    glass.emissiveFresnelParameters = new FresnelParameters();
    glass.emissiveFresnelParameters.leftColor = new Color3(.09, .16, .19);
    glass.emissiveFresnelParameters.rightColor = Color3.Black(); glass.emissiveFresnelParameters.power = 3;
    // Individual triangular panes and warm structural members follow the supplied geodesic reference.
    // A shallow cap (19m high across an 84m footprint) replaces the tall metallic shell.
    const template = MeshBuilder.CreateIcoSphere('geodesic-template', { radius: 42, subdivisions: 5, flat: true }, scene);
    const raw = template.getVerticesData(VertexBuffer.PositionKind)!;
    const rawIndices = template.getIndices()!;
    const positions: number[] = [], indices: number[] = [], edges = new Map<string, [Vector3, Vector3]>();
    const key = (p: Vector3) => `${p.x.toFixed(3)},${p.y.toFixed(3)},${p.z.toFixed(3)}`;
    const clip = (polygon: Vector3[], distance: (p: Vector3) => number) => {
      const result: Vector3[] = [];
      polygon.forEach((a, j) => {
        const b = polygon[(j + 1) % polygon.length], da = distance(a), db = distance(b);
        if (da >= 0) result.push(a);
        if ((da >= 0) !== (db >= 0)) result.push(Vector3.Lerp(a, b, da / (da - db)));
      });
      return result;
    };
    for (let i = 0; i < rawIndices.length; i += 3) {
      let polygon = [0, 1, 2].map(j => { const k = rawIndices[i + j] * 3; return new Vector3(raw[k], raw[k + 1], raw[k + 2]); });
      const clipped: Vector3[] = [];
      for (let j = 0; j < polygon.length; j++) {
        const a = polygon[j], b = polygon[(j + 1) % polygon.length];
        if (a.y >= 0) clipped.push(a);
        if ((a.y >= 0) !== (b.y >= 0)) clipped.push(Vector3.Lerp(a, b, a.y / (a.y - b.y)));
      }
      polygon = clipped.map(p => new Vector3(p.x, .2 + p.y * .46, 60 + p.z));
      if (polygon.length < 3) continue;
      // Cut the actual doorway through intersecting panes and beams, not only face centroids.
      const fragments = polygon.some(p => p.z < 25) ? [
        clip(polygon, p => -3.65 - p.x),
        clip(polygon, p => p.x - 3.65),
        clip(clip(clip(polygon, p => p.x + 3.65), p => 3.65 - p.x), p => p.y - 5.4),
      ] : [polygon];
      for (const fragment of fragments) {
        if (fragment.length < 3) continue;
        const base = positions.length / 3;
        fragment.forEach(p => positions.push(p.x, p.y, p.z));
        for (let j = 1; j < fragment.length - 1; j++) indices.push(base, base + j, base + j + 1);
        fragment.forEach((a, j) => { const b = fragment[(j + 1) % fragment.length]; if (Vector3.DistanceSquared(a, b) < .0001) return; const k = [key(a), key(b)].sort().join('|'); edges.set(k, [a, b]); });
      }
    }
    template.dispose();
    const normals: number[] = []; VertexData.ComputeNormals(positions, indices, normals);
    const domeShell = new Mesh('triangular-glass-panels', scene), data = new VertexData();
    data.positions = positions; data.indices = indices; data.normals = normals; data.applyToMesh(domeShell); domeShell.material = glass;
    const inner = new Mesh('clear-interior-glass', scene), insideData = new VertexData();
    insideData.positions = positions; insideData.indices = indices.flatMap((_, i) => i % 3 === 0 ? [indices[i + 2], indices[i + 1], indices[i]] : []);
    insideData.normals = normals.map(v => -v); insideData.applyToMesh(inner);
    const insideGlass = material(scene, 'interior-glass', '#7eafbe'); insideGlass.alpha = .045;
    insideGlass.specularColor.set(.3, .6, .7); inner.material = insideGlass;
    const frame = surfaceMaterial(scene, 'champagne-geodesic-frame', '#bdac8c', .28, .74);
    const beams = [...edges.values()].filter(([a, b]) => !(Math.max(a.y, b.y) < .3 && (a.z + b.z) / 2 < 30 && Math.abs((a.x + b.x) / 2) < 8)).map(([a, b]) => this.tube('geodesic-member', [a, b], .066, frame));
    Mesh.MergeMeshes(beams, true, true, undefined, false, true);
    this.tube('roof-signal-mast', [new Vector3(0, 18.5, 60), new Vector3(0, 24, 60)], .06, metal);
    const beaconMat = material(scene, 'expedition-signal', '#ffd2a1', 2.5);
    const roofBeacon = MeshBuilder.CreateSphere('habitat-discovery-beacon', { diameter: .48, segments: 16 }, scene);
    roofBeacon.position.set(0, 24, 60); roofBeacon.material = beaconMat;
    const deck = MeshBuilder.CreateCylinder('habitat-deck', { diameter: 83.5, height: .35, tessellation: 128 }, scene);
    const flooring = surfaceMaterial(scene, 'scuffed-floor-panels', '#738181', .68, .12); flooring.albedoTexture = deckTexture(scene);
    deck.position.set(0, -.04, 60); deck.material = flooring; deck.receiveShadows = true;
    for (let x = -40; x <= 40; x += 2.5) this.box('deck-expansion-joint', [.016, .01, Math.sqrt(41 * 41 - x * x) * 2], [x, .14, 60], dark);
    for (const radius of [40, 28, 12]) {
      const lightMat = this.lightMaterial(`floor-light-${radius}`);
      const gap = radius === 40 ? .13 : 0, path: Vector3[] = [];
      for (let i = 0; i <= 128; i++) { const a = -Math.PI / 2 + gap + i / 128 * (Math.PI * 2 - gap * 2); path.push(new Vector3(Math.cos(a) * radius, .16, 60 + Math.sin(a) * radius)); }
      this.tube('habitat-recessed-light', path, .012, lightMat);
    }
    for (const x of [-3.3, 3.3]) {
      this.box('airlock-pier', [.65, 5.3, 4.7], [x, 2.6, 18.8], metal);
      this.box('airlock-inset-panel', [.025, 3.8, 2.8], [x - Math.sign(x) * .34, 2.55, 18.8], dark);
      this.box('airlock-guide-strip', [.055, 4.5, .035], [x, 2.5, 16.43], amber);
      for (let vent = 0; vent < 6; vent++) this.box('airlock-vent', [.39, .035, .027], [x, .5 + vent * .11, 16.42], dark);
      for (const z of [16.47, 21.13]) for (const y of [.24, 4.86]) this.box('airlock-corner-fastener', [.35, .14, .04], [x, y, z], pale);
    }
    this.box('airlock-lintel', [7.2, .5, 4.7], [0, 5.15, 18.8], metal);
    this.label('O U T P O S T   0 7', new Vector3(0, 5.10, 16.4), 4.7, .35);
    const innerEntryLabel = this.label('O U T P O S T   0 7', new Vector3(0, 5.10, 21.3), 4.7, .35);
    innerEntryLabel.rotation.y = Math.PI;
    this.box('entry-threshold', [6.3, .06, 5], [0, .05, 18.5], dark);
    for (const side of [-1, 1]) this.entranceDoors.push(this.box('airlock-sliding-door', [3.1, 5.05, .16], [side * 1.55, 2.6, 17.3], glass));
    for (const ex of EXERCISES) {
      const [x, z] = ex.position;
      const pad = MeshBuilder.CreateCylinder(`${ex.id}-station`, { diameter: 10, height: .08, tessellation: 64 }, scene);
      pad.position.set(x, .19, z); pad.material = dark; pad.receiveShadows = true;
      const glow = this.lightMaterial(`${ex.id}-light`);
      const rim = MeshBuilder.CreateTorus('station-perimeter', { diameter: 10, thickness: .06, tessellation: 96 }, scene);
      rim.position.set(x, .24, z); rim.material = glow;
      this.label(`${ex.number} / ${ex.label}`, new Vector3(x, 1, z - 4), 4, .5);
      if (ex.id === 'pullup') {
        this.box('suspended-pullup-bar', [3.8, .095, .095], [x, 3.1, z], pale);
        for (const dx of [-1.9, 1.9]) {
          this.box('magnetic-bar-pylon', [.18, 2.7, .28], [x + dx, 1.5, z], metal);
          this.box('magnetic-field', [.23, .22, .3], [x + dx, 3.04, z], glow);
          this.box('pylon-foot', [.8, .12, .9], [x + dx, .24, z], pale);
          this.collisions.add({ id: `pullup-pylon-${dx}`, kind: 'box', x: x + dx, z, halfX: .19, halfZ: .23, bottom: .15, top: 3.2 });
        }
      } else if (ex.id === 'pushup') {
        this.box('exercise-mat', [3, .04, 1.7], [x, .25, z], metal);
        for (const dx of [-.55, .55]) this.tube('pushup-handle', [new Vector3(x + dx, .25, z), new Vector3(x + dx, .48, z), new Vector3(x + dx, .48, z + .5), new Vector3(x + dx, .25, z + .5)], .045, pale);
        for (const dx of [-.55, .55]) this.collisions.add({ id: `pushup-handle-${dx}`, kind: 'box', x: x + dx, z: z + .25, halfX: .09, halfZ: .32, bottom: .23, top: .55 });
      } else {
        for (const dx of [-1.7, 1.7]) {
          this.box('squat-support', [.14, 2.5, .14], [x + dx, 1.45, z + 1.5], metal);
          this.box('squat-rack-foot', [.8, .12, 1.6], [x + dx, .24, z + 1.5], pale);
          this.collisions.add({ id: `squat-post-${dx}`, kind: 'box', x: x + dx, z: z + 1.5, halfX: .14, halfZ: .2, bottom: .15, top: 2.8 });
        }
        this.box('barbell', [4.5, .065, .065], [x, 1.65, z + 1.5], pale);
        this.collisions.add({ id: 'racked-barbell', kind: 'box', x, z: z + 1.5, halfX: 2.3, halfZ: .13, bottom: 1.3, top: 2.0 });
        for (const dx of [-1.9, 1.9]) for (let p = 0; p < 3; p++) {
          const plate = MeshBuilder.CreateCylinder('barbell-plate', { diameter: .68 - p * .1, height: .10, tessellation: 40 }, scene);
          plate.position.set(x + dx + Math.sign(dx) * p * .11, 1.65, z + 1.5); plate.rotation.z = Math.PI / 2; plate.material = dark;
        }
      }
      const light = new PointLight(`station-${ex.id}`, new Vector3(x, 5, z), scene); light.diffuse = new Color3(.6, .85, 1); light.range = 23; light.intensity = 0; this.lights.push(light);
      const beacon = this.box('station-beacon', [.3, 3.5, .3], [x + 4.8, 1.95, z + 2], metal);
      const cap = this.box('station-beacon-light', [.32, .12, .32], [x + 4.8, 3.65, z + 2], glow);
      beacon.receiveShadows = cap.receiveShadows = true;
      this.collisions.add({ id: `beacon-${ex.id}`, kind: 'circle', x: x + 4.8, z: z + 2, radius: .22, bottom: .15, top: 3.7 });
    }
    // Rear sectors occupy real space, remain dark, and have a physical crossing boundary.
    for (const x of [-19, 0, 19]) {
      this.box('sealed-sector-barrier', [15, 1.4, .25], [x, .85, 85], dark);
      this.box('sector-standby-strip', [15, .028, .27], [x, 1.56, 85], amber);
      this.label(x < 0 ? 'SECTOR B / DIPS' : x > 0 ? 'SECTOR D / RECOVERY' : 'SECTOR C / STRENGTH', new Vector3(x, 3, 85), 5, .5);
      this.label('POWER OFFLINE / ACCESS SEALED', new Vector3(x, 2.25, 85), 4.5, .35);
      for (const dx of [-1, 1]) this.tube('future-training-equipment', [new Vector3(x + dx, .2, 89), new Vector3(x + dx, 1.8, 89), new Vector3(x + dx, 1.8, 92)], .075, metal);
    }
    // A service bay holds the dormant robot until the actual arrival sequence reaches startup.
    const bay = new TransformNode('robot-service-bay', scene); bay.position.set(-26, .15, 40); bay.rotation.y = -.65;
    this.collisions.add({ id: 'orbit-service-bay', kind: 'box', x: -26, z: 40, halfX: 1.9, halfZ: 1.8, bottom: .15, top: 3.9 });
    for (const x of [-1.2, 1.2]) { const wall = this.box('bay-side', [.2, 3.6, 2.2], [x, 1.8, 0], metal); wall.parent = bay; }
    const back = this.box('bay-rear', [2.6, 3.6, .2], [0, 1.8, .95], dark); back.parent = bay;
    for (const y of [.1, 3.6]) { const shelf = this.box('bay-frame', [2.6, .2, 2.2], [0, y, 0], pale); shelf.parent = bay; }
    for (const side of [-1, 1]) { const door = this.box('service-bay-shutter', [1.18, 3.1, .12], [side * .6, 1.8, -1.03], metal); door.parent = bay; this.doors.push(door); }
    this.label('ORBIT / SERVICE BAY', new Vector3(-26, 4.5, 38), 4.5, .4);
    this.robot = new TransformNode('orbit-guide', scene); this.robot.position.set(-26, 1.2, 40);
    const shell = material(scene, 'robot-ceramic', '#c9d2ce');
    const body = MeshBuilder.CreateSphere('robot-body', { diameter: 1.1, segments: 32 }, scene); body.scaling.set(1, .8, .7); body.parent = this.robot; body.material = shell;
    const face = this.box('robot-visor', [.75, .27, .09], [0, .04, -.36], dark); face.parent = this.robot;
    this.robotEye = material(scene, 'robot-powered-eyes', '#8de9ed', 0);
    for (const x of [-.19, .19]) { const eye = this.box('robot-eye', [.075, .08, .03], [x, .05, -.42], this.robotEye); eye.parent = this.robot; }
    const hover = MeshBuilder.CreateTorus('robot-stabilizer', { diameter: .6, thickness: .05, tessellation: 40 }, scene); hover.parent = this.robot; hover.position.y = -.55; hover.material = this.robotEye;
    for (const side of [-1, 1]) { const fin = this.box('robot-fin', [.25, .045, .5], [side * .58, -.1, .05], metal); fin.parent = this.robot; fin.rotation.z = side * .2; this.robotFins.push(fin); }
    const route = material(scene, 'interior-guidance', '#8ce4e3', .8);
    for (let i = 0; i < 18; i++) { const arrow = this.box('station-navigation', [.1, .014, .35], [0, .25, 0], route); arrow.isVisible = false; this.arrows.push(arrow); }
    for (const game of GAME_STATIONS) {
      const [x, z] = game.position, glow = material(scene, `game-${game.id}-light`, game.color, .7);
      const base = MeshBuilder.CreateCylinder(`${game.id}-console-base`, { diameter: 2.8, height: .22, tessellation: 48 }, scene);
      base.position.set(x, .25, z); base.material = metal; base.receiveShadows = true;
      this.box(`${game.id}-console-pedestal`, [1.4, 1.05, .85], [x, .86, z], metal);
      const screen = this.box(`${game.id}-touchscreen`, [1.8, .09, 1.05], [x, 1.46, z], pale); screen.rotation.x = -.24;
      const screenFace = this.box(`${game.id}-display`, [1.58, .012, .86], [x, 1.52, z], glow); screenFace.rotation.x = -.24;
      this.label(game.label.toUpperCase(), new Vector3(x, 2.5, z), 4, .43);
      this.label(game.subtitle, new Vector3(x, 2.08, z), 3.6, .27);
      const ring = MeshBuilder.CreateTorus(`${game.id}-hologram`, { diameter: 1.1, thickness: .02, tessellation: 48 }, scene);
      ring.position.set(x, 3.6, z); ring.rotation.x = Math.PI / 2; ring.material = glow; this.gameProps.push(ring);
      this.collisions.add({ id: `game-${game.id}`, kind: 'box', x, z, halfX: .95, halfZ: .64, bottom: .15, top: 1.7 });
      for (let i = 0; i < 3; i++) this.box('console-status-light', [.12, .035, .12], [x - .28 + i * .28, 1.1, z - .44], glow);
    }
    // Service furniture and planted bioreactors add scale and a lived-in habitat without blocking routes.
    for (const x of [-13, 13]) {
      this.box('crew-bench', [4.2, .22, 1.2], [x, .64, 34], pale);
      for (const dx of [-1.5, 1.5]) this.box('bench-foot', [.18, .5, .85], [x + dx, .35, 34], metal);
      this.collisions.add({ id: `bench-${x}`, kind: 'box', x, z: 34, halfX: 2.1, halfZ: .6, bottom: .15, top: .78 });
    }
    for (const [x, z] of [[-32, 53], [32, 51], [-13, 80], [13, 80]]) {
      const planter = MeshBuilder.CreateCylinder('habitat-planter', { diameterTop: 2.2, diameterBottom: 1.8, height: .7, tessellation: 32 }, scene);
      planter.position.set(x, .52, z); planter.material = pale; planter.receiveShadows = true;
      const leaves = surfaceMaterial(scene, `bioreactor-leaves-${x}-${z}`, '#556f63', .83);
      for (let leaf = 0; leaf < 9; leaf++) {
        const a = leaf / 9 * Math.PI * 2;
        const stalk = MeshBuilder.CreateTube('bioreactor-leaf', { path: [new Vector3(x, .85, z), new Vector3(x + Math.cos(a) * .5, 1.7 + (leaf % 3) * .15, z + Math.sin(a) * .5), new Vector3(x + Math.cos(a) * 1.1, 1.5, z + Math.sin(a) * 1.1)], radius: .075, tessellation: 5 }, scene); stalk.material = leaves;
      }
      this.collisions.add({ id: `planter-${x}-${z}`, kind: 'circle', x, z, radius: 1.1, bottom: .15, top: 1.8 });
    }
  }
  private lightMaterial(name: string) { const m = material(this.scene, name, '#85cfd7'); this.illuminants.push(m); return m; }
  private box(name: string, size: [number, number, number], position: [number, number, number], mat: Material) {
    const mesh = MeshBuilder.CreateBox(name, { width: size[0], height: size[1], depth: size[2] }, this.scene); mesh.position.set(...position); mesh.material = mat; mesh.receiveShadows = true; return mesh;
  }
  private tube(name: string, points: Vector3[], radius: number, mat: Material) { const m = MeshBuilder.CreateTube(name, { path: points, radius, tessellation: 12 }, this.scene); m.material = mat; return m; }
  private label(text: string, at: Vector3, width: number, height: number) {
    const texture = new DynamicTexture(text, { width: 1024, height: 128 }, this.scene, false); texture.hasAlpha = true;
    texture.drawText(text, null, 82, '38px monospace', '#afcdd1', 'transparent', true);
    const m = material(this.scene, text, '#ffffff', .35); m.diffuseTexture = texture; m.opacityTexture = texture; m.backFaceCulling = true;
    const panel = MeshBuilder.CreatePlane(text, { width, height }, this.scene); panel.position.copyFrom(at); panel.material = m;
    return panel;
  }
  update(time: number, power: number, robotProgress: number, player: Vector3, target: ExerciseId | null, reduced: boolean) {
    this.gameProps.forEach((prop, i) => { prop.rotation.z = reduced ? 0 : time * .12 * (i % 2 ? -1 : 1); prop.visibility = .25 + power * .75; });
    this.illuminants.forEach((m, i) => m.emissiveColor.set(.33 * smooth(power * 3 - i * .17), .75 * smooth(power * 3 - i * .17), .83 * smooth(power * 3 - i * .17)));
    this.lights.forEach((light, i) => { light.intensity = 1.2 * smooth(power * 2 - i * .3); });
    this.doors.forEach((door, i) => { door.position.x = (i === 0 ? -1 : 1) * (.6 + smooth((robotProgress - .03) / .2) * .95); });
    const awake = smooth((robotProgress - .15) / .18);
    this.robotEye.emissiveColor.set(.3 * awake, 1.2 * awake, 1.3 * awake);
    // First rise vertically off the charging cradle, then clear the shutters, then turn and approach.
    const lift = smooth((robotProgress - .18) / .15), leave = smooth((robotProgress - .3) / .16), travel = smooth((robotProgress - .46) / .54);
    const cradle = new Vector3(-26, 1.2 + lift * .55, 40);
    const clearDoor = new Vector3(-24.5, 1.75, 37.4);
    const from = Vector3.Lerp(cradle, clearDoor, leave);
    const end = new Vector3(-2.3, 1.75, 35.4);
    this.robot.position.copyFrom(Vector3.Lerp(from, end, travel));
    if (!reduced) this.robot.position.y += awake * Math.sin(time * 1.5) * .018;
    const facing = Math.atan2(this.robot.position.x - player.x, this.robot.position.z - player.z);
    this.robot.rotation.y = -.65 + Math.atan2(Math.sin(facing + .65), Math.cos(facing + .65)) * smooth((robotProgress - .4) / .6);
    this.robot.rotation.z = !reduced ? Math.sin(travel * Math.PI * 2) * .045 : 0;
    this.robotFins.forEach((fin, i) => { fin.rotation.z = (i === 0 ? -1 : 1) * (.05 + lift * .15 + Math.sin(travel * Math.PI) * .08); });
    const exercise = EXERCISES.find(e => e.id === target);
    this.arrows.forEach((arrow, i) => {
      arrow.isVisible = !!exercise && power >= 1;
      if (!exercise) return;
      const endpoint = new Vector3(exercise.position[0], .25, exercise.position[1] - 3), start = new Vector3(player.x, .25, player.z);
      arrow.position.copyFrom(Vector3.Lerp(start, endpoint, (i + 1) / 20)); arrow.rotation.y = Math.atan2(endpoint.x - start.x, endpoint.z - start.z);
    });
  }
  setInside(inside: boolean) { this.openEntrance(inside ? 1 : 0); }
  openEntrance(progress: number) { this.entranceDoors.forEach((door, index) => { door.position.x = (index === 0 ? -1 : 1) * (1.55 + smooth(progress) * 3.2); }); }
  contains(x: number, z: number) { return Math.hypot(x - HABITAT.x, z - HABITAT.z) < HABITAT.radius; }
}

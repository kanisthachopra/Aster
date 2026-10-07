import { Scene } from '@babylonjs/core/scene';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { FresnelParameters } from '@babylonjs/core/Materials/fresnelParameters';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import { PointLight } from '@babylonjs/core/Lights/pointLight';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { EXERCISES, type ExerciseId } from './types';
import { HABITAT, smooth } from './terrain';
import { material } from './Environment';

export class Park {
  robot: TransformNode;
  private robotEye: StandardMaterial;
  private doors: Mesh[] = [];
  private lights: PointLight[] = [];
  private illuminants: StandardMaterial[] = [];
  private arrows: Mesh[] = [];
  private dome: Mesh;
  private entranceDoors: Mesh[] = [];
  constructor(private scene: Scene) {
    const metal = material(scene, 'brushed-titanium', '#31434b');
    const pale = material(scene, 'structural-ceramic', '#83999f');
    const dark = material(scene, 'deck-composite', '#17262d');
    const amber = material(scene, 'standby-amber', '#bf935d', .18);
    const glass = material(scene, 'reflective-outer-shell', '#374d58');
    glass.specularColor.set(.72, .83, .86); glass.specularPower = 100;
    glass.emissiveFresnelParameters = new FresnelParameters();
    glass.emissiveFresnelParameters.leftColor = new Color3(.09, .16, .19);
    glass.emissiveFresnelParameters.rightColor = Color3.Black(); glass.emissiveFresnelParameters.power = 3;
    this.dome = MeshBuilder.CreateSphere('opaque-exterior-dome', { diameter: 84, segments: 96, slice: .5 }, scene);
    this.dome.position.set(0, .2, 60); this.dome.scaling.y = .66; this.dome.material = glass;
    const shellPositions = this.dome.getVerticesData(VertexBuffer.PositionKind)!;
    const shellIndices = this.dome.getIndices()!, entranceCut: number[] = [];
    for (let i = 0; i < shellIndices.length; i += 3) {
      const points = [shellIndices[i], shellIndices[i + 1], shellIndices[i + 2]];
      const x = points.reduce((sum, index) => sum + shellPositions[index * 3], 0) / 3;
      const y = points.reduce((sum, index) => sum + shellPositions[index * 3 + 1], 0) / 3 * .66;
      const z = points.reduce((sum, index) => sum + shellPositions[index * 3 + 2], 0) / 3;
      if (!(Math.abs(x) < 3.35 && y < 5.4 && z < -39)) entranceCut.push(...points);
    }
    this.dome.setIndices(entranceCut);
    // Separate back faces give the interior a clear outward view without showing equipment outside.
    const inner = MeshBuilder.CreateSphere('transparent-interior-dome', { diameter: 83.8, segments: 64, slice: .5, sideOrientation: Mesh.BACKSIDE }, scene);
    inner.position.copyFrom(this.dome.position); inner.scaling.y = .66;
    const insideGlass = material(scene, 'interior-glass', '#7eafbe'); insideGlass.alpha = .045;
    insideGlass.specularColor.set(.3, .6, .7); inner.material = insideGlass;
    const deck = MeshBuilder.CreateCylinder('habitat-deck', { diameter: 83.5, height: .35, tessellation: 128 }, scene);
    deck.position.set(0, -.04, 60); deck.material = metal; deck.receiveShadows = true;
    for (let x = -40; x <= 40; x += 2.5) this.box('deck-expansion-joint', [.016, .01, Math.sqrt(41 * 41 - x * x) * 2], [x, .14, 60], dark);
    for (let i = 0; i < 8; i++) {
      const theta = i * Math.PI / 8, points: Vector3[] = [];
      for (let j = 0; j <= 48; j++) {
        const a = j / 48 * Math.PI;
        points.push(new Vector3(Math.cos(a) * 41.8 * Math.cos(theta), .2 + Math.sin(a) * 27.6, 60 + Math.cos(a) * 41.8 * Math.sin(theta)));
      }
      this.tube('dome-structural-rib', points, .07, pale);
    }
    for (const radius of [40, 28, 12]) {
      const lightMat = this.lightMaterial(`floor-light-${radius}`);
      const ring = MeshBuilder.CreateTorus('habitat-light-ring', { diameter: radius * 2, thickness: .038, tessellation: 128 }, scene);
      ring.position.set(0, .17, 60); ring.material = lightMat;
    }
    for (const x of [-3.3, 3.3]) this.box('airlock-pier', [.65, 5.3, 4.7], [x, 2.6, 18.8], pale);
    this.box('airlock-lintel', [7.2, .5, 4.7], [0, 5.15, 18.8], pale);
    this.label('O U T P O S T   0 7', new Vector3(0, 4.25, 16.4), 4.7, .55);
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
        }
      } else if (ex.id === 'pushup') {
        this.box('exercise-mat', [3, .04, 1.7], [x, .25, z], metal);
        for (const dx of [-.55, .55]) this.tube('pushup-handle', [new Vector3(x + dx, .25, z), new Vector3(x + dx, .48, z), new Vector3(x + dx, .48, z + .5), new Vector3(x + dx, .25, z + .5)], .045, pale);
      } else {
        for (const dx of [-1.7, 1.7]) {
          this.box('squat-support', [.14, 2.5, .14], [x + dx, 1.45, z + 1.5], metal);
          this.box('squat-rack-foot', [.8, .12, 1.6], [x + dx, .24, z + 1.5], pale);
        }
        this.box('barbell', [4.5, .065, .065], [x, 1.65, z + 1.5], pale);
        for (const dx of [-1.9, 1.9]) for (let p = 0; p < 3; p++) {
          const plate = MeshBuilder.CreateCylinder('barbell-plate', { diameter: .68 - p * .1, height: .10, tessellation: 40 }, scene);
          plate.position.set(x + dx + Math.sign(dx) * p * .11, 1.65, z + 1.5); plate.rotation.z = Math.PI / 2; plate.material = dark;
        }
      }
      const light = new PointLight(`station-${ex.id}`, new Vector3(x, 5, z), scene); light.diffuse = new Color3(.6, .85, 1); light.range = 23; light.intensity = 0; this.lights.push(light);
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
    for (const side of [-1, 1]) { const fin = this.box('robot-fin', [.25, .045, .5], [side * .58, -.1, .05], metal); fin.parent = this.robot; fin.rotation.z = side * .2; }
    const route = material(scene, 'interior-guidance', '#8ce4e3', .8);
    for (let i = 0; i < 18; i++) { const arrow = this.box('station-navigation', [.1, .014, .35], [0, .25, 0], route); arrow.isVisible = false; this.arrows.push(arrow); }
  }
  private lightMaterial(name: string) { const m = material(this.scene, name, '#85cfd7'); this.illuminants.push(m); return m; }
  private box(name: string, size: [number, number, number], position: [number, number, number], mat: StandardMaterial) {
    const mesh = MeshBuilder.CreateBox(name, { width: size[0], height: size[1], depth: size[2] }, this.scene); mesh.position.set(...position); mesh.material = mat; mesh.receiveShadows = true; return mesh;
  }
  private tube(name: string, points: Vector3[], radius: number, mat: StandardMaterial) { const m = MeshBuilder.CreateTube(name, { path: points, radius, tessellation: 12 }, this.scene); m.material = mat; return m; }
  private label(text: string, at: Vector3, width: number, height: number) {
    const texture = new DynamicTexture(text, { width: 1024, height: 128 }, this.scene, false); texture.hasAlpha = true;
    texture.drawText(text, null, 82, '38px monospace', '#afcdd1', 'transparent', true);
    const m = material(this.scene, text, '#ffffff', .35); m.diffuseTexture = texture; m.opacityTexture = texture; m.backFaceCulling = false;
    const panel = MeshBuilder.CreatePlane(text, { width, height }, this.scene); panel.position.copyFrom(at); panel.material = m;
  }
  update(time: number, power: number, robotProgress: number, player: Vector3, target: ExerciseId | null, reduced: boolean) {
    this.illuminants.forEach((m, i) => m.emissiveColor.set(.33 * smooth(power * 3 - i * .17), .75 * smooth(power * 3 - i * .17), .83 * smooth(power * 3 - i * .17)));
    this.lights.forEach((light, i) => { light.intensity = 1.2 * smooth(power * 2 - i * .3); });
    this.doors.forEach((door, i) => { door.position.x = (i === 0 ? -1 : 1) * (.6 + smooth(robotProgress * 4) * .85); });
    this.robotEye.emissiveColor.set(.3 * smooth(robotProgress * 3), 1.2 * smooth(robotProgress * 3), 1.3 * smooth(robotProgress * 3));
    this.robot.position.copyFrom(Vector3.Lerp(new Vector3(-26, 1.2, 40), new Vector3(-1.2, 1.75, 36), smooth((robotProgress - .2) / .8)));
    if (robotProgress > .1 && !reduced) this.robot.position.y += Math.sin(time * 1.7) * .055;
    this.robot.rotation.y = Math.atan2(this.robot.position.x - player.x, this.robot.position.z - player.z);
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

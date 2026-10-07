import { Scene } from '@babylonjs/core/scene';
import { Node } from '@babylonjs/core/node';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { material } from './Environment';

function ellipsoid(scene: Scene, name: string, parent: TransformNode, size: [number, number, number], at: [number, number, number], mat: StandardMaterial) {
  const mesh = MeshBuilder.CreateSphere(name, { diameter: 1, segments: 20 }, scene);
  mesh.parent = parent; mesh.scaling.set(...size); mesh.position.set(...at); mesh.material = mat; return mesh;
}
function segment(scene: Scene, name: string, parent: TransformNode, from: Vector3, to: Vector3, radius: number, mat: StandardMaterial) {
  const mesh = MeshBuilder.CreateTube(name, { path: [from, to], radius, tessellation: 16, cap: 3 }, scene);
  mesh.parent = parent; mesh.material = mat; return mesh;
}

export function createHands(scene: Scene, camera: Node) {
  const root = new TransformNode('human-first-person-arms', scene); root.parent = camera;
  const skin = material(scene, 'skin-warm-neutral', '#b58569'); skin.specularColor.set(.09, .065, .05); skin.specularPower = 18;
  const nail = material(scene, 'fingernail', '#c9a18b'); nail.specularPower = 70;
  const suit = material(scene, 'woven-suit', '#394e5b'); const cuff = material(scene, 'suit-cuff', '#c6cece');
  const glow = material(scene, 'wrist-interface', '#7ad9df', .8);
  const fingers: TransformNode[] = [];
  for (const side of [-1, 1]) {
    const hand = new TransformNode(`hand-${side}`, scene); hand.parent = root;
    hand.position.set(side * .27, -.33, .58); hand.rotation.set(.14, -side * .2, side * .08);
    segment(scene, 'forearm-sleeve', hand, new Vector3(side * .075, -.16, -.43), new Vector3(0, 0, -.09), .06, suit);
    ellipsoid(scene, 'wrist', hand, [.09, .055, .11], [0, 0, -.045], skin);
    const cuffRing = MeshBuilder.CreateTorus('pressure-cuff', { diameter: .114, thickness: .019, tessellation: 32 }, scene);
    cuffRing.parent = hand; cuffRing.rotation.x = Math.PI / 2; cuffRing.position.z = -.09; cuffRing.material = cuff;
    ellipsoid(scene, 'palm', hand, [.117, .047, .145], [0, 0, .042], skin);
    ellipsoid(scene, 'thenar', hand, [.047, .049, .077], [-side * .041, -.009, .005], skin);
    // Four fingers with individual knuckles, phalanges and nails; thumb has its own opposed axis.
    const lengths = [.124, .139, .13, .102];
    for (let i = 0; i < 4; i++) {
      const pivot = new TransformNode('finger-root', scene); pivot.parent = hand;
      pivot.position.set((i - 1.5) * .027, 0, .092 - Math.abs(i - 1.3) * .004);
      pivot.rotation.y = (i - 1.5) * .05; fingers.push(pivot);
      const radius = i === 3 ? .0105 : .0125, length = lengths[i];
      const points = [new Vector3(0, 0, 0), new Vector3(0, -.005, length * .43), new Vector3(0, -.017, length * .75), new Vector3(0, -.03, length)];
      for (let j = 0; j < 3; j++) {
        segment(scene, 'finger-phalanx', pivot, points[j], points[j + 1], radius * (1 - j * .12), skin);
        ellipsoid(scene, 'knuckle', pivot, [radius * 2, radius * 2, radius * 2.1], [points[j].x, points[j].y, points[j].z], skin);
      }
      ellipsoid(scene, 'fingertip', pivot, [radius * 1.5, radius * 1.6, radius * 1.8], [0, -.03, length], skin);
      ellipsoid(scene, 'nail', pivot, [radius * 1.2, .003, .020], [0, -.018, length - .008], nail);
    }
    const thumb = new TransformNode('opposed-thumb', scene); thumb.parent = hand; thumb.position.set(-side * .048, -.006, .018); thumb.rotation.y = -side * .75;
    segment(scene, 'thumb-proximal', thumb, Vector3.Zero(), new Vector3(0, -.012, .046), .018, skin);
    segment(scene, 'thumb-distal', thumb, new Vector3(0, -.012, .046), new Vector3(0, -.018, .085), .014, skin);
    ellipsoid(scene, 'thumb-tip', thumb, [.028, .024, .027], [0, -.018, .085], skin);
    ellipsoid(scene, 'thumbnail', thumb, [.018, .003, .02], [0, -.005, .079], nail);
    const screen = MeshBuilder.CreateBox('wrist-display', { width: .049, height: .006, depth: .049 }, scene);
    screen.parent = hand; screen.position.set(0, .051, -.14); screen.material = glow;
  }
  return { root, fingers };
}

export function createAvatar(scene: Scene) {
  const root = new TransformNode('arrival-avatar', scene);
  const suit = material(scene, 'expedition-suit', '#a9b6b5');
  const joint = material(scene, 'suit-articulation', '#263942');
  const visor = material(scene, 'smoked-visor', '#122b37'); visor.specularColor.set(.7, .8, .9); visor.specularPower = 120;
  const stripe = material(scene, 'suit-seams', '#8bdce4', .45);
  ellipsoid(scene, 'torso', root, [.47, .61, .27], [0, 1.12, 0], suit);
  ellipsoid(scene, 'pelvis', root, [.34, .25, .24], [0, .8, 0], joint);
  ellipsoid(scene, 'helmet', root, [.31, .34, .32], [0, 1.62, 0], suit);
  ellipsoid(scene, 'helmet-visor', root, [.285, .22, .20], [0, 1.635, .12], visor);
  const pack = MeshBuilder.CreateBox('life-support', { width: .29, height: .45, depth: .19 }, scene);
  pack.parent = root; pack.position.set(0, 1.15, -.19); pack.material = joint;
  const legs: TransformNode[] = [], arms: TransformNode[] = [];
  for (const side of [-1, 1]) {
    const leg = new TransformNode('avatar-leg', scene); leg.parent = root; leg.position.set(side * .105, .8, 0); legs.push(leg);
    segment(scene, 'thigh', leg, Vector3.Zero(), new Vector3(0, -.36, .01), .091, suit);
    ellipsoid(scene, 'knee', leg, [.14, .13, .15], [0, -.37, .025], joint);
    segment(scene, 'shin', leg, new Vector3(0, -.4, .02), new Vector3(0, -.67, 0), .068, suit);
    ellipsoid(scene, 'boot', leg, [.155, .15, .27], [0, -.7, .07], joint);
    const arm = new TransformNode('avatar-arm', scene); arm.parent = root; arm.position.set(side * .25, 1.34, 0); arms.push(arm);
    ellipsoid(scene, 'shoulder', arm, [.21, .21, .23], [0, 0, 0], suit);
    segment(scene, 'upper-arm', arm, new Vector3(0, -.04, 0), new Vector3(side * .025, -.26, 0), .065, suit);
    ellipsoid(scene, 'elbow', arm, [.12, .12, .12], [side * .025, -.29, .015], joint);
    segment(scene, 'lower-arm', arm, new Vector3(side * .025, -.3, .015), new Vector3(side * .03, -.49, .075), .05, suit);
    ellipsoid(scene, 'gloved-hand', arm, [.09, .14, .065], [side * .03, -.56, .075], joint);
    const seam = MeshBuilder.CreateBox('suit-stripe', { width: .022, height: .35, depth: .012 }, scene);
    seam.parent = root; seam.position.set(side * .15, 1.17, .138); seam.material = stripe;
  }
  return { root, legs, arms };
}

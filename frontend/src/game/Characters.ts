import { Scene } from '@babylonjs/core/scene';
import { Node } from '@babylonjs/core/node';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
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

// Smooth cross-sections make connected cloth volumes rather than separate mannequin rods.
function tailored(scene: Scene, name: string, parent: TransformNode, rings: Array<[number, number, number, number, number]>, mat: StandardMaterial) {
  const positions: number[] = [], indices: number[] = [], normals: number[] = [], uvs: number[] = [], sides = 32;
  for (const [i, [y, x, z, width, depth]] of rings.entries()) for (let j = 0; j < sides; j++) {
    const angle = j / sides * Math.PI * 2;
    positions.push(x + Math.cos(angle) * width, y, z + Math.sin(angle) * depth);
    uvs.push(j / sides, i / (rings.length - 1));
  }
  for (let i = 0; i < rings.length - 1; i++) for (let j = 0; j < sides; j++) {
    const a = i * sides + j, b = i * sides + (j + 1) % sides;
    indices.push(a, b, a + sides, b, b + sides, a + sides);
  }
  for (const end of [0, rings.length - 1]) {
    const [y, x, z] = rings[end], center = positions.length / 3; positions.push(x, y, z); uvs.push(.5, .5);
    for (let j = 0; j < sides; j++) indices.push(center, end * sides + (end === 0 ? (j + 1) % sides : j), end * sides + (end === 0 ? j : (j + 1) % sides));
  }
  VertexData.ComputeNormals(positions, indices, normals);
  const data = new VertexData(); data.positions = positions; data.indices = indices; data.normals = normals; data.uvs = uvs;
  const mesh = new Mesh(name, scene); data.applyToMesh(mesh); mesh.parent = parent; mesh.material = mat; return mesh;
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
  const suit = material(scene, 'expedition-suit', '#b2aa95');
  const fabric = new DynamicTexture('woven-expedition-fabric', { width: 128, height: 128 }, scene, false);
  const weave = fabric.getContext(); weave.fillStyle = '#dedcd7'; weave.fillRect(0, 0, 128, 128);
  for (let y = 0; y < 128; y += 4) for (let x = 0; x < 128; x += 4) {
    weave.fillStyle = ((x + y) / 4) % 2 ? '#b9b6ae' : '#efede8'; weave.fillRect(x, y, 1, 3);
  }
  fabric.update(); fabric.uScale = 1; fabric.vScale = 2; suit.diffuseTexture = fabric; suit.specularColor.set(.025, .024, .022);
  const joint = material(scene, 'suit-articulation', '#48525a');
  const visor = material(scene, 'clear-pressure-visor', '#d2eeef'); visor.alpha = .075; visor.specularColor.set(.7, .8, .9); visor.specularPower = 120;
  const skin = material(scene, 'traveller-skin', '#bb8e73'); skin.specularColor.set(.065, .048, .038);
  skin.emissiveColor.set(.025, .016, .012);
  const hair = material(scene, 'traveller-hair', '#302721');
  const lips = material(scene, 'natural-lip', '#926758');
  const white = material(scene, 'eye-white', '#c7c2b3');
  const iris = material(scene, 'eye-iris', '#443a2a');
  const pupil = material(scene, 'eye-pupil', '#0d1417');
  const stripe = material(scene, 'suit-seams', '#8bdce4', .45);
  tailored(scene, 'tailored-flight-suit', root, [
    [.70, 0, 0, .135, .11], [.77, 0, 0, .18, .125], [.86, 0, 0, .17, .12],
    [.95, 0, 0, .155, .13], [1.06, 0, 0, .177, .14], [1.19, 0, 0, .217, .142],
    [1.30, 0, 0, .23, .12], [1.35, 0, 0, .195, .104], [1.395, 0, 0, .116, .078],
    [1.435, 0, 0, .067, .066],
  ], suit);
  // A readable human face inside a clear pressure helmet, rather than an opaque robot visor.
  ellipsoid(scene, 'neck', root, [.105, .16, .1], [0, 1.43, .015], skin);
  // Sculpt the brow, eye sockets, nose and cheeks into one smooth skin surface.
  const head = MeshBuilder.CreateSphere('sculpted-human-head', { diameter: 1, segments: 64, updatable: true }, scene);
  head.parent = root; head.position.set(0, 1.64, .025); head.material = skin;
  const headPositions = head.getVerticesData(VertexBuffer.PositionKind)!;
  const gaussian = (x: number, y: number, cx: number, cy: number, sx: number, sy: number) => Math.exp(-((x - cx) ** 2 / sx ** 2 + (y - cy) ** 2 / sy ** 2));
  for (let i = 0; i < headPositions.length; i += 3) {
    let x = headPositions[i] * .222; const y = headPositions[i + 1] * .292; let z = headPositions[i + 2] * .219;
    x *= 1 - Math.max(0, -y - .04) * 2;
    if (z > 0) {
      const forward = Math.min(1, z / .05);
      const nose = .028 * gaussian(x, y, 0, -.027, .017, .025) + .011 * gaussian(x, y, 0, .009, .014, .035);
      const sockets = -.009 * (gaussian(x, y, -.043, .021, .026, .016) + gaussian(x, y, .043, .021, .026, .016));
      const brow = .006 * (gaussian(x, y, -.04, .047, .038, .011) + gaussian(x, y, .04, .047, .038, .011));
      const cheeks = .006 * (gaussian(x, y, -.06, -.022, .026, .026) + gaussian(x, y, .06, -.022, .026, .026));
      z += forward * (nose + sockets + brow + cheeks);
    }
    headPositions[i] = x; headPositions[i + 1] = y; headPositions[i + 2] = z;
  }
  const headNormals: number[] = []; VertexData.ComputeNormals(headPositions, head.getIndices()!, headNormals);
  head.updateVerticesData(VertexBuffer.PositionKind, headPositions); head.updateVerticesData(VertexBuffer.NormalKind, headNormals);
  ellipsoid(scene, 'upper-lip', root, [.051, .005, .005], [0, 1.582, .126], lips);
  ellipsoid(scene, 'lower-lip', root, [.048, .005, .006], [0, 1.574, .124], lips);
  for (const side of [-1, 1]) {
    ellipsoid(scene, 'ear', root, [.033, .065, .035], [side * .113, 1.637, .019], skin);
    ellipsoid(scene, 'human-eye', root, [.040, .012, .008], [side * .043, 1.66, .117], white);
    ellipsoid(scene, 'iris', root, [.011, .011, .004], [side * .043, 1.66, .122], iris);
    ellipsoid(scene, 'pupil', root, [.005, .006, .002], [side * .043, 1.66, .125], pupil);
    segment(scene, 'eyebrow', root, new Vector3(side * .023, 1.685, .127), new Vector3(side * .07, 1.68, .108), .0025, hair);
  }
  const crop = MeshBuilder.CreateSphere('cropped-hair', { diameter: 1, segments: 32, slice: .39 }, scene);
  crop.parent = root; crop.scaling.set(.229, .29, .228); crop.position.set(0, 1.645, .014); crop.material = hair;
  ellipsoid(scene, 'helmet-clear-bubble', root, [.355, .395, .355], [0, 1.64, .03], visor);
  const collar = MeshBuilder.CreateTorus('helmet-collar', { diameter: .27, thickness: .033, tessellation: 48 }, scene);
  collar.parent = root; collar.position.set(0, 1.46, .022); collar.material = suit;
  const pack = MeshBuilder.CreateBox('life-support', { width: .29, height: .45, depth: .19 }, scene);
  pack.parent = root; pack.position.set(0, 1.15, -.19); pack.material = joint;
  const legs: TransformNode[] = [], knees: TransformNode[] = [], arms: TransformNode[] = [];
  for (const side of [-1, 1]) {
    const leg = new TransformNode('avatar-leg', scene); leg.parent = root; leg.position.set(side * .105, .8, 0); legs.push(leg);
    tailored(scene, 'cloth-trouser-thigh', leg, [[-.38, 0, .025, .067, .074], [-.30, 0, .021, .076, .082], [-.15, 0, .01, .091, .092], [.035, 0, 0, .096, .102]], suit);
    ellipsoid(scene, 'covered-knee', leg, [.135, .14, .14], [0, -.37, .025], suit);
    const knee = new TransformNode('bending-knee', scene); knee.parent = leg; knee.position.set(0, -.37, .025); knees.push(knee);
    tailored(scene, 'cloth-trouser-calf', knee, [[-.32, 0, -.025, .052, .054], [-.23, 0, -.017, .067, .067], [-.11, 0, -.005, .076, .075], [.025, 0, 0, .066, .071]], suit);
    ellipsoid(scene, 'boot', knee, [.155, .15, .27], [0, -.33, .045], joint);
    const arm = new TransformNode('avatar-arm', scene); arm.parent = root; arm.position.set(side * .224, 1.32, 0); arms.push(arm);
    tailored(scene, 'continuous-cloth-sleeve', arm, [
      [-.49, side * .03, .055, .04, .041], [-.40, side * .035, .04, .051, .053],
      [-.29, side * .029, .02, .057, .060], [-.18, side * .024, .008, .067, .073],
      [-.07, side * .012, 0, .075, .086], [.025, -side * .009, 0, .070, .085],
    ], suit);
    ellipsoid(scene, 'hand-palm', arm, [.071, .085, .036], [side * .03, -.55, .075], skin);
    for (let finger = 0; finger < 4; finger++) segment(scene, 'relaxed-finger', arm, new Vector3(side * .03 + (finger - 1.5) * .017, -.58, .075), new Vector3(side * .03 + (finger - 1.5) * .017, -.637 + Math.abs(finger - 1) * .008, .09), .008, skin);
    segment(scene, 'hand-thumb', arm, new Vector3(side * -.006, -.535, .075), new Vector3(side * -.014, -.586, .103), .010, skin);
    segment(scene, 'stitched-chest-seam', root, new Vector3(side * .127, 1.09, .112), new Vector3(side * .148, 1.285, .096), .003, joint);
  }
  const badge = MeshBuilder.CreateBox('expedition-cloth-badge', { width: .06, height: .045, depth: .003 }, scene);
  badge.parent = root; badge.position.set(-.095, 1.265, .115); badge.material = stripe;
  return { root, legs, knees, arms };
}

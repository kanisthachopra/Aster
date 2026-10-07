import { Scene } from '@babylonjs/core/scene';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { ShaderMaterial } from '@babylonjs/core/Materials/shaderMaterial';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Matrix, Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { terrainHeight } from './terrain';
import '@babylonjs/core/Meshes/thinInstanceMesh';

export const material = (scene: Scene, name: string, color: string, glow = 0) => {
  const m = new StandardMaterial(name, scene);
  m.diffuseColor = Color3.FromHexString(color); m.emissiveColor = m.diffuseColor.scale(glow);
  m.specularColor.set(.06, .075, .08); return m;
};
const vertex = `precision highp float;
attribute vec3 position; attribute vec3 normal; attribute vec2 uv;
uniform mat4 world; uniform mat4 worldViewProjection;
varying vec3 vPosition; varying vec3 vNormal; varying vec2 vUV;
void main(){vPosition=(world*vec4(position,1.)).xyz;vNormal=normalize(mat3(world)*normal);vUV=uv;gl_Position=worldViewProjection*vec4(position,1.);}`;
const noiseGL = `
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float a=.5,v=0.;for(int i=0;i<5;i++){v+=a*noise(p);p=p*2.03+17.3;a*=.5;}return v;}`;

export class Environment {
  creatures: Array<{ root: TransformNode; legs: TransformNode[]; x: number; z: number; offset: number }> = [];
  private planet: Mesh;
  private stars: ShaderMaterial;
  constructor(scene: Scene) {
    let seed = 9173;
    const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    const surface = material(scene, 'mineral-regolith', '#817d75');
    surface.specularColor.set(.025, .026, .027);
    const texture = new DynamicTexture('mineral-grain', { width: 1024, height: 1024 }, scene, false);
    const ctx = texture.getContext(), pixels = new ImageData(1024, 1024);
    for (let y = 0; y < 1024; y++) for (let x = 0; x < 1024; x++) {
      const i = (y * 1024 + x) * 4;
      const fine = random() * 33, wave = Math.sin(x * .08 + Math.sin(y * .04) * 4) * 5;
      const value = 104 + fine + wave;
      pixels.data[i] = value + 3; pixels.data[i + 1] = value; pixels.data[i + 2] = value - 6; pixels.data[i + 3] = 255;
    }
    ctx.putImageData(pixels, 0, 0); texture.update(); texture.uScale = texture.vScale = 100;
    texture.wrapU = texture.wrapV = 1;
    surface.diffuseTexture = texture;
    const bump = new DynamicTexture('regolith-normal', { width: 1024, height: 1024 }, scene, true);
    const normalPixels = new ImageData(1024, 1024);
    for (let y = 0; y < 1024; y++) for (let x = 0; x < 1024; x++) {
      const i = (y * 1024 + x) * 4;
      const dx = (pixels.data[(y * 1024 + (x + 1) % 1024) * 4] - pixels.data[i]) / 255;
      const dy = (pixels.data[(((y + 1) % 1024) * 1024 + x) * 4] - pixels.data[i]) / 255;
      const n = new Vector3(-dx, -dy, 1).normalize();
      normalPixels.data.set([(n.x + 1) * 127.5, (n.y + 1) * 127.5, (n.z + 1) * 127.5, 255], i);
    }
    bump.getContext().putImageData(normalPixels, 0, 0); bump.update();
    bump.wrapU = bump.wrapV = 1; bump.uScale = bump.vScale = 100; bump.level = .5; surface.bumpTexture = bump;
    const ground = MeshBuilder.CreateGround('explorable-regolith', { width: 760, height: 760, subdivisions: 250, updatable: true }, scene);
    const positions = ground.getVerticesData(VertexBuffer.PositionKind)!;
    for (let i = 0; i < positions.length; i += 3) positions[i + 1] = terrainHeight(positions[i], positions[i + 2]);
    ground.updateVerticesData(VertexBuffer.PositionKind, positions);
    const normals: number[] = []; VertexData.ComputeNormals(positions, ground.getIndices()!, normals);
    ground.updateVerticesData(VertexBuffer.NormalKind, normals); ground.material = surface; ground.receiveShadows = true;
    const rockMat = material(scene, 'weathered-basalt', '#686762');
    rockMat.diffuseTexture = texture; rockMat.bumpTexture = bump;
    const rock = MeshBuilder.CreateIcoSphere('weathered-boulders', { radius: 1, subdivisions: 2, flat: false }, scene);
    const rp = rock.getVerticesData(VertexBuffer.PositionKind)!;
    for (let i = 0; i < rp.length; i += 3) {
      const multiplier = 1 + .2 * Math.sin(rp[i] * 11 + rp[i + 1] * 7) * Math.cos(rp[i + 2] * 9);
      rp[i] *= multiplier; rp[i + 1] *= multiplier; rp[i + 2] *= multiplier;
    }
    rock.updateVerticesData(VertexBuffer.PositionKind, rp);
    const rn: number[] = []; VertexData.ComputeNormals(rp, rock.getIndices()!, rn); rock.updateVerticesData(VertexBuffer.NormalKind, rn);
    rock.material = rockMat; rock.receiveShadows = true;
    const matrices: number[] = [];
    for (let i = 0; i < 1100; i++) {
      const x = (random() - .5) * 470, z = (random() - .5) * 460;
      if (Math.hypot(x, z - 60) < 48 || Math.hypot(x + 94, z + 76) < 4) continue;
      const scale = .13 + Math.pow(random(), 3) * 5;
      matrices.push(...Matrix.Compose(new Vector3(scale * 1.4, scale * .6, scale), Quaternion.FromEulerAngles(random(), random() * 6, random() * .3), new Vector3(x, terrainHeight(x, z) - .1, z)).asArray());
    }
    rock.thinInstanceSetBuffer('matrix', new Float32Array(matrices), 16);

    const sky = MeshBuilder.CreateSphere('deep-space', { diameter: 1600, segments: 32, sideOrientation: Mesh.BACKSIDE }, scene);
    this.stars = new ShaderMaterial('starfield-and-dust', scene, { vertexSource: vertex, fragmentSource: `precision highp float; varying vec2 vUV; uniform float time; ${noiseGL}
      void main(){vec2 uv=vUV*vec2(900.,450.);vec2 cell=floor(uv);float h=hash(cell);float d=length(fract(uv)-.5);float star=(1.-smoothstep(.04,.34,d))*step(.988,h);float bright=.8+.2*sin(time*.28+h*70.);float band=exp(-pow((vUV.y-.46+.1*sin(vUV.x*6.28))*12.,2.));float dust=fbm(vUV*vec2(18.,9.))*band;
      vec3 col=vec3(.003,.007,.014)+vec3(.04,.055,.08)*dust;col+=mix(vec3(.63,.76,1.),vec3(1.,.89,.72),hash(cell+5.))*star*bright*1.8;gl_FragColor=vec4(col,1.);}` }, { attributes: ['position', 'normal', 'uv'], uniforms: ['world', 'worldViewProjection', 'time'] });
    sky.material = this.stars; sky.infiniteDistance = true; sky.applyFog = false; this.stars.backFaceCulling = true;
    // Actual points keep small stars crisp at desktop resolutions rather than losing them to shader aliasing.
    const starPoints = new Mesh('distant-star-points', scene);
    const starPositions: number[] = [], starColors: number[] = [], starIndices: number[] = [];
    for (let i = 0; i < 1700; i++) {
      const azimuth = random() * Math.PI * 2, altitude = .02 + random() * 1.5;
      starPositions.push(Math.cos(azimuth) * Math.cos(altitude) * 740, Math.sin(altitude) * 740, Math.sin(azimuth) * Math.cos(altitude) * 740);
      const brightness = .2 + Math.pow(random(), 3) * .8;
      starColors.push(brightness * .83, brightness * .91, brightness, 1); starIndices.push(i);
    }
    const starData = new VertexData(); starData.positions = starPositions; starData.colors = starColors; starData.indices = starIndices; starData.applyToMesh(starPoints);
    const starMat = material(scene, 'starlight-points', '#ffffff', 1); starMat.disableLighting = true; starMat.pointsCloud = true; starMat.pointSize = 1.5;
    starPoints.material = starMat; starPoints.infiniteDistance = true; starPoints.applyFog = false; starPoints.isPickable = false;
    this.planet = MeshBuilder.CreateSphere('gas-giant', { diameter: 113, segments: 96 }, scene);
    this.planet.position.set(190, 160, 440); this.planet.rotation.z = -.2;
    const planetMaterial = new ShaderMaterial('gas-giant-atmosphere', scene, { vertexSource: vertex, fragmentSource: `precision highp float; varying vec3 vPosition; varying vec3 vNormal; varying vec2 vUV; uniform vec3 cameraPosition; ${noiseGL}
      void main(){vec3 n=normalize(vNormal);vec3 light=normalize(vec3(-.8,.3,-.5));float diffuse=max(dot(n,light),0.);float swirls=fbm(vUV*vec2(22.,38.));float bands=sin(vUV.y*150.+swirls*9.);vec3 col=mix(vec3(.12,.22,.28),vec3(.63,.73,.74),bands*.35+swirls*.45+.25);float rim=pow(1.-max(dot(n,normalize(cameraPosition-vPosition)),0.),4.);col*=.055+diffuse*.9;col+=vec3(.09,.23,.34)*rim*sqrt(diffuse+.05);gl_FragColor=vec4(col,1.);}` }, { attributes: ['position', 'normal', 'uv'], uniforms: ['world', 'worldViewProjection', 'cameraPosition'] });
    this.planet.material = planetMaterial; this.planet.applyFog = false;
    scene.onBeforeRenderObservable.add(() => planetMaterial.setVector3('cameraPosition', scene.activeCamera!.position));
    const ringTex = new DynamicTexture('ring-bands', { width: 512, height: 64 }, scene, false);
    const rc = ringTex.getContext();
    for (let x = 0; x < 512; x++) { const shade = 100 + random() * 90; rc.fillStyle = `rgb(${shade},${shade},${shade})`; rc.fillRect(x, 0, 1, 64); }
    ringTex.update();
    for (const [radius, thickness, alpha] of [[92, 11, .42], [108, 5, .27], [82, 4, .2]]) {
      const ring = MeshBuilder.CreateTorus('planetary-ring', { diameter: radius * 2, thickness, tessellation: 192 }, scene);
      ring.position.copyFrom(this.planet.position); ring.rotation.set(.05, 0, -.28); ring.scaling.y = .005;
      const m = material(scene, `ring-${radius}`, '#a3aaa3', .35); m.diffuseTexture = ringTex; m.backFaceCulling = false;
      m.alpha = alpha; ring.material = m; ring.applyFog = false;
    }
    const moon = MeshBuilder.CreateIcoSphere('companion-moon', { radius: 11, subdivisions: 5 }, scene);
    moon.position.set(-200, 135, 490); moon.material = surface; moon.applyFog = false;

    const creatureShell = material(scene, 'silver-sandcrawler', '#718186');
    const creatureEye = material(scene, 'sandcrawler-eye', '#e6c79a', .7);
    for (let i = 0; i < 9; i++) {
      const root = new TransformNode('sandcrawler', scene);
      const body = MeshBuilder.CreateSphere('sandcrawler-shell', { diameter: .65, segments: 12 }, scene);
      body.scaling.set(1, .4, 1.3); body.parent = root; body.position.y = .24; body.material = creatureShell;
      const legs: TransformNode[] = [];
      for (const side of [-1, 1]) for (let j = 0; j < 3; j++) {
        const pivot = new TransformNode('leg-pivot', scene); pivot.parent = root; pivot.position.set(side * .22, .2, (j - 1) * .2);
        const leg = MeshBuilder.CreateTube('sandcrawler-leg', { path: [Vector3.Zero(), new Vector3(side * .3, .12, .08), new Vector3(side * .4, -.18, .17)], radius: .025, tessellation: 6 }, scene);
        leg.parent = pivot; leg.material = creatureShell; legs.push(pivot);
      }
      for (const dx of [-.12, .12]) {
        const eye = MeshBuilder.CreateSphere('sandcrawler-eye', { diameter: .05, segments: 6 }, scene);
        eye.parent = root; eye.position.set(dx, .32, .39); eye.material = creatureEye;
      }
      const x = -90 + i * 18, z = -54 + Math.sin(i * 2) * 30;
      this.creatures.push({ root, legs, x, z, offset: i * 1.9 });
    }
  }
  update(time: number, reduced: boolean) {
    this.stars.setFloat('time', reduced ? 0 : time);
    if (!reduced) this.planet.rotation.y = time * .001;
    for (const creature of this.creatures) {
      const t = time * .12 + creature.offset;
      const x = creature.x + Math.sin(t) * 4, z = creature.z + Math.cos(t * .8) * 3;
      creature.root.position.set(x, terrainHeight(x, z) + .02, z);
      creature.root.rotation.y = Math.atan2(Math.cos(t) * 4, -Math.sin(t * .8) * 2.4);
      creature.legs.forEach((leg, i) => { leg.rotation.y = Math.sin(time * 7 + i * 1.6) * .25; });
    }
  }
}

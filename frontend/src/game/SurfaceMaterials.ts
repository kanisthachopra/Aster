import { Scene } from '@babylonjs/core/scene';
import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial';
import { RawCubeTexture } from '@babylonjs/core/Materials/Textures/rawCubeTexture';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { SphericalPolynomial } from '@babylonjs/core/Maths/sphericalPolynomial';

/** Original procedural environment lighting. No remote textures or unlicensed image assets. */
export function installEnvironmentLighting(scene: Scene) {
  const size = 64, faces: Uint8Array[] = [];
  for (let face = 0; face < 6; face++) {
    const data = new Uint8Array(size * size * 4);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const u = x / (size - 1) * 2 - 1, v = y / (size - 1) * 2 - 1;
      const directions = [new Vector3(1, -v, -u), new Vector3(-1, -v, u), new Vector3(u, 1, v), new Vector3(u, -1, -v), new Vector3(u, -v, 1), new Vector3(-u, -v, -1)];
      const d = directions[face].normalize(), horizon = Math.exp(-Math.abs(d.y) * 5), sun = Math.pow(Math.max(0, Vector3.Dot(d, new Vector3(-.7, .5, -.5).normalize())), 70);
      const rgb = d.y > 0 ? [.026 + horizon * .12 + sun * .8, .055 + horizon * .10 + sun * .63, .088 + horizon * .08 + sun * .4] : [.12, .088, .061];
      const i = (y * size + x) * 4; data.set([...rgb.map(c => Math.min(255, Math.round(c * 255))), 255], i);
    }
    faces.push(data);
  }
  const env = new RawCubeTexture(scene, faces, size, 5, 0, true, false, 3);
  env.name = 'original-outpost-reflection-probe'; env.gammaSpace = false;
  const irradiance = new SphericalPolynomial();
  irradiance.xx.set(.12, .13, .15); irradiance.yy.set(.12, .13, .15); irradiance.zz.set(.12, .13, .15);
  env.sphericalPolynomial = irradiance; scene.environmentTexture = env; scene.environmentIntensity = .8;
}
export function surfaceMaterial(scene: Scene, name: string, color: string, roughness = .6, metallic = 0) {
  const mat = new PBRMaterial(name, scene); mat.albedoColor = Color3.FromHexString(color);
  mat.roughness = roughness; mat.metallic = metallic; mat.maxSimultaneousLights = 5;
  mat.usePhysicalLightFalloff = false; return mat;
}
export function applyScannedSurface(scene: Scene, mat: PBRMaterial, asset: 'rock_boulder_dry' | 'aerial_rocks_02', repeat: number) {
  const map = (name: string, gamma: boolean) => {
    const texture = new Texture(`/textures/${asset}-${name}.jpg`, scene);
    texture.uScale = texture.vScale = repeat; texture.gammaSpace = gamma; texture.anisotropicFilteringLevel = 8; return texture;
  };
  mat.albedoTexture = map('Diffuse', true); mat.bumpTexture = map('nor_gl', false); mat.bumpTexture.level = .85;
  mat.invertNormalMapX = false; mat.invertNormalMapY = true;
  mat.metallicTexture = map('arm', false); mat.useAmbientOcclusionFromMetallicTextureRed = true;
  mat.useRoughnessFromMetallicTextureGreen = true; mat.useRoughnessFromMetallicTextureAlpha = false;
  mat.useMetallnessFromMetallicTextureBlue = true;
}
export function deckTexture(scene: Scene) {
  const texture = new DynamicTexture('original-habitat-floor-panels', { width: 1024, height: 1024 }, scene, true);
  const ctx = texture.getContext(); ctx.fillStyle = '#a3aaa9'; ctx.fillRect(0, 0, 1024, 1024);
  for (let row = 0; row < 8; row++) for (let col = 0; col < 8; col++) {
    const x = col * 128, y = row * 128, n = ((col * 37 + row * 23) % 17);
    ctx.fillStyle = `rgb(${144 + n},${153 + n},${154 + n})`; ctx.fillRect(x + 2, y + 2, 124, 124);
    ctx.strokeStyle = '#5c6d70'; ctx.lineWidth = 1; ctx.strokeRect(x + 3, y + 3, 122, 122);
    ctx.fillStyle = '#697779'; for (const dx of [8, 119]) for (const dy of [8, 119]) { ctx.beginPath(); ctx.arc(x + dx, y + dy, 1.4, 0, Math.PI * 2); ctx.fill(); }
    for (let scratch = 0; scratch < 5; scratch++) { ctx.strokeStyle = '#abb4b2'; ctx.beginPath(); ctx.moveTo(x + 13 + scratch * 19, y + 80 - scratch * 7); ctx.lineTo(x + 29 + scratch * 15, y + 75 - scratch * 6); ctx.stroke(); }
  }
  texture.update(); texture.uScale = texture.vScale = 4; return texture;
}

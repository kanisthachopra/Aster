import { Scene } from '@babylonjs/core/scene';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { Matrix, Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { surfaceMaterial } from './SurfaceMaterials';
import { terrainHeight } from './terrain';
import { CollisionWorld } from './Collision';

/** The bundled CC0 asset is a single unskinned triangle mesh; a small reader avoids loading an entire model framework. */
export async function loadHeroBoulders(scene: Scene, collisions: CollisionWorld) {
  const [response, layoutResponse] = await Promise.all([
    fetch('/models/boulder/boulder-lod.bin', { signal: AbortSignal.timeout(10000) }),
    fetch('/models/boulder/boulder-lod.json', { signal: AbortSignal.timeout(10000) }),
  ]);
  if (!response.ok || !layoutResponse.ok) throw new Error('Boulder mesh unavailable');
  const buffer = await response.arrayBuffer(), layout = await layoutResponse.json() as Record<string, { offset: number; count: number }>;
  if (scene.isDisposed) return;
  const positions = new Float32Array(buffer, layout.positions.offset, layout.positions.count);
  const normals = new Float32Array(buffer, layout.normals.offset, layout.normals.count);
  const uvs = new Float32Array(buffer, layout.uvs.offset, layout.uvs.count);
  const indices = new Uint32Array(buffer, layout.indices.offset, layout.indices.count);
  // glTF is right-handed; the world is left-handed.
  for (let i = 2; i < positions.length; i += 3) { positions[i] *= -1; normals[i] *= -1; }
  for (let i = 0; i < indices.length; i += 3) { const t = indices[i]; indices[i] = indices[i + 2]; indices[i + 2] = t; }
  const data = new VertexData(); data.positions = positions; data.normals = normals; data.uvs = uvs; data.indices = indices;
  const mesh = new Mesh('scanned-geological-boulders', scene); data.applyToMesh(mesh); mesh.receiveShadows = true;
  const mat = surfaceMaterial(scene, 'scanned-boulder-pbr', '#c0aca0', 1);
  mat.albedoTexture = new Texture('/models/boulder/boulder_01_diff_1k.jpg', scene);
  mat.bumpTexture = new Texture('/models/boulder/boulder_01_nor_gl_1k.jpg', scene); mat.bumpTexture.gammaSpace = false;
  mat.invertNormalMapY = true; mat.metallicTexture = new Texture('/models/boulder/boulder_01_arm_1k.jpg', scene); mat.metallicTexture.gammaSpace = false;
  mat.useAmbientOcclusionFromMetallicTextureRed = true; mat.useRoughnessFromMetallicTextureGreen = true; mat.useRoughnessFromMetallicTextureAlpha = false; mat.useMetallnessFromMetallicTextureBlue = true; mesh.material = mat;
  const placements = [[-84, -65, 4.4], [-102, -48, 5], [-68, -78, 3.3], [-40, -30, 5.5], [8, -8, 4], [-15, 6, 3], [38, 20, 4.5], [-44, 41, 4.2], [48, -23, 5.1], [-57, -46, 4.7]];
  const matrices: number[] = [];
  for (const [i, [x, z, scale]] of placements.entries()) {
    const y = terrainHeight(x, z) - .05, yaw = i * 1.7;
    matrices.push(...Matrix.Compose(new Vector3(scale, scale, scale), Quaternion.FromEulerAngles(0, yaw, 0), new Vector3(x, y, z)).asArray());
    const centerX = -.112 * scale, centerZ = .033 * scale;
    collisions.add({ id: `scanned-rock-${i}`, kind: 'box', x: x + centerX * Math.cos(yaw) + centerZ * Math.sin(yaw), z: z - centerX * Math.sin(yaw) + centerZ * Math.cos(yaw), halfX: scale * .636, halfZ: scale * .916, yaw, bottom: y - .1, top: y + scale * .93 });
  }
  mesh.thinInstanceSetBuffer('matrix', new Float32Array(matrices), 16);
}

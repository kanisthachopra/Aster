export const HABITAT = { x: 0, z: 60, radius: 42 };
export const LANDING = { x: -94, z: -76 };
export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
export const smooth = (v: number) => { const t = clamp(v, 0, 1); return t * t * (3 - 2 * t); };
const hash = (x: number, z: number) => { const n = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return n - Math.floor(n); };
export function noise(x: number, z: number) {
  const ix = Math.floor(x), iz = Math.floor(z), fx = smooth(x - ix), fz = smooth(z - iz);
  const a = hash(ix, iz) * (1 - fx) + hash(ix + 1, iz) * fx;
  const b = hash(ix, iz + 1) * (1 - fx) + hash(ix + 1, iz + 1) * fx;
  return a * (1 - fz) + b * fz;
}
export function terrainHeight(x: number, z: number) {
  const r = Math.hypot(x, z - HABITAT.z);
  const habitatBlend = smooth((r - 45) / 20);
  const ridges = 19 * Math.exp(-((x + 57) ** 2 / 350 + (z + 20) ** 2 / 2100));
  const dunes = 6 * noise(x * .018, z * .018) + 2.5 * noise(x * .051, z * .051) + .4 * noise(x * .18, z * .18);
  const craterDistance = Math.hypot(x - 65, z + 50);
  const crater = 3 * Math.exp(-((craterDistance - 25) ** 2) / 30) - 2 * Math.exp(-(craterDistance ** 2) / 400);
  return -.12 + habitatBlend * (dunes + ridges + crater);
}

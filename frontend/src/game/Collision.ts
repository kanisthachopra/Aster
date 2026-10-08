export type Collider = { id: string; x: number; z: number; bottom: number; top: number } &
  ({ kind: 'circle'; radius: number } | { kind: 'box'; halfX: number; halfZ: number; yaw?: number });

/** A spatially indexed upright capsule controller. Small substeps prevent tunnelling through thin poles. */
export class CollisionWorld {
  readonly colliders: Collider[] = [];
  private cells = new Map<string, Collider[]>();
  add(collider: Collider) {
    this.colliders.push(collider);
    const rx = collider.kind === 'circle' ? collider.radius : collider.yaw ? Math.hypot(collider.halfX, collider.halfZ) : collider.halfX;
    const rz = collider.kind === 'circle' ? collider.radius : collider.yaw ? rx : collider.halfZ;
    for (let x = Math.floor((collider.x - rx - .5) / 8); x <= Math.floor((collider.x + rx + .5) / 8); x++) {
      for (let z = Math.floor((collider.z - rz - .5) / 8); z <= Math.floor((collider.z + rz + .5) / 8); z++) {
        const key = `${x}:${z}`; const cell = this.cells.get(key) ?? []; cell.push(collider); this.cells.set(key, cell);
      }
    }
  }
  move(from: { x: number; z: number }, to: { x: number; z: number }, feet: number, radius = .34) {
    const steps = Math.max(1, Math.ceil(Math.hypot(to.x - from.x, to.z - from.z) / .16));
    const dx = (to.x - from.x) / steps, dz = (to.z - from.z) / steps;
    let x = from.x, z = from.z;
    for (let step = 0; step < steps; step++) {
      x += dx; z += dz;
      for (let pass = 0; pass < 4; pass++) {
        const nearby = this.cells.get(`${Math.floor(x / 8)}:${Math.floor(z / 8)}`) ?? [];
        let changed = false;
        for (const c of nearby) {
          if (feet >= c.top + .02 || feet + 1.7 <= c.bottom) continue;
          if (c.kind === 'circle') {
            const ox = x - c.x, oz = z - c.z, d = Math.hypot(ox, oz), min = radius + c.radius;
            if (d >= min) continue;
            const nx = d > .0001 ? ox / d : 1, nz = d > .0001 ? oz / d : 0;
            x = c.x + nx * (min + .0001); z = c.z + nz * (min + .0001); changed = true;
          } else {
            const cos = Math.cos(c.yaw ?? 0), sin = Math.sin(c.yaw ?? 0);
            let localX = (x - c.x) * cos - (z - c.z) * sin, localZ = (x - c.x) * sin + (z - c.z) * cos;
            const closestX = Math.max(-c.halfX, Math.min(c.halfX, localX));
            const closestZ = Math.max(-c.halfZ, Math.min(c.halfZ, localZ));
            const ox = localX - closestX, oz = localZ - closestZ, d = Math.hypot(ox, oz);
            if (d >= radius) continue;
            if (d > .0001) { localX += ox / d * (radius - d + .0001); localZ += oz / d * (radius - d + .0001); }
            else {
              const sides = [Math.abs(localX + c.halfX), Math.abs(c.halfX - localX), Math.abs(localZ + c.halfZ), Math.abs(c.halfZ - localZ)];
              const side = sides.indexOf(Math.min(...sides));
              if (side === 0) localX = -c.halfX - radius; else if (side === 1) localX = c.halfX + radius;
              else if (side === 2) localZ = -c.halfZ - radius; else localZ = c.halfZ + radius;
            }
            x = c.x + localX * cos + localZ * sin; z = c.z - localX * sin + localZ * cos;
            changed = true;
          }
        }
        if (!changed) break;
      }
    }
    return { x, z };
  }
}

// collision.js — island boundary + obstacle colliders
import { ISLAND_RADIUS } from './state.js';

const colliders = []; // { x, z, r }

export function addCollider(x, z, r) {
    colliders.push({ x, z, r });
}

export function resolveCollisions(obj) {
    for (const c of colliders) {
        const dx   = obj.position.x - c.x;
        const dz   = obj.position.z - c.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist < c.r + 0.5 && dist > 0.001) {
            const push = (c.r + 0.5 - dist) / dist;
            obj.position.x += dx * push;
            obj.position.z += dz * push;
        }
    }
}

export function resolveIslandBoundary(obj) {
    const dx   = obj.position.x;
    const dz   = obj.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist > ISLAND_RADIUS - 1) {
        const scale = (ISLAND_RADIUS - 1) / dist;
        obj.position.x = dx * scale;
        obj.position.z = dz * scale;
    }
}

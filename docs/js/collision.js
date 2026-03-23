// collision.js — circle colliders + island boundary
import { BOUNDARY_RADIUS } from './state.js';

export const colliders = [];

export function addCollider(x, z, radius) {
    colliders.push({ x, z, radius });
}

// remove a collider by position — used for gate opening
export function removeCollider(x, z) {
    const idx = colliders.findIndex(c => Math.abs(c.x - x) < 1 && Math.abs(c.z - z) < 1);
    if (idx >= 0) colliders.splice(idx, 1);
}

export function resolveCollisions(player) {
    for (const c of colliders) {
        const dx = player.position.x - c.x;
        const dz = player.position.z - c.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        const minDist = c.radius + 0.5;
        if (dist < minDist && dist > 0) {
            player.position.x = c.x + (dx / dist) * minDist;
            player.position.z = c.z + (dz / dist) * minDist;
        }
    }
}

export function resolveIslandBoundary(player) {
    const dx = player.position.x;
    const dz = player.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist > BOUNDARY_RADIUS) {
        player.position.x = (dx / dist) * BOUNDARY_RADIUS;
        player.position.z = (dz / dist) * BOUNDARY_RADIUS;
    }
}

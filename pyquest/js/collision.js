// collision.js — circle colliders + island boundary
import { BOUNDARY_RADIUS } from './state.js';

export const colliders = [];

export function addCollider(x, z, radius) {
    colliders.push({ x, z, radius });
}

// push player out of any overlapping collider
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

// keep player inside the island
export function resolveIslandBoundary(player) {
    const dx = player.position.x;
    const dz = player.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist > BOUNDARY_RADIUS) {
        player.position.x = (dx / dist) * BOUNDARY_RADIUS;
        player.position.z = (dz / dist) * BOUNDARY_RADIUS;
    }
}

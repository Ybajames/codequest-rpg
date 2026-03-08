// ─────────────────────────────────────────────────────────────────────────────
//  collision.js
//  Handles all physical collision detection.
//  Circle colliders on the XZ plane — simple and fast.
//  Other files call addCollider() when they place objects in the world.
//  The game loop calls resolveCollisions() and resolveIslandBoundary() every frame.
// ─────────────────────────────────────────────────────────────────────────────
import { BOUNDARY_RADIUS } from './state.js';

// The master list of all solid objects — added to by world.js, environment.js, npcs.js
export const colliders = [];

// addCollider — call this whenever you place something solid in the world
// x, z = center position, radius = how wide the blocked area is
export function addCollider(x, z, radius) {
    colliders.push({ x, z, radius });
}

// resolveCollisions — push player out of any overlapping collider
// Called every frame AFTER movement, BEFORE render
export function resolveCollisions(player) {
    for (const c of colliders) {
        const dx = player.position.x - c.x;
        const dz = player.position.z - c.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        const minDist = c.radius + 0.5; // 0.5 = player body radius

        if (dist < minDist && dist > 0) {
            // Push player out along the collision normal
            player.position.x = c.x + (dx / dist) * minDist;
            player.position.z = c.z + (dz / dist) * minDist;
        }
    }
}

// resolveIslandBoundary — circular wall at the ocean edge
// Player can walk to the beach but not into the water
export function resolveIslandBoundary(player) {
    const dx = player.position.x;
    const dz = player.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist > BOUNDARY_RADIUS) {
        // Push player back inside — same direction they came from
        player.position.x = (dx / dist) * BOUNDARY_RADIUS;
        player.position.z = (dz / dist) * BOUNDARY_RADIUS;
    }
}

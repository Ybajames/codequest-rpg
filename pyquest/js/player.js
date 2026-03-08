// ─────────────────────────────────────────────────────────────────────────────
//  player.js
//  Builds the player character and manages all input/control state.
//
//  Exports:
//    playerGroup   — the root group that moves through the world
//    cameraPivot   — child of playerGroup, camera is attached to this
//    controls      — object holding yaw, pitch, keys, velocity — read by main.js
//    pArmL/R, pLegL/R — limb references for walk animation in main.js
// ─────────────────────────────────────────────────────────────────────────────
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160/build/three.module.js';
import { scene, camera, renderer, MAT, box, addTo } from './state.js';

// ── PLAYER MESH ───────────────────────────────────────────────────────────────
// Blocky Minecraft-style character built from boxes
export const playerGroup = new THREE.Group();
playerGroup.position.set(0, 0, 0);
scene.add(playerGroup);

// Body
export const pBody = box(0.8, 1.0, 0.4, MAT.playerBody);
addTo(playerGroup, pBody, 0, 1.5, 0);

// Head
const pHead = box(0.8, 0.8, 0.8, MAT.playerHead);
addTo(playerGroup, pHead, 0, 2.4, 0);
addTo(pHead, box(0.15, 0.12, 0.05, MAT.playerEye), -0.2, 0.05, 0.42);
addTo(pHead, box(0.15, 0.12, 0.05, MAT.playerEye),  0.2, 0.05, 0.42);

// Arms — exported for walk animation
export const pArmL = box(0.3, 0.9, 0.3, MAT.playerArm);
addTo(playerGroup, pArmL, -0.55, 1.55, 0);
export const pArmR = box(0.3, 0.9, 0.3, MAT.playerArm);
addTo(playerGroup, pArmR,  0.55, 1.55, 0);

// Legs — exported for walk animation
export const pLegL = box(0.35, 0.9, 0.35, MAT.playerLeg);
addTo(playerGroup, pLegL, -0.22, 0.55, 0);
export const pLegR = box(0.35, 0.9, 0.35, MAT.playerLeg);
addTo(playerGroup, pLegR,  0.22, 0.55, 0);

// Shoes
addTo(playerGroup, box(0.38, 0.2, 0.42, MAT.playerShoe), -0.22, 0.1, 0.04);
addTo(playerGroup, box(0.38, 0.2, 0.42, MAT.playerShoe),  0.22, 0.1, 0.04);

// ── CAMERA PIVOT ──────────────────────────────────────────────────────────────
// The camera sits inside a pivot attached to the player's head position
// Rotating the pivot up/down gives us the pitch (look up/down)
export const cameraPivot = new THREE.Object3D();
cameraPivot.position.set(0, 2.6, 0);
playerGroup.add(cameraPivot);
camera.position.set(0, 0, 0);
cameraPivot.add(camera);

// ── CONTROLS STATE ────────────────────────────────────────────────────────────
// All input state in one object — main.js reads this every frame
export const controls = {
    keys:      {},      // which keyboard keys are currently held
    yaw:       0,       // horizontal camera rotation (left/right look)
    pitch:     0,       // vertical camera rotation (up/down look)
    isLocked:  false,   // is pointer locked?
    velocityY: 0,       // current vertical velocity (for gravity/jump)
    onGround:  true,    // is player standing on ground?
};

export const GRAVITY = -20;
export const JUMP_V  = 8;
export const SPEED   = 8;

// ── POINTER LOCK + MOUSE LOOK ─────────────────────────────────────────────────
// We listen for pointer lock changes and mouse movement here
// The overlay element is created in main.js (needs username input too)
document.addEventListener('pointerlockchange', () => {
    controls.isLocked = document.pointerLockElement === renderer.domElement;
});

document.addEventListener('mousemove', e => {
    if (!controls.isLocked) return;
    controls.yaw   -= e.movementX * 0.002;
    controls.pitch -= e.movementY * 0.002;
    // Clamp pitch so player can't look fully upside down
    controls.pitch = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, controls.pitch));
});

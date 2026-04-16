// player.js — player character mesh + movement controls
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160/build/three.module.js';
import { scene, camera, box } from './state.js';

export const SPEED   = 8;
export const GRAVITY = -18;
export const JUMP_V  = 7;

// ── CONTROLS STATE ────────────────────────────────────────────────────────────
export const controls = {
    keys:      {},
    yaw:       0,
    pitch:     0,
    velocityY: 0,
    onGround:  true,
    isLocked:  false,
};

// ── PLAYER GROUP ──────────────────────────────────────────────────────────────
export const playerGroup = new THREE.Group();
// Spawn at z=15 (near guide bot), y=10 so gravity drops them onto the terrain surface
playerGroup.position.set(0, 10, 15);
scene.add(playerGroup);

// camera pivot (for head look up/down)
export const cameraPivot = new THREE.Group();
cameraPivot.position.set(0, 1.65, 0);
playerGroup.add(cameraPivot);
cameraPivot.add(camera);
camera.position.set(0, 0, 0);

// ── CHARACTER BODY ────────────────────────────────────────────────────────────
const mSkin  = new THREE.MeshLambertMaterial({ color: 0xffcc99 });
const mShirt = new THREE.MeshLambertMaterial({ color: 0x1565c0 });
const mPants = new THREE.MeshLambertMaterial({ color: 0x37474f });
const mShoe  = new THREE.MeshLambertMaterial({ color: 0x212121 });
const mHair  = new THREE.MeshLambertMaterial({ color: 0x4e342e });

// torso
const torso = box(0.5, 0.6, 0.28, mShirt);
torso.position.set(0, 1.05, 0);
playerGroup.add(torso);

// head
const head = box(0.38, 0.38, 0.36, mSkin);
head.position.set(0, 1.56, 0);
playerGroup.add(head);

// hair
const hair = box(0.40, 0.10, 0.38, mHair);
hair.position.set(0, 1.78, 0);
playerGroup.add(hair);

// arms
export const pArmL = new THREE.Group(); pArmL.position.set(-0.34, 1.22, 0); playerGroup.add(pArmL);
export const pArmR = new THREE.Group(); pArmR.position.set( 0.34, 1.22, 0); playerGroup.add(pArmR);
const armMeshL = box(0.18, 0.48, 0.18, mShirt); armMeshL.position.y = -0.18; pArmL.add(armMeshL);
const armMeshR = box(0.18, 0.48, 0.18, mShirt); armMeshR.position.y = -0.18; pArmR.add(armMeshR);
const handL = box(0.20, 0.18, 0.18, mSkin); handL.position.y = -0.46; pArmL.add(handL);
const handR = box(0.20, 0.18, 0.18, mSkin); handR.position.y = -0.46; pArmR.add(handR);

// legs
export const pLegL = new THREE.Group(); pLegL.position.set(-0.14, 0.72, 0); playerGroup.add(pLegL);
export const pLegR = new THREE.Group(); pLegR.position.set( 0.14, 0.72, 0); playerGroup.add(pLegR);
const legMeshL = box(0.20, 0.52, 0.20, mPants); legMeshL.position.y = -0.24; pLegL.add(legMeshL);
const legMeshR = box(0.20, 0.52, 0.20, mPants); legMeshR.position.y = -0.24; pLegR.add(legMeshR);
const shoeL = box(0.22, 0.12, 0.28, mShoe); shoeL.position.set(0, -0.54, 0.04); pLegL.add(shoeL);
const shoeR = box(0.22, 0.12, 0.28, mShoe); shoeR.position.set(0, -0.54, 0.04); pLegR.add(shoeR);

// ── MOUSE LOOK ────────────────────────────────────────────────────────────────
document.addEventListener('mousemove', e => {
    if (!controls.isLocked) return;
    controls.yaw   -= e.movementX * 0.002;
    controls.pitch -= e.movementY * 0.002;
    controls.pitch  = Math.max(-1.2, Math.min(1.2, controls.pitch));
});

// player.js — player mesh, camera, input state
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160/build/three.module.js';
import { scene, camera, renderer, MAT, box, addTo } from './state.js';

// blocky player character
export const playerGroup = new THREE.Group();
playerGroup.position.set(0, 0, 0);
scene.add(playerGroup);

export const pBody = box(0.8, 1.0, 0.4, MAT.playerBody);
addTo(playerGroup, pBody, 0, 1.5, 0);

const pHead = box(0.8, 0.8, 0.8, MAT.playerHead);
addTo(playerGroup, pHead, 0, 2.4, 0);
addTo(pHead, box(0.15, 0.12, 0.05, MAT.playerEye), -0.2, 0.05, 0.42);
addTo(pHead, box(0.15, 0.12, 0.05, MAT.playerEye),  0.2, 0.05, 0.42);

// arms + legs exported for walk animation
export const pArmL = box(0.3, 0.9, 0.3, MAT.playerArm);
addTo(playerGroup, pArmL, -0.55, 1.55, 0);
export const pArmR = box(0.3, 0.9, 0.3, MAT.playerArm);
addTo(playerGroup, pArmR,  0.55, 1.55, 0);

export const pLegL = box(0.35, 0.9, 0.35, MAT.playerLeg);
addTo(playerGroup, pLegL, -0.22, 0.55, 0);
export const pLegR = box(0.35, 0.9, 0.35, MAT.playerLeg);
addTo(playerGroup, pLegR,  0.22, 0.55, 0);

addTo(playerGroup, box(0.38, 0.2, 0.42, MAT.playerShoe), -0.22, 0.1, 0.04);
addTo(playerGroup, box(0.38, 0.2, 0.42, MAT.playerShoe),  0.22, 0.1, 0.04);

// camera pivot sits at head height
export const cameraPivot = new THREE.Object3D();
cameraPivot.position.set(0, 2.6, 0);
playerGroup.add(cameraPivot);
camera.position.set(0, 0, 0);
cameraPivot.add(camera);

// all input state — read by main.js each frame
export const controls = {
    keys:      {},
    yaw:       0,
    pitch:     0,
    isLocked:  false,
    velocityY: 0,
    onGround:  true,
};

export const GRAVITY = -20;
export const JUMP_V  = 8;
export const SPEED   = 8;

// mouse look
document.addEventListener('pointerlockchange', () => {
    controls.isLocked = document.pointerLockElement === renderer.domElement;
});
document.addEventListener('mousemove', e => {
    if (!controls.isLocked) return;
    controls.yaw   -= e.movementX * 0.002;
    controls.pitch -= e.movementY * 0.002;
    controls.pitch  = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, controls.pitch));
});

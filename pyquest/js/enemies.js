// enemies.js — bug enemy (stationary target)
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160/build/three.module.js';
import { scene, MAT, box, addTo } from './state.js';

export const bugGroup = new THREE.Group();
bugGroup.position.set(0, 0, -25);
scene.add(bugGroup);

addTo(bugGroup, box(1.2, 0.8, 1.4, MAT.bugBody), 0, 0.8, 0);
const bugHead = box(0.9, 0.7, 0.7, MAT.bugBody);
addTo(bugGroup, bugHead, 0, 0.8, -1.0);
addTo(bugHead, box(0.18, 0.18, 0.05, MAT.bugEye), -0.22, 0.05, 0.38);
addTo(bugHead, box(0.18, 0.18, 0.05, MAT.bugEye),  0.22, 0.05, 0.38);

// 6 legs
[[-0.7,-1.0],[0.7,-1.0],[-0.75,-0.3],[0.75,-0.3],[-0.7,0.4],[0.7,0.4]]
.forEach(([ox, oz]) => {
    const leg = box(0.8, 0.15, 0.15, MAT.bugLeg);
    leg.position.set(ox * 1.4, 0.4, oz * 0.4);
    leg.rotation.z = ox < 0 ? 0.4 : -0.4;
    bugGroup.add(leg);
});

export const bugLight = new THREE.PointLight(0xff1744, 1.5, 8);
bugLight.position.set(0, 1.5, 0);
bugGroup.add(bugLight);

export const bugState = { alive: true };

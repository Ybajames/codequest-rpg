// boss.js — The Final Boss: SYNTAX ERROR
// Appears on island 1 when 4+ quests done
// Can only be defeated when all 11 skills are unlocked

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160/build/three.module.js';
import { scene, box, addTo } from './state.js';
import { addCollider, removeCollider } from './collision.js';

export const bossState = {
    spawned:  false,
    defeated: false,
    alive:    false,
};

// Boss lives at a fixed dramatic spot on island 1 — north of plaza
const BOSS_X = 0, BOSS_Z = -34;

export const bossGroup = new THREE.Group();
bossGroup.position.set(BOSS_X, 0, BOSS_Z);
bossGroup.visible = false;
scene.add(bossGroup);

// ── BOSS MESH — large, dark, corrupted entity ─────────────────────────────────
const mDark    = new THREE.MeshLambertMaterial({ color: 0x0a0010 });
const mGlitch  = new THREE.MeshLambertMaterial({ color: 0xff0044, emissive: 0xff0044, emissiveIntensity: 1.2 });
const mGlitch2 = new THREE.MeshLambertMaterial({ color: 0x8800ff, emissive: 0x8800ff, emissiveIntensity: 1.0 });
const mEye     = new THREE.MeshLambertMaterial({ color: 0xff2200, emissive: 0xff2200, emissiveIntensity: 2.0 });
const mCrack   = new THREE.MeshLambertMaterial({ color: 0xff4400, emissive: 0xff2200, emissiveIntensity: 0.8 });

// Core body — tall dark monolith
const body = box(2.2, 3.2, 1.2, mDark);
body.position.y = 2.2;
bossGroup.add(body);

// Shoulders — wide and angular
addTo(bossGroup, box(3.8, 0.8, 1.4, mDark), 0, 3.9, 0);

// Head — large and menacing
const head = box(1.8, 1.6, 1.6, mDark);
head.position.set(0, 5.2, 0);
bossGroup.add(head);

// Eyes — glowing red
const eyeL = box(0.35, 0.28, 0.1, mEye);
const eyeR = box(0.35, 0.28, 0.1, mEye);
eyeL.position.set(-0.42, 0.1, 0.82);
eyeR.position.set( 0.42, 0.1, 0.82);
head.add(eyeL); head.add(eyeR);

// Glitch cracks on body — red/purple shards poking out
const crackData = [
    [ 0.8, 2.5,  0.5,  0.2, 1.0, 0.15, mGlitch],
    [-0.9, 3.0, -0.4,  0.15,1.2, 0.12, mGlitch2],
    [ 0.3, 1.8,  0.5,  0.25,0.8, 0.1,  mGlitch],
    [-0.4, 2.8,  0.5,  0.18,0.9, 0.1,  mGlitch2],
    [ 1.0, 3.5,  0.0,  0.12,1.4, 0.1,  mCrack],
    [-1.1, 2.0,  0.2,  0.14,1.0, 0.1,  mGlitch],
];
crackData.forEach(([x,y,z,w,h,d,mat]) => {
    const c = box(w,h,d,mat);
    c.position.set(x,y,z);
    c.rotation.z = (Math.random()-0.5)*0.6;
    c.rotation.x = (Math.random()-0.5)*0.4;
    bossGroup.add(c);
});

// Arms — long and jagged
addTo(bossGroup, box(0.6, 2.8, 0.6, mDark), -1.8, 2.8,  0.0);
addTo(bossGroup, box(0.6, 2.8, 0.6, mDark),  1.8, 2.8,  0.0);
// Claws
[[-2.4,1.2,0.4],[-2.6,1.0,-0.2],[-2.2,0.9,-0.4]].forEach(([x,y,z]) => {
    addTo(bossGroup, box(0.18,0.8,0.18,mGlitch), x, y, z);
});
[[2.4,1.2,0.4],[2.6,1.0,-0.2],[2.2,0.9,-0.4]].forEach(([x,y,z]) => {
    addTo(bossGroup, box(0.18,0.8,0.18,mGlitch2), x, y, z);
});

// Legs
addTo(bossGroup, box(0.7, 1.4, 0.7, mDark), -0.6, 0.7, 0);
addTo(bossGroup, box(0.7, 1.4, 0.7, mDark),  0.6, 0.7, 0);

// Floating glitch shards orbiting the boss
export const shards = [];
for (let i = 0; i < 8; i++) {
    const size = 0.15 + Math.random() * 0.3;
    const mat  = i % 2 === 0 ? mGlitch : mGlitch2;
    const s    = box(size, size * 2, size * 0.5, mat);
    s.userData.orbitAngle  = (i / 8) * Math.PI * 2;
    s.userData.orbitRadius = 2.0 + Math.random() * 1.2;
    s.userData.orbitHeight = 2.5 + Math.random() * 2.5;
    s.userData.orbitSpeed  = 0.8 + Math.random() * 0.6;
    scene.add(s);
    shards.push(s);
}

// Boss lights
export const bossLightRed  = new THREE.PointLight(0xff0022, 0, 18);
export const bossLightPurp = new THREE.PointLight(0x8800ff, 0, 14);
bossLightRed.position.set(BOSS_X, 4, BOSS_Z);
bossLightPurp.position.set(BOSS_X, 5.5, BOSS_Z);
scene.add(bossLightRed);
scene.add(bossLightPurp);

// Warning ring on ground — glowing circle under boss
const RING_SEGS = 48;
const ringGeo   = new THREE.RingGeometry(2.8, 3.2, RING_SEGS);
const ringMat   = new THREE.MeshBasicMaterial({ color: 0xff0044, transparent: true, opacity: 0.55, side: THREE.DoubleSide });
export const bossRing = new THREE.Mesh(ringGeo, ringMat);
bossRing.rotation.x = -Math.PI / 2;
bossRing.position.set(BOSS_X, 0.05, BOSS_Z);
bossRing.visible = false;
scene.add(bossRing);

// ── SPAWN / DEFEAT ────────────────────────────────────────────────────────────
export function spawnBoss() {
    if (bossState.spawned) return;
    bossState.spawned = true;
    bossState.alive   = true;
    bossGroup.visible = true;
    bossRing.visible  = true;
    shards.forEach(s => s.visible = true);
    bossLightRed.intensity  = 3.0;
    bossLightPurp.intensity = 2.0;
    addCollider(BOSS_X, BOSS_Z, 2.8);
}

export function defeatBoss() {
    if (bossState.defeated) return;
    bossState.defeated = true;
    bossState.alive    = false;
    bossGroup.visible  = false;
    bossRing.visible   = false;
    shards.forEach(s => { s.visible = false; });
    bossLightRed.intensity  = 0;
    bossLightPurp.intensity = 0;
    removeCollider(BOSS_X, BOSS_Z);
}

export const BOSS_X_POS = BOSS_X;
export const BOSS_Z_POS = BOSS_Z;

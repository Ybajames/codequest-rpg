// guide.js — friendly guide bot NPC at centre of island
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160/build/three.module.js';
import { scene, box, addTo } from './state.js';
import { addCollider } from './collision.js';
import { getTerrainHeight } from './world.js';

// ── GUIDE BOT MESH ────────────────────────────────────────────────────────────
const g = new THREE.Group();
g.position.set(0, getTerrainHeight(0, 10), 10); // just south of centre plaza
scene.add(g);

const mMetal  = new THREE.MeshLambertMaterial({ color: 0x78909c });
const mDark   = new THREE.MeshLambertMaterial({ color: 0x37474f });
const mCyan   = new THREE.MeshLambertMaterial({ color: 0x00f5ff, emissive: 0x00f5ff, emissiveIntensity: 0.9 });
const mGold   = new THREE.MeshLambertMaterial({ color: 0xffd54f, emissive: 0xffaa00, emissiveIntensity: 0.5 });
const mGreen  = new THREE.MeshLambertMaterial({ color: 0x39ff14, emissive: 0x39ff14, emissiveIntensity: 0.6 });

// body
addTo(g, box(1.1, 1.3, 0.7, mMetal),   0, 1.1, 0);
// chest panel
addTo(g, box(0.55, 0.55, 0.08, mDark),  0, 1.2, 0.37);
addTo(g, box(0.18, 0.18, 0.06, mCyan),  0, 1.2, 0.42);
// shoulder pads
addTo(g, box(0.22, 0.18, 0.62, mDark), -0.68, 1.55, 0);
addTo(g, box(0.22, 0.18, 0.62, mDark),  0.68, 1.55, 0);

// head
const head = new THREE.Group();
head.position.set(0, 2.15, 0);
g.add(head);
addTo(head, box(0.90, 0.80, 0.80, mMetal),  0,    0,    0);
// visor
addTo(head, box(0.62, 0.22, 0.06, mCyan),   0,    0.08, 0.42);
// eyes inside visor
addTo(head, box(0.16, 0.12, 0.04, mGreen), -0.16, 0.08, 0.46);
addTo(head, box(0.16, 0.12, 0.04, mGreen),  0.16, 0.08, 0.46);
// antenna
addTo(head, box(0.06, 0.40, 0.06, mDark),   0,    0.58, 0);
addTo(head, box(0.14, 0.14, 0.14, mGold),   0,    0.82, 0);
// ear panels
addTo(head, box(0.06, 0.35, 0.30, mDark),  -0.50, 0.02, 0);
addTo(head, box(0.06, 0.35, 0.30, mDark),   0.50, 0.02, 0);

// arms
const armLG = new THREE.Group(); armLG.position.set(-0.72, 1.18, 0); g.add(armLG);
const armRG = new THREE.Group(); armRG.position.set( 0.72, 1.18, 0); g.add(armRG);
addTo(armLG, box(0.28, 0.80, 0.28, mMetal), 0, -0.10, 0);
addTo(armRG, box(0.28, 0.80, 0.28, mMetal), 0, -0.10, 0);
// hands
addTo(armLG, box(0.32, 0.32, 0.32, mDark), 0, -0.58, 0);
addTo(armRG, box(0.32, 0.32, 0.32, mDark), 0, -0.58, 0);

// legs
const legLG = new THREE.Group(); legLG.position.set(-0.28, 0.45, 0); g.add(legLG);
const legRG = new THREE.Group(); legRG.position.set( 0.28, 0.45, 0); g.add(legRG);
addTo(legLG, box(0.30, 0.80, 0.30, mDark), 0, -0.40, 0);
addTo(legRG, box(0.30, 0.80, 0.30, mDark), 0, -0.40, 0);
// feet
addTo(legLG, box(0.36, 0.16, 0.48, mMetal), 0, -0.86, 0.06);
addTo(legRG, box(0.36, 0.16, 0.48, mMetal), 0, -0.86, 0.06);

// glow light
const guideLight = new THREE.PointLight(0x00f5ff, 1.2, 8);
guideLight.position.set(0, 2, 0);
g.add(guideLight);

export const guideNPC = g;
addCollider(0, 10, 1.5);

// ── GUIDE MESSAGES ────────────────────────────────────────────────────────────
const MESSAGES = [
    "🤖 Welcome to CodeQuest!\nWalk into a portal to start playing.",
    "🔵 Blue portal = Code Arena\nBattle other coders in real time!",
    "🔴 Red portal = Code Race\nCode faster — drive faster!",
    "🟡 Yellow portal = Mini Quiz\nSolo Python challenges!",
    "💡 Walk INTO a portal\nthen press [E] to enter the game.",
];
let msgIndex = 0;
let lastSwitch = 0;

export function getGuideMessage() {
    return MESSAGES[msgIndex % MESSAGES.length];
}

// ── ANIMATE ───────────────────────────────────────────────────────────────────
const GUIDE_BASE_Y = getTerrainHeight(0, 10);

export function animateGuide(playerPos, t) {
    // face player
    g.rotation.y = Math.atan2(
        playerPos.x - g.position.x,
        playerPos.z - g.position.z
    );

    // gentle hover bob — offset from terrain base, not absolute y=0
    g.position.y = GUIDE_BASE_Y + Math.sin(t * 1.4) * 0.06;

    // arm wave
    armLG.rotation.x = Math.sin(t * 1.2) * 0.25;
    armRG.rotation.x = Math.sin(t * 1.2 + Math.PI) * 0.20;

    // antenna gold pulse
    guideLight.intensity = 1.0 + Math.sin(t * 2.5) * 0.5;

    // cycle messages every 5 seconds
    if (t - lastSwitch > 5) {
        msgIndex++;
        lastSwitch = t;
    }
}

// vrcompanion.js — Mini robot companion that walks beside player in VR
// Click it (right trigger near robot) to open your profile panel

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160/build/three.module.js';
import { scene, camera } from './state.js';

// ── ROBOT MESH ────────────────────────────────────────────────────────────────
const robotGroup = new THREE.Group();
robotGroup.visible = false;
scene.add(robotGroup);

const mMetal  = new THREE.MeshLambertMaterial({ color: 0x90a4ae });
const mDark   = new THREE.MeshLambertMaterial({ color: 0x37474f });
const mGlow   = new THREE.MeshLambertMaterial({ color: 0x00f5ff, emissive: 0x00f5ff, emissiveIntensity: 0.9 });
const mGlow2  = new THREE.MeshLambertMaterial({ color: 0x39ff14, emissive: 0x39ff14, emissiveIntensity: 0.8 });
const mGrey   = new THREE.MeshLambertMaterial({ color: 0x607d8b });
const mGold   = new THREE.MeshLambertMaterial({ color: 0xffd54f, emissive: 0xffaa00, emissiveIntensity: 0.4 });

function rb(w, h, d, mat, x, y, z, parent = robotGroup) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    parent.add(m);
    return m;
}

// Body
rb(0.18, 0.20, 0.14, mMetal, 0, 0.22, 0);
// Chest panel
rb(0.10, 0.10, 0.02, mDark,  0, 0.24, 0.075);
// Chest light
rb(0.04, 0.04, 0.02, mGlow,  0, 0.24, 0.085);

// Head
const head = new THREE.Group();
head.position.set(0, 0.38, 0);
robotGroup.add(head);
rb(0.16, 0.14, 0.14, mMetal,  0,    0,    0,  head);
// Eyes
rb(0.04, 0.03, 0.02, mGlow,  -0.04, 0.01, 0.075, head);
rb(0.04, 0.03, 0.02, mGlow,   0.04, 0.01, 0.075, head);
// Antenna
rb(0.02, 0.08, 0.02, mDark,   0,    0.10, 0,     head);
rb(0.04, 0.04, 0.04, mGold,   0,    0.15, 0,     head);
// Ear bits
rb(0.02, 0.06, 0.02, mGrey,  -0.09, 0.01, 0,    head);
rb(0.02, 0.06, 0.02, mGrey,   0.09, 0.01, 0,    head);

// Arms
const armL = new THREE.Group(); armL.position.set(-0.12, 0.22, 0); robotGroup.add(armL);
const armR = new THREE.Group(); armR.position.set( 0.12, 0.22, 0); robotGroup.add(armR);
rb(0.05, 0.14, 0.05, mGrey, -0.04, 0, 0, armL);
rb(0.05, 0.14, 0.05, mGrey,  0.04, 0, 0, armR);
// Hands
rb(0.06, 0.06, 0.06, mMetal, -0.04, -0.10, 0, armL);
rb(0.06, 0.06, 0.06, mMetal,  0.04, -0.10, 0, armR);

// Legs
const legL = new THREE.Group(); legL.position.set(-0.055, 0.12, 0); robotGroup.add(legL);
const legR = new THREE.Group(); legR.position.set( 0.055, 0.12, 0); robotGroup.add(legR);
rb(0.06, 0.14, 0.06, mDark, 0, -0.07, 0, legL);
rb(0.06, 0.14, 0.06, mDark, 0, -0.07, 0, legR);
// Feet
rb(0.08, 0.04, 0.10, mMetal, 0, -0.16, 0.02, legL);
rb(0.08, 0.04, 0.10, mMetal, 0, -0.16, 0.02, legR);

// Glow light under robot
const robotLight = new THREE.PointLight(0x00f5ff, 0.8, 1.2);
robotLight.position.set(0, 0.1, 0);
robotGroup.add(robotLight);

// ── PROFILE PANEL — canvas texture plane ──────────────────────────────────────
const PANEL_W = 768, PANEL_H = 960;
const profileCanvas = document.createElement('canvas');
profileCanvas.width  = PANEL_W;
profileCanvas.height = PANEL_H;
const profileCtx = profileCanvas.getContext('2d');
const profileTex = new THREE.CanvasTexture(profileCanvas);

const profilePanel = new THREE.Mesh(
    new THREE.PlaneGeometry(0.55, 0.69),
    new THREE.MeshBasicMaterial({ map: profileTex, transparent: true, depthTest: false, side: THREE.DoubleSide })
);
profilePanel.renderOrder = 999;
profilePanel.visible = false;
camera.add(profilePanel);
profilePanel.position.set(0, 0, -1.1); // 1.1m in front of camera, centred

// ── STATE ─────────────────────────────────────────────────────────────────────
let profileOpen   = false;
export let companionVisible = false;

// ── SHOW / HIDE ───────────────────────────────────────────────────────────────
export function showCompanion(show) {
    robotGroup.visible  = show;
    companionVisible    = show;
    if (!show) { profilePanel.visible = false; profileOpen = false; }
}

export function toggleProfile() {
    profileOpen = !profileOpen;
    profilePanel.visible = profileOpen;
    if (profileOpen) drawProfile();
}

export function closeProfile() {
    profileOpen = false;
    profilePanel.visible = false;
}

// ── DRAW PROFILE PANEL ────────────────────────────────────────────────────────
let _profileData = {};
export function setProfileData(data) { _profileData = data; }

function drawProfile() {
    const ctx = profileCtx;
    const W = PANEL_W, H = PANEL_H;
    ctx.clearRect(0, 0, W, H);

    // Background
    ctx.fillStyle = 'rgba(0,8,20,0.95)';
    ctx.fillRect(0, 0, W, H);

    // Border
    ctx.strokeStyle = '#00f5ff';
    ctx.lineWidth = 4;
    ctx.strokeRect(3, 3, W-6, H-6);
    ctx.strokeStyle = 'rgba(0,245,255,0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(10, 10, W-20, H-20);

    // Header
    ctx.fillStyle = 'rgba(0,245,255,0.08)';
    ctx.fillRect(3, 3, W-6, 80);
    ctx.fillStyle = '#00f5ff';
    ctx.font = 'bold 32px monospace';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#00f5ff';
    ctx.shadowBlur = 10;
    ctx.fillText('⚡ CODER PROFILE', W/2, 50);
    ctx.shadowBlur = 0;

    ctx.fillStyle = 'rgba(0,245,255,0.5)';
    ctx.font = '20px monospace';
    ctx.fillText(_profileData.username || 'Player', W/2, 80);

    let y = 115;

    // ── LEVEL + XP ──────────────────────────────────────────────────────────
    drawSection(ctx, '// LEVEL & XP', W, y); y += 38;

    ctx.fillStyle = '#00f5ff';
    ctx.font = 'bold 48px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`LVL ${_profileData.level || 1}`, W/2, y + 40);
    y += 52;

    // XP bar
    const xp     = _profileData.xp     || 0;
    const xpNext = _profileData.xpNext || 100;
    const xpPct  = Math.min(1, xp / xpNext);
    ctx.fillStyle = 'rgba(0,245,255,0.12)';
    ctx.fillRect(30, y, W-60, 22);
    ctx.fillStyle = '#00f5ff';
    ctx.fillRect(30, y, (W-60)*xpPct, 22);
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = '16px monospace';
    ctx.fillText(`${xp} / ${xpNext} XP`, W/2, y+16);
    y += 40;

    // ── SKILLS ──────────────────────────────────────────────────────────────
    drawSection(ctx, '// SKILLS UNLOCKED', W, y); y += 38;

    const skills   = _profileData.skills || [];
    const allSkills= ['Variable','Constant','Print','Input','Logic','Loop','Function','List','String','Dictionary','Class'];
    const cols     = 3;
    const cellW    = (W - 60) / cols;

    allSkills.forEach((sk, i) => {
        const col  = i % cols;
        const row  = Math.floor(i / cols);
        const sx   = 30 + col * cellW;
        const sy   = y + row * 36;
        const done = skills.includes(sk);
        ctx.fillStyle = done ? 'rgba(57,255,20,0.15)' : 'rgba(255,255,255,0.04)';
        ctx.fillRect(sx, sy, cellW-8, 28);
        ctx.fillStyle = done ? '#39ff14' : 'rgba(255,255,255,0.25)';
        ctx.font = done ? 'bold 15px monospace' : '15px monospace';
        ctx.textAlign = 'left';
        ctx.fillText((done ? '✓ ' : '○ ') + sk, sx+8, sy+19);
    });
    y += Math.ceil(allSkills.length / cols) * 36 + 12;

    // ── COMBAT ──────────────────────────────────────────────────────────────
    drawSection(ctx, '// COMBAT', W, y); y += 38;

    ctx.textAlign = 'left';
    const combatRows = [
        ['🐛 Bug Enemy',   _profileData.bugDefeated  ? '✓ DEFEATED' : '○ Active',  _profileData.bugDefeated],
        ['💀 Final Boss',  _profileData.bossDefeated ? '✓ DEFEATED' : '○ Lurking', _profileData.bossDefeated],
    ];
    combatRows.forEach(([label, val, done]) => {
        ctx.fillStyle = done ? 'rgba(57,255,20,0.12)' : 'rgba(255,49,49,0.08)';
        ctx.fillRect(30, y, W-60, 32);
        ctx.fillStyle = '#b0d8e8';
        ctx.font = '18px monospace';
        ctx.fillText(label, 42, y+22);
        ctx.fillStyle = done ? '#39ff14' : '#ff5555';
        ctx.textAlign = 'right';
        ctx.fillText(val, W-38, y+22);
        ctx.textAlign = 'left';
        y += 38;
    });
    y += 6;

    // ── QUESTS ──────────────────────────────────────────────────────────────
    drawSection(ctx, '// QUESTS', W, y); y += 36;

    const quests = _profileData.quests || [];
    quests.forEach(q => {
        if (y > H - 60) return;
        ctx.fillStyle = q.done ? 'rgba(57,255,20,0.06)' : 'rgba(255,230,0,0.06)';
        ctx.fillRect(30, y, W-60, 28);
        ctx.fillStyle = q.done ? 'rgba(57,255,20,0.6)' : '#ffe600';
        ctx.font = '15px monospace';
        ctx.fillText((q.done ? '✓ ' : '○ ') + q.label, 40, y+19);
        y += 32;
    });

    // Close hint
    ctx.fillStyle = 'rgba(0,245,255,0.35)';
    ctx.font = '16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('[ Pull trigger again to close ]', W/2, H-20);

    profileTex.needsUpdate = true;
}

function drawSection(ctx, title, W, y) {
    ctx.fillStyle = 'rgba(0,245,255,0.07)';
    ctx.fillRect(20, y, W-40, 28);
    ctx.fillStyle = 'rgba(0,245,255,0.6)';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(title, 30, y+19);
}

// ── ANIMATE — bob + walk beside vrRig ────────────────────────────────────────
// Called from main.js each frame
export function animateCompanion(vrRigPos, vrRigRotY, t, isMoving) {
    if (!companionVisible) return;

    // Position: 0.45 to the right of player, at ground level
    const offset = new THREE.Vector3(0.45, 0, 0.1);
    offset.applyEuler(new THREE.Euler(0, vrRigRotY, 0));

    robotGroup.position.set(
        vrRigPos.x + offset.x,
        vrRigPos.y + Math.sin(t * 3) * 0.025 + 0.16, // gentle bob
        vrRigPos.z + offset.z
    );

    // Face same direction as player
    robotGroup.rotation.y = vrRigRotY + 0.3;

    // Walk animation — swing arms + legs when moving
    const swing = isMoving ? Math.sin(t * 6) * 0.3 : 0;
    armL.rotation.x =  swing;
    armR.rotation.x = -swing;
    legL.rotation.x = -swing * 0.5;
    legR.rotation.x =  swing * 0.5;

    // Head look toward camera slightly
    head.rotation.y = Math.sin(t * 0.5) * 0.1;

    // Pulse glow
    robotLight.intensity = 0.6 + Math.sin(t * 2) * 0.3;
}

// ── CHECK IF CONTROLLER IS NEAR ROBOT ─────────────────────────────────────────
export function isNearRobot(pos) {
    if (!companionVisible) return false;
    const dx = pos.x - robotGroup.position.x;
    const dy = pos.y - robotGroup.position.y;
    const dz = pos.z - robotGroup.position.z;
    return Math.sqrt(dx*dx + dy*dy + dz*dz) < 0.6;
}

export { profilePanel, profileOpen };

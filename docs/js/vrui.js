// vrui.js — VR UI system
// Floating 3D canvas panels for NPC interaction + coding terminal in VR.
//
// Two panels:
//   1. NPC Panel  — appears above NPC when you walk within range
//                   has "▶ Start Challenge" and "✓ Done" buttons
//   2. VR Terminal — full coding terminal with on-screen keyboard
//                   shows challenge text, input area, submit/hint/close buttons
//
// Both panels are THREE.Mesh planes with CanvasTexture.
// Button hit detection: each frame main.js calls vrRaycast(controllerWorldPos, controllerWorldDir)
// which checks if any button rect is under the ray and returns the hit button name.

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160/build/three.module.js';
import { scene, camera } from './state.js';

// ── CONSTANTS ─────────────────────────────────────────────────────────────────
const C = {
    bg:       'rgba(0,8,20,0.97)',
    border:   '#00f5ff',
    borderDim:'rgba(0,245,255,0.3)',
    cyan:     '#00f5ff',
    green:    '#39ff14',
    yellow:   '#ffe600',
    red:      '#ff3131',
    white:    '#e0faff',
    dim:      '#4a7a8a',
    keyBg:    'rgba(0,30,50,0.9)',
    keyBgHov: 'rgba(0,80,120,0.95)',
    btnBg:    'rgba(0,40,70,0.9)',
    btnGreen: 'rgba(0,80,30,0.9)',
    btnRed:   'rgba(80,0,20,0.9)',
    font:     'monospace',
};

// ── HELPERS ───────────────────────────────────────────────────────────────────
function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

function makePanel(canvasW, canvasH, worldW, worldH) {
    const canvas = document.createElement('canvas');
    canvas.width  = canvasW;
    canvas.height = canvasH;
    const ctx = canvas.getContext('2d');
    const tex = new THREE.CanvasTexture(canvas);
    const geo = new THREE.PlaneGeometry(worldW, worldH);
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthTest: false, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.renderOrder = 100;
    mesh.visible = false;
    scene.add(mesh);
    return { canvas, ctx, tex, mesh, canvasW, canvasH, worldW, worldH, buttons: {} };
}

// ── NPC INTERACTION PANEL ─────────────────────────────────────────────────────
// 600×340 canvas → 1.2m × 0.68m in world
export const npcPanel = makePanel(600, 340, 1.2, 0.68);
let _npcData   = null;
let _npcMesh   = null; // the THREE.Group of the NPC being shown

export function showNPCPanel(npcData, npcMeshPosition) {
    _npcData = npcData;
    drawNPCPanel();
    npcPanel.mesh.visible = true;
    // Float 1.8m above NPC, facing the camera
    npcPanel.mesh.position.set(npcMeshPosition.x, npcMeshPosition.y + 4.2, npcMeshPosition.z);
    npcPanel.mesh.lookAt(camera.getWorldPosition(new THREE.Vector3()));
}

export function hideNPCPanel() {
    npcPanel.mesh.visible = false;
    _npcData = null;
}

function drawNPCPanel() {
    const { ctx, canvasW: W, canvasH: H, tex } = npcPanel;
    ctx.clearRect(0, 0, W, H);

    // background
    roundRect(ctx, 2, 2, W-4, H-4, 12);
    ctx.fillStyle = C.bg; ctx.fill();
    ctx.strokeStyle = C.border; ctx.lineWidth = 3; ctx.stroke();

    // inner border
    roundRect(ctx, 10, 10, W-20, H-20, 8);
    ctx.strokeStyle = C.borderDim; ctx.lineWidth = 1; ctx.stroke();

    const done = _npcData && _npcData.completed && _npcData.completed.length >= (_npcData.challenges?.length || 5);

    // NPC name
    ctx.fillStyle = C.cyan;
    ctx.font = `bold 20px ${C.font}`;
    ctx.textAlign = 'center';
    ctx.shadowColor = C.cyan; ctx.shadowBlur = 8;
    ctx.fillText(_npcData?.name || '', W/2, 48);
    ctx.shadowBlur = 0;

    // divider
    ctx.strokeStyle = C.borderDim; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(30, 62); ctx.lineTo(W-30, 62); ctx.stroke();

    // lesson preview
    ctx.fillStyle = C.white;
    ctx.font = `15px ${C.font}`;
    ctx.textAlign = 'center';
    const lesson = (_npcData?.lesson || '').split('\n');
    lesson.forEach((line, i) => ctx.fillText(line, W/2, 90 + i * 22));

    if (done) {
        // already completed
        ctx.fillStyle = C.green;
        ctx.font = `bold 16px ${C.font}`;
        ctx.fillText('✓ ABILITY ALREADY UNLOCKED', W/2, 185);

        // Close button
        npcPanel.buttons = {};
        drawButton(ctx, npcPanel, 'close', W/2 - 100, 220, 200, 52, '✕  Close', C.btnRed, C.red);
    } else {
        // challenge info
        const idx = _npcData?.currentChallenge || 0;
        const total = _npcData?.challenges?.length || 5;
        const xp = _npcData?.challenges?.[idx]?.xp || 0;
        ctx.fillStyle = C.yellow;
        ctx.font = `14px ${C.font}`;
        ctx.fillText(`Challenge ${idx+1} of ${total}  ·  +${xp} XP`, W/2, 178);

        // Start button
        npcPanel.buttons = {};
        drawButton(ctx, npcPanel, 'start', W/2 - 120, 210, 240, 60, '▶  Start Challenge', C.btnBg, C.cyan);
        drawButton(ctx, npcPanel, 'close', W/2 - 60,  285,  120, 36, '✕ Close', C.btnRed, C.red);
    }

    tex.needsUpdate = true;
}

// ── VR TERMINAL ───────────────────────────────────────────────────────────────
// 900×1100 canvas → 1.5m × 1.83m in world — big enough to be readable
export const vrTerm = makePanel(900, 1100, 1.5, 1.833);

let _termNPC       = null;
let _termChallenge = null;
let _termInput     = '';
let _termFeedback  = '';     // '' | 'correct' | 'wrong'
let _termFeedbackMsg = '';
let _termAttempts  = 0;
let _termShowHint  = false;
export let vrTermOpen = false;

// callbacks wired in by main.js
export let onVRSubmit = null;
export let onVRClose  = null;
export function setVRCallbacks(submitFn, closeFn) {
    onVRSubmit = submitFn;
    onVRClose  = closeFn;
}

export function openVRTerminal(npcData) {
    _termNPC       = npcData;
    const idx      = npcData.currentChallenge || 0;
    _termChallenge = npcData.challenges[idx];
    _termInput     = '';
    _termFeedback  = '';
    _termFeedbackMsg = '';
    _termAttempts  = 0;
    _termShowHint  = false;
    vrTermOpen     = true;
    drawVRTerminal();
    vrTerm.mesh.visible = true;
    // Float 2m in front of the camera at eye height
    positionTermInFrontOfCamera();
}

export function closeVRTerminal() {
    vrTermOpen = false;
    vrTerm.mesh.visible = false;
    _termNPC = null;
    _termChallenge = null;
}

function positionTermInFrontOfCamera() {
    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    dir.y = 0; dir.normalize();
    const camWorld = camera.getWorldPosition(new THREE.Vector3());
    vrTerm.mesh.position.set(
        camWorld.x + dir.x * 1.8,
        camWorld.y + 0.1,
        camWorld.z + dir.z * 1.8
    );
    vrTerm.mesh.lookAt(camWorld);
}

export function setVRFeedback(type, msg) {
    _termFeedback    = type;   // 'correct' | 'wrong'
    _termFeedbackMsg = msg;
    drawVRTerminal();
}

export function advanceVRChallenge(npcData) {
    _termNPC       = npcData;
    const idx      = npcData.currentChallenge || 0;
    _termChallenge = npcData.challenges[idx];
    _termInput     = '';
    _termFeedback  = '';
    _termFeedbackMsg = '';
    _termAttempts  = 0;
    _termShowHint  = false;
    drawVRTerminal();
}

// ── KEYBOARD LAYOUT ───────────────────────────────────────────────────────────
const KB_ROWS = [
    ['1','2','3','4','5','6','7','8','9','0','(',')',':'],
    ['q','w','e','r','t','y','u','i','o','p','[',']'],
    ['a','s','d','f','g','h','j','k','l',"'",'=','_'],
    ['z','x','c','v','b','n','m',',',' .','+','-'],
    ['SPACE','⌫','CLEAR'],
];

function drawVRTerminal() {
    const { ctx, canvasW: W, canvasH: H, tex } = vrTerm;
    ctx.clearRect(0, 0, W, H);
    vrTerm.buttons = {};

    // background
    roundRect(ctx, 2, 2, W-4, H-4, 14);
    ctx.fillStyle = C.bg; ctx.fill();
    ctx.strokeStyle = C.border; ctx.lineWidth = 3; ctx.stroke();
    roundRect(ctx, 10, 10, W-20, H-20, 10);
    ctx.strokeStyle = C.borderDim; ctx.lineWidth = 1; ctx.stroke();

    // ── header bar ──
    ctx.fillStyle = 'rgba(0,245,255,0.07)';
    ctx.fillRect(3, 3, W-6, 54);
    ctx.fillStyle = C.cyan;
    ctx.font = `bold 16px ${C.font}`;
    ctx.textAlign = 'left';
    ctx.shadowColor = C.cyan; ctx.shadowBlur = 6;
    ctx.fillText('  ' + (_termNPC?.ability || '').toLowerCase() + '_challenge.py', 20, 34);
    ctx.shadowBlur = 0;

    // close button top-right
    drawButton(ctx, vrTerm, 'close', W-68, 8, 56, 38, '✕', C.btnRed, C.red);

    const idx   = _termNPC?.currentChallenge || 0;
    const total = _termNPC?.challenges?.length || 5;
    const xp    = _termChallenge?.xp || 0;
    ctx.fillStyle = C.dim;
    ctx.font = `13px ${C.font}`;
    ctx.textAlign = 'right';
    ctx.fillText(`Challenge ${idx+1}/${total}  ·  +${xp} XP  ·  Attempts: ${_termAttempts}`, W-20, 34);

    // ── challenge text ──
    let cy = 72;
    ctx.fillStyle = 'rgba(0,245,255,0.05)';
    ctx.fillRect(16, cy, W-32, 140);
    ctx.strokeStyle = C.borderDim; ctx.lineWidth = 1;
    ctx.strokeRect(16, cy, W-32, 140);

    ctx.fillStyle = C.white;
    ctx.font = `14px ${C.font}`;
    ctx.textAlign = 'left';
    const challengeLines = (_termChallenge?.challenge || '').split('\n');
    challengeLines.forEach((line, i) => {
        ctx.fillText(line, 28, cy + 22 + i * 19);
    });
    cy += 150;

    // ── input area ──
    ctx.fillStyle = 'rgba(0,20,40,0.9)';
    roundRect(ctx, 16, cy, W-32, 52, 6);
    ctx.fill();
    ctx.strokeStyle = _termFeedback === 'correct' ? C.green : _termFeedback === 'wrong' ? C.red : C.border;
    ctx.lineWidth = 2; ctx.stroke();

    ctx.fillStyle = C.dim;
    ctx.font = `14px ${C.font}`;
    ctx.fillText('>', 30, cy + 33);
    ctx.fillStyle = C.green;
    ctx.font = `bold 17px ${C.font}`;
    ctx.fillText(_termInput + (_termInput.length < 40 ? '█' : ''), 50, cy + 33);
    cy += 62;

    // ── feedback ──
    if (_termFeedback) {
        const fbColor = _termFeedback === 'correct' ? C.green : C.red;
        const fbIcon  = _termFeedback === 'correct' ? '✓' : '✗';
        ctx.fillStyle = _termFeedback === 'correct' ? 'rgba(0,80,30,0.6)' : 'rgba(80,0,20,0.6)';
        roundRect(ctx, 16, cy, W-32, 36, 6);
        ctx.fill();
        ctx.fillStyle = fbColor;
        ctx.font = `bold 14px ${C.font}`;
        ctx.textAlign = 'left';
        ctx.fillText(`${fbIcon}  ${_termFeedbackMsg}`, 28, cy + 24);
        cy += 44;
    }

    // ── hint ──
    if (_termShowHint && _termChallenge?.hint) {
        ctx.fillStyle = 'rgba(80,60,0,0.5)';
        roundRect(ctx, 16, cy, W-32, 36, 6);
        ctx.fill();
        ctx.fillStyle = C.yellow;
        ctx.font = `14px ${C.font}`;
        ctx.textAlign = 'left';
        ctx.fillText('💡  ' + _termChallenge.hint, 28, cy + 24);
        cy += 44;
    }

    // ── action buttons ──
    const bY = cy + 4;
    drawButton(ctx, vrTerm, 'submit', 16,      bY, 260, 46, '▶  Run Code',  C.btnGreen, C.green);
    drawButton(ctx, vrTerm, 'hint',   290,     bY, 200, 46, '💡 Hint',      C.btnBg,    C.yellow);
    cy = bY + 54;

    // ── keyboard ──
    const kbStartY = cy + 4;
    const keyH     = 52;
    const keyGap   = 5;

    KB_ROWS.forEach((row, ri) => {
        const rowY   = kbStartY + ri * (keyH + keyGap);
        const isLast = ri === KB_ROWS.length - 1;

        if (isLast) {
            // bottom row: SPACE wide, backspace, clear
            drawKey(ctx, vrTerm, 'SPACE', 16,     rowY, 400, keyH, 'SPACE');
            drawKey(ctx, vrTerm, '⌫',    425,    rowY, 200, keyH, '⌫  Del');
            drawKey(ctx, vrTerm, 'CLEAR', 634,    rowY, 250, keyH, '⊘ Clear');
        } else {
            const keyW = Math.floor((W - 32 - keyGap * (row.length - 1)) / row.length);
            row.forEach((key, ki) => {
                const kx = 16 + ki * (keyW + keyGap);
                drawKey(ctx, vrTerm, key, kx, rowY, keyW, keyH, key === ' ' ? '·' : key);
            });
        }
    });

    tex.needsUpdate = true;
}

function drawButton(ctx, panel, id, x, y, w, h, label, bgColor, textColor) {
    roundRect(ctx, x, y, w, h, 8);
    ctx.fillStyle = bgColor; ctx.fill();
    ctx.strokeStyle = textColor; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = textColor;
    ctx.font = `bold 16px ${C.font}`;
    ctx.textAlign = 'center';
    ctx.fillText(label, x + w/2, y + h/2 + 6);
    panel.buttons[id] = { x, y, w, h };
}

function drawKey(ctx, panel, id, x, y, w, h, label) {
    roundRect(ctx, x, y, w, h, 6);
    ctx.fillStyle = C.keyBg; ctx.fill();
    ctx.strokeStyle = 'rgba(0,245,255,0.25)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = C.white;
    ctx.font = `bold ${label.length > 3 ? 13 : 18}px ${C.font}`;
    ctx.textAlign = 'center';
    ctx.fillText(label, x + w/2, y + h/2 + 6);
    panel.buttons['key_' + id] = { x, y, w, h };
}

// ── RAYCASTING ────────────────────────────────────────────────────────────────
// Call this every frame with controller world position + direction.
// Returns { panel: 'npc'|'term', button: string } or null.

const _ray  = new THREE.Ray();
const _plane = new THREE.Plane();
const _hit  = new THREE.Vector3();
const _inv  = new THREE.Matrix4();

function hitTestPanel(panel, rayOrigin, rayDir) {
    if (!panel.mesh.visible) return null;

    // Build a plane from the panel's world normal (forward = -Z in local)
    const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(panel.mesh.quaternion);
    _plane.setFromNormalAndCoplanarPoint(normal, panel.mesh.position);

    _ray.set(rayOrigin, rayDir);
    if (!_ray.intersectPlane(_plane, _hit)) return null;

    // Convert hit to panel local space
    _inv.copy(panel.mesh.matrixWorld).invert();
    const local = _hit.clone().applyMatrix4(_inv);

    // Convert local (-0.5..0.5 range) to canvas pixels
    const px = (local.x + panel.worldW / 2) / panel.worldW * panel.canvasW;
    const py = (1 - (local.y + panel.worldH / 2) / panel.worldH) * panel.canvasH;

    for (const [id, rect] of Object.entries(panel.buttons)) {
        if (px >= rect.x && px <= rect.x + rect.w &&
            py >= rect.y && py <= rect.y + rect.h) {
            return id;
        }
    }
    return null;
}

export function vrRaycast(rayOrigin, rayDir) {
    const npcHit  = hitTestPanel(npcPanel, rayOrigin, rayDir);
    if (npcHit)  return { panel: 'npc',  button: npcHit };
    const termHit = hitTestPanel(vrTerm,  rayOrigin, rayDir);
    if (termHit) return { panel: 'term', button: termHit };
    return null;
}

// ── HANDLE KEY PRESS ──────────────────────────────────────────────────────────
// Called by main.js when a terminal key button is hit
export function handleVRKey(key) {
    if (key === '⌫' || key === 'BACKSPACE') {
        _termInput = _termInput.slice(0, -1);
    } else if (key === 'CLEAR') {
        _termInput = '';
    } else if (key === 'SPACE') {
        _termInput += ' ';
    } else if (key.startsWith('key_')) {
        // shouldn't happen — keys are looked up by their char directly
    } else {
        if (_termInput.length < 60) _termInput += key;
    }
    _termFeedback = '';
    drawVRTerminal();
}

export function getVRInput() { return _termInput; }
export function incrementVRAttempts() { _termAttempts++; drawVRTerminal(); }
export function showVRHint() { _termShowHint = true; drawVRTerminal(); }

// ── LASER POINTER ─────────────────────────────────────────────────────────────
// A thin red line from each controller showing where they're pointing
const laserMat = new THREE.LineBasicMaterial({ color: 0x00f5ff, transparent: true, opacity: 0.6 });
const laserGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, -3),
]);
export const laser1 = new THREE.Line(laserGeo.clone(), laserMat.clone());
export const laser2 = new THREE.Line(laserGeo.clone(), laserMat.clone());
laser1.visible = false;
laser2.visible = false;
scene.add(laser1);
scene.add(laser2);

export function setLasersVisible(v) {
    laser1.visible = v;
    laser2.visible = v;
}

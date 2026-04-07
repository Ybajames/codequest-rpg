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
// NPC panel: 1800×1020 canvas → 1.2m × 0.68m world (150 px/cm, sharp in VR)
export const npcPanel = makePanel(1800, 1020, 1.2, 0.68);
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

function drawNPCPanel(cursorX = -1, cursorY = -1) {
    const { ctx, canvasW: W, canvasH: H, tex } = npcPanel;
    ctx.clearRect(0, 0, W, H);

    // background
    roundRect(ctx, 6, 6, W-12, H-12, 36);
    ctx.fillStyle = C.bg; ctx.fill();
    ctx.strokeStyle = C.border; ctx.lineWidth = 9; ctx.stroke();

    roundRect(ctx, 30, 30, W-60, H-60, 24);
    ctx.strokeStyle = C.borderDim; ctx.lineWidth = 3; ctx.stroke();

    const done = _npcData && _npcData.completed && _npcData.completed.length >= (_npcData.challenges?.length || 5);

    // NPC name
    ctx.fillStyle = C.cyan;
    ctx.font = `bold 60px ${C.font}`;
    ctx.textAlign = 'center';
    ctx.shadowColor = C.cyan; ctx.shadowBlur = 24;
    ctx.fillText(_npcData?.name || '', W/2, 144);
    ctx.shadowBlur = 0;

    // divider
    ctx.strokeStyle = C.borderDim; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(90, 186); ctx.lineTo(W-90, 186); ctx.stroke();

    // lesson preview
    ctx.fillStyle = C.white;
    ctx.font = `45px ${C.font}`;
    ctx.textAlign = 'center';
    const lesson = (_npcData?.lesson || '').split('\n');
    lesson.forEach((line, i) => ctx.fillText(line, W/2, 270 + i * 66));

    npcPanel.buttons = {};
    if (done) {
        ctx.fillStyle = C.green;
        ctx.font = `bold 48px ${C.font}`;
        ctx.fillText('✓ ABILITY ALREADY UNLOCKED', W/2, 555);
        drawButton(ctx, npcPanel, 'close', W/2 - 300, 660, 600, 156, '✕  Close', C.btnRed, C.red, 48);
    } else {
        const idx   = _npcData?.currentChallenge || 0;
        const total = _npcData?.challenges?.length || 5;
        const xp    = _npcData?.challenges?.[idx]?.xp || 0;
        ctx.fillStyle = C.yellow;
        ctx.font = `42px ${C.font}`;
        ctx.fillText(`Challenge ${idx+1} of ${total}  ·  +${xp} XP`, W/2, 534);

        drawButton(ctx, npcPanel, 'start', W/2 - 360, 630, 720, 180, '▶  Start Challenge', C.btnBg, C.cyan, 54);
        drawButton(ctx, npcPanel, 'close', W/2 - 180, 834, 360, 108, '✕ Close', C.btnRed, C.red, 42);
    }

    // cursor dot
    if (cursorX >= 0) drawCursor(ctx, cursorX, cursorY);

    tex.needsUpdate = true;
}

// ── VR TERMINAL ───────────────────────────────────────────────────────────────
// VR Terminal: 2700×3300 canvas → 1.5m × 1.833m world (sharp in VR)
export const vrTerm = makePanel(2700, 3300, 1.5, 1.833);

let _termNPC       = null;
let _termChallenge = null;
let _termInput     = '';
let _termFeedback  = '';     // '' | 'correct' | 'wrong'
let _termFeedbackMsg = '';
let _termAttempts  = 0;
let _termShowHint  = false;
export let vrTermOpen = false;

// callbacks wired in by main.js
let _onVRSubmit = null;
let _onVRClose  = null;
export let onVRSubmit = null;
export let onVRClose  = null;
export function setVRCallbacks(submitFn, closeFn) {
    _onVRSubmit = submitFn;
    _onVRClose  = closeFn;
    onVRSubmit  = submitFn;
    onVRClose   = closeFn;
}
export function callVRSubmit() { if (_onVRSubmit) _onVRSubmit(); }
export function callVRClose()  { if (_onVRClose)  _onVRClose();  }

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
    const worldQuat = new THREE.Quaternion();
    camera.getWorldQuaternion(worldQuat);
    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(worldQuat);
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

function drawVRTerminal(cursorX = -1, cursorY = -1) {
    const { ctx, canvasW: W, canvasH: H, tex } = vrTerm;
    ctx.clearRect(0, 0, W, H);
    vrTerm.buttons = {};

    // background
    roundRect(ctx, 6, 6, W-12, H-12, 42);
    ctx.fillStyle = C.bg; ctx.fill();
    ctx.strokeStyle = C.border; ctx.lineWidth = 9; ctx.stroke();
    roundRect(ctx, 30, 30, W-60, H-60, 30);
    ctx.strokeStyle = C.borderDim; ctx.lineWidth = 3; ctx.stroke();

    // ── header bar ──
    ctx.fillStyle = 'rgba(0,245,255,0.07)';
    ctx.fillRect(6, 6, W-12, 162);
    ctx.fillStyle = C.cyan;
    ctx.font = `bold 48px ${C.font}`;
    ctx.textAlign = 'left';
    ctx.shadowColor = C.cyan; ctx.shadowBlur = 18;
    ctx.fillText('  ' + (_termNPC?.ability || '').toLowerCase() + '_challenge.py', 60, 102);
    ctx.shadowBlur = 0;

    // close button top-right
    drawButton(ctx, vrTerm, 'close', W-204, 24, 168, 114, '✕', C.btnRed, C.red, 54);

    const idx   = _termNPC?.currentChallenge || 0;
    const total = _termNPC?.challenges?.length || 5;
    const xp    = _termChallenge?.xp || 0;
    ctx.fillStyle = C.dim;
    ctx.font = `39px ${C.font}`;
    ctx.textAlign = 'right';
    ctx.fillText(`Challenge ${idx+1}/${total}  ·  +${xp} XP  ·  Attempts: ${_termAttempts}`, W-60, 102);

    // ── challenge text ──
    let cy = 216;
    ctx.fillStyle = 'rgba(0,245,255,0.05)';
    ctx.fillRect(48, cy, W-96, 420);
    ctx.strokeStyle = C.borderDim; ctx.lineWidth = 3;
    ctx.strokeRect(48, cy, W-96, 420);

    ctx.fillStyle = C.white;
    ctx.font = `42px ${C.font}`;
    ctx.textAlign = 'left';
    const challengeLines = (_termChallenge?.challenge || '').split('\n');
    challengeLines.forEach((line, i) => {
        ctx.fillText(line, 84, cy + 66 + i * 57);
    });
    cy += 438;

    // ── input area ──
    ctx.fillStyle = 'rgba(0,20,40,0.9)';
    roundRect(ctx, 48, cy, W-96, 156, 18);
    ctx.fill();
    ctx.strokeStyle = _termFeedback === 'correct' ? C.green : _termFeedback === 'wrong' ? C.red : C.border;
    ctx.lineWidth = 6; ctx.stroke();

    ctx.fillStyle = C.dim;
    ctx.font = `51px ${C.font}`;
    ctx.fillText('>', 90, cy + 99);
    ctx.fillStyle = C.green;
    ctx.font = `bold 51px ${C.font}`;
    ctx.fillText(_termInput + '█', 150, cy + 99);
    cy += 174;

    // ── feedback ──
    if (_termFeedback) {
        const fbColor = _termFeedback === 'correct' ? C.green : C.red;
        const fbIcon  = _termFeedback === 'correct' ? '✓' : '✗';
        ctx.fillStyle = _termFeedback === 'correct' ? 'rgba(0,80,30,0.6)' : 'rgba(80,0,20,0.6)';
        roundRect(ctx, 48, cy, W-96, 108, 18);
        ctx.fill();
        ctx.fillStyle = fbColor;
        ctx.font = `bold 42px ${C.font}`;
        ctx.textAlign = 'left';
        ctx.fillText(`${fbIcon}  ${_termFeedbackMsg}`, 84, cy + 72);
        cy += 126;
    }

    // ── hint ──
    if (_termShowHint && _termChallenge?.hint) {
        ctx.fillStyle = 'rgba(80,60,0,0.5)';
        roundRect(ctx, 48, cy, W-96, 108, 18);
        ctx.fill();
        ctx.fillStyle = C.yellow;
        ctx.font = `42px ${C.font}`;
        ctx.textAlign = 'left';
        ctx.fillText('💡  ' + _termChallenge.hint, 84, cy + 72);
        cy += 126;
    }

    // ── action buttons ──
    const bY = cy + 12;
    drawButton(ctx, vrTerm, 'submit', 48,       bY, 780,  138, '▶  Run Code', C.btnGreen, C.green, 48);
    drawButton(ctx, vrTerm, 'hint',   858,      bY, 600,  138, '💡 Hint',     C.btnBg,    C.yellow, 48);
    cy = bY + 162;

    // ── keyboard ──
    const kbStartY = cy + 12;
    const keyH     = 156;
    const keyGap   = 15;

    KB_ROWS.forEach((row, ri) => {
        const rowY   = kbStartY + ri * (keyH + keyGap);
        const isLast = ri === KB_ROWS.length - 1;

        if (isLast) {
            drawKey(ctx, vrTerm, 'SPACE', 48,    rowY, 1200, keyH, 'SPACE');
            drawKey(ctx, vrTerm, '⌫',    1278,  rowY, 600,  keyH, '⌫  Del');
            drawKey(ctx, vrTerm, 'CLEAR', 1902,  rowY, 750,  keyH, '⊘ Clear');
        } else {
            const keyW = Math.floor((W - 96 - keyGap * (row.length - 1)) / row.length);
            row.forEach((key, ki) => {
                const kx = 48 + ki * (keyW + keyGap);
                drawKey(ctx, vrTerm, key, kx, rowY, keyW, keyH, key === ' ' ? '·' : key);
            });
        }
    });

    // cursor dot
    if (cursorX >= 0) drawCursor(ctx, cursorX, cursorY);

    tex.needsUpdate = true;
}

function drawButton(ctx, panel, id, x, y, w, h, label, bgColor, textColor, fontSize = 48) {
    roundRect(ctx, x, y, w, h, 24);
    ctx.fillStyle = bgColor; ctx.fill();
    ctx.strokeStyle = textColor; ctx.lineWidth = 6; ctx.stroke();
    ctx.fillStyle = textColor;
    ctx.font = `bold ${fontSize}px ${C.font}`;
    ctx.textAlign = 'center';
    ctx.fillText(label, x + w/2, y + h/2 + fontSize * 0.36);
    panel.buttons[id] = { x, y, w, h };
}

function drawKey(ctx, panel, id, x, y, w, h, label) {
    roundRect(ctx, x, y, w, h, 18);
    ctx.fillStyle = C.keyBg; ctx.fill();
    ctx.strokeStyle = 'rgba(0,245,255,0.3)'; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = C.white;
    const fs = label.length > 3 ? 39 : 54;
    ctx.font = `bold ${fs}px ${C.font}`;
    ctx.textAlign = 'center';
    ctx.fillText(label, x + w/2, y + h/2 + fs * 0.36);
    panel.buttons['key_' + id] = { x, y, w, h };
}

// ── CURSOR DOT ───────────────────────────────────────────────────────────────
function drawCursor(ctx, px, py) {
    // outer glow ring
    ctx.beginPath();
    ctx.arc(px, py, 28, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0,245,255,0.4)';
    ctx.lineWidth = 6;
    ctx.stroke();
    // inner solid dot
    ctx.beginPath();
    ctx.arc(px, py, 14, 0, Math.PI * 2);
    ctx.fillStyle = '#00f5ff';
    ctx.fill();
}

// ── RAYCASTING ────────────────────────────────────────────────────────────────
// Returns { panel, button, px, py } or null
// px/py are canvas pixel coords of the hit point (for cursor drawing)

const _ray   = new THREE.Ray();
const _plane = new THREE.Plane();
const _hit   = new THREE.Vector3();
const _inv   = new THREE.Matrix4();

function hitTestPanel(panel, rayOrigin, rayDir) {
    if (!panel.mesh.visible) return null;

    panel.mesh.updateWorldMatrix(true, false);
    const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(panel.mesh.quaternion);
    _plane.setFromNormalAndCoplanarPoint(normal, panel.mesh.position);

    _ray.set(rayOrigin, rayDir);
    if (!_ray.intersectPlane(_plane, _hit)) return null;

    // reject if hit is behind the ray
    if (_hit.clone().sub(rayOrigin).dot(rayDir) < 0) return null;

    _inv.copy(panel.mesh.matrixWorld).invert();
    const local = _hit.clone().applyMatrix4(_inv);

    // local coords are in [-worldW/2, worldW/2] range — convert to [0, canvasW]
    const px = (local.x / panel.worldW + 0.5) * panel.canvasW;
    const py = (0.5 - local.y / panel.worldH) * panel.canvasH;

    // must be within canvas bounds
    if (px < 0 || px > panel.canvasW || py < 0 || py > panel.canvasH) return null;

    let hitButton = null;
    for (const [id, rect] of Object.entries(panel.buttons)) {
        if (px >= rect.x && px <= rect.x + rect.w &&
            py >= rect.y && py <= rect.y + rect.h) {
            hitButton = id;
            break;
        }
    }
    return { button: hitButton, px, py };
}

export function vrRaycast(rayOrigin, rayDir) {
    const npcResult  = hitTestPanel(npcPanel, rayOrigin, rayDir);
    if (npcResult)  return { panel: 'npc',  button: npcResult.button, px: npcResult.px, py: npcResult.py };
    const termResult = hitTestPanel(vrTerm,  rayOrigin, rayDir);
    if (termResult) return { panel: 'term', button: termResult.button, px: termResult.px, py: termResult.py };
    return null;
}

// Track which panel had a cursor last frame so we can clear it
let _lastCursorPanel = null;

// Called every frame from main.js — pass BOTH controller rays
// Whichever one is hitting a panel wins; if neither, clear the cursor
export function updateVRCursor(ray1Origin, ray1Dir, ray2Origin, ray2Dir) {
    // Try controller 1 first, then controller 2
    let result = hitTestPanel(npcPanel, ray1Origin, ray1Dir)
              || hitTestPanel(vrTerm,   ray1Origin, ray1Dir)
              || (ray2Origin && (hitTestPanel(npcPanel, ray2Origin, ray2Dir)
                              || hitTestPanel(vrTerm,   ray2Origin, ray2Dir)));

    if (result) {
        // figure out which panel was hit
        const npcResult  = hitTestPanel(npcPanel, ray1Origin, ray1Dir)
                        || (ray2Origin && hitTestPanel(npcPanel, ray2Origin, ray2Dir));
        const termResult = !npcResult && (hitTestPanel(vrTerm, ray1Origin, ray1Dir)
                        || (ray2Origin && hitTestPanel(vrTerm, ray2Origin, ray2Dir)));

        if (npcResult)  { drawNPCPanel(npcResult.px, npcResult.py);    _lastCursorPanel = 'npc';  return; }
        if (termResult) { drawVRTerminal(termResult.px, termResult.py); _lastCursorPanel = 'term'; return; }
    }

    // No hit — clear cursor on whichever panel had it last frame
    if (_lastCursorPanel === 'npc')  { drawNPCPanel();    _lastCursorPanel = null; }
    if (_lastCursorPanel === 'term') { drawVRTerminal();   _lastCursorPanel = null; }
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
export function getVRAttempts() { return _termAttempts; }
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

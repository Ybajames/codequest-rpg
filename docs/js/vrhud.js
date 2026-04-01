// vrhud.js — 3D floating HUD for VR mode
// Attaches to camera so it always faces the player
// Shows: status text, quest button, interact prompt

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160/build/three.module.js';
import { camera, scene } from './state.js';

// ── CANVAS TEXTURE HELPER ─────────────────────────────────────────────────────
function makeTextPanel(width, height, bgColor, borderColor) {
    const canvas  = document.createElement('canvas');
    canvas.width  = width;
    canvas.height = height;
    const ctx     = canvas.getContext('2d');
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = borderColor;
    ctx.lineWidth   = 4;
    ctx.strokeRect(2, 2, width-4, height-4);
    return { canvas, ctx };
}

// ── STATUS PANEL — top left of VR view ───────────────────────────────────────
const STATUS_W = 512, STATUS_H = 256;
const statusCanvas = document.createElement('canvas');
statusCanvas.width  = STATUS_W;
statusCanvas.height = STATUS_H;
const statusCtx = statusCanvas.getContext('2d');
const statusTex = new THREE.CanvasTexture(statusCanvas);

const statusMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(0.5, 0.25),
    new THREE.MeshBasicMaterial({ map: statusTex, transparent: true, depthTest: false })
);
statusMesh.renderOrder = 999;
statusMesh.visible = false;
camera.add(statusMesh);
// Position: top-left, 1.2m in front
statusMesh.position.set(-0.38, 0.22, -1.2);

// ── INTERACT PROMPT — centre bottom ──────────────────────────────────────────
const promptCanvas = document.createElement('canvas');
promptCanvas.width  = 512;
promptCanvas.height = 128;
const promptCtx = promptCanvas.getContext('2d');
const promptTex = new THREE.CanvasTexture(promptCanvas);

const promptMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(0.45, 0.11),
    new THREE.MeshBasicMaterial({ map: promptTex, transparent: true, depthTest: false })
);
promptMesh.renderOrder = 999;
promptMesh.visible = false;
camera.add(promptMesh);
promptMesh.position.set(0, -0.28, -1.2);

// ── DRAW FUNCTIONS ────────────────────────────────────────────────────────────
export function updateVRStatus(levelText, xpText, lessonMsg) {
    const ctx = statusCtx;
    ctx.clearRect(0, 0, STATUS_W, STATUS_H);
    // background
    ctx.fillStyle = 'rgba(0,8,20,0.88)';
    ctx.fillRect(0, 0, STATUS_W, STATUS_H);
    ctx.strokeStyle = 'rgba(0,245,255,0.6)';
    ctx.lineWidth = 3;
    ctx.strokeRect(2, 2, STATUS_W-4, STATUS_H-4);

    // level
    ctx.fillStyle = '#00f5ff';
    ctx.font = 'bold 28px monospace';
    ctx.fillText(levelText, 20, 42);

    // xp
    ctx.fillStyle = 'rgba(0,245,255,0.5)';
    ctx.font = '20px monospace';
    ctx.fillText(xpText, 20, 72);

    // divider
    ctx.strokeStyle = 'rgba(0,245,255,0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(10, 85); ctx.lineTo(STATUS_W-10, 85); ctx.stroke();

    // lesson/status text — word wrap
    ctx.fillStyle = '#e0faff';
    ctx.font = '22px monospace';
    const words = lessonMsg.split('\n');
    let y = 118;
    words.forEach(line => {
        ctx.fillText(line, 20, y);
        y += 30;
    });

    statusTex.needsUpdate = true;
}

export function updateVRPrompt(msg) {
    const ctx = promptCtx;
    ctx.clearRect(0, 0, 512, 128);
    if (!msg) { promptMesh.visible = false; promptTex.needsUpdate = true; return; }
    promptMesh.visible = true;
    ctx.fillStyle = 'rgba(0,8,20,0.9)';
    ctx.fillRect(0, 0, 512, 128);
    ctx.strokeStyle = 'rgba(57,255,20,0.7)';
    ctx.lineWidth = 3;
    ctx.strokeRect(2, 2, 508, 124);
    ctx.fillStyle = '#39ff14';
    ctx.font = 'bold 26px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(msg, 256, 52);
    ctx.fillStyle = 'rgba(57,255,20,0.6)';
    ctx.font = '20px monospace';
    ctx.fillText('Pull RIGHT TRIGGER to interact', 256, 90);
    ctx.textAlign = 'left';
    promptTex.needsUpdate = true;
}

export function showVRHUD(show) {
    statusMesh.visible = show;
    // prompt visibility controlled by updateVRPrompt
    if (!show) promptMesh.visible = false;
}

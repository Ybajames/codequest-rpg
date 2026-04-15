// state.js — shared Three.js state, materials, constants
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160/build/three.module.js';

// ── RENDERER ──────────────────────────────────────────────────────────────────
export const renderer = new THREE.WebGLRenderer({
    canvas: document.getElementById('gameCanvas'),
    antialias: true,
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
renderer.xr.enabled        = true;

window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
});

// ── SCENE ─────────────────────────────────────────────────────────────────────
export const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.FogExp2(0x87ceeb, 0.008);

// ── CAMERA ────────────────────────────────────────────────────────────────────
export const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 600);
camera.position.set(0, 1.6, 0);

// ── ISLAND CONSTANTS ──────────────────────────────────────────────────────────
export const ISLAND_RADIUS = 55;
export const BEACH_WIDTH   = 8;
export const OCEAN_SIZE    = 800;

// ── MATERIALS ─────────────────────────────────────────────────────────────────
export const MAT = {
    ocean:     new THREE.MeshLambertMaterial({ color: 0x0277bd, transparent: true, opacity: 0.85 }),
    shallows:  new THREE.MeshLambertMaterial({ color: 0x29b6f6, transparent: true, opacity: 0.6 }),
    path:      new THREE.MeshLambertMaterial({ color: 0x9e9e9e }),
    cloud:     new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.92 }),
    bird:      new THREE.MeshLambertMaterial({ color: 0x212121 }),
    sunSphere: new THREE.MeshBasicMaterial({ color: 0xffdd44 }),
};

// ── HELPERS ───────────────────────────────────────────────────────────────────
export function box(w, h, d, mat) {
    return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
}
export function addTo(parent, mesh, x, y, z) {
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
}

// ── PLAYER DATA ───────────────────────────────────────────────────────────────
export const playerData = { username: 'Explorer' };

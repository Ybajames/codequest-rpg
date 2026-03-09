// state.js — shared scene, camera, renderer, materials, constants
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160/build/three.module.js';

// renderer
export const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
document.body.appendChild(renderer.domElement);

// scene
export const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.FogExp2(0x87ceeb, 0.008);

// camera
export const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 600);

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// world size constants
export const ISLAND_RADIUS   = 55;
export const BOUNDARY_RADIUS = 48;
export const OCEAN_SIZE      = 800;
export const BEACH_WIDTH     = 10;

// all materials in one place
export const MAT = {
    grass:      new THREE.MeshLambertMaterial({ color: 0x4caf50 }),
    grassAlt:   new THREE.MeshLambertMaterial({ color: 0x43a047 }),
    path:       new THREE.MeshLambertMaterial({ color: 0xd2b48c }),
    wood:       new THREE.MeshLambertMaterial({ color: 0x6d4c41 }),
    leaves:     new THREE.MeshLambertMaterial({ color: 0x2e7d32 }),
    leavesAlt:  new THREE.MeshLambertMaterial({ color: 0x388e3c }),
    stone:      new THREE.MeshLambertMaterial({ color: 0x90a4ae }),
    sand:       new THREE.MeshLambertMaterial({ color: 0xf5deb3 }),
    sandAlt:    new THREE.MeshLambertMaterial({ color: 0xfae0a0 }),
    ocean:      new THREE.MeshLambertMaterial({ color: 0x1a6fa8, transparent: true, opacity: 0.88 }),
    shallows:   new THREE.MeshLambertMaterial({ color: 0x4db6e8, transparent: true, opacity: 0.75 }),
    water:      new THREE.MeshLambertMaterial({ color: 0x1565c0, transparent: true, opacity: 0.8 }),
    sunSphere:  new THREE.MeshBasicMaterial({ color: 0xffdd44 }),
    cloud:      new THREE.MeshLambertMaterial({ color: 0xffffff }),
    bird:       new THREE.MeshBasicMaterial({ color: 0x222222 }),
    playerBody: new THREE.MeshLambertMaterial({ color: 0x1565c0 }),
    playerHead: new THREE.MeshLambertMaterial({ color: 0xffcc99 }),
    playerArm:  new THREE.MeshLambertMaterial({ color: 0x1565c0 }),
    playerLeg:  new THREE.MeshLambertMaterial({ color: 0x263238 }),
    playerEye:  new THREE.MeshLambertMaterial({ color: 0x111111 }),
    playerShoe: new THREE.MeshLambertMaterial({ color: 0x212121 }),
    bugBody:    new THREE.MeshLambertMaterial({ color: 0xb71c1c }),
    bugEye:     new THREE.MeshLambertMaterial({ color: 0xff1744 }),
    bugLeg:     new THREE.MeshLambertMaterial({ color: 0x880e4f }),
};

// shared mesh helpers
export function box(w, h, d, mat) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.castShadow = m.receiveShadow = true;
    return m;
}

export function addTo(parent, child, x = 0, y = 0, z = 0) {
    child.position.set(x, y, z);
    parent.add(child);
    return child;
}

// player username — set by username screen, readable anywhere
export const playerData = { username: 'Player' };

// world.js — realistic island terrain v2
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160/build/three.module.js';
import { scene, MAT, box, ISLAND_RADIUS, BEACH_WIDTH, OCEAN_SIZE } from './state.js';
import { addCollider } from './collision.js';

// ── LIGHTING ──────────────────────────────────────────────────────────────────
export const ambientLight = new THREE.AmbientLight(0xffeedd, 0.4);
scene.add(ambientLight);

export const sunLight = new THREE.DirectionalLight(0xfffbe0, 1.4);
sunLight.position.set(80, 80, 0);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(2048, 2048);
sunLight.shadow.camera.near = 1;
sunLight.shadow.camera.far  = 400;
sunLight.shadow.camera.left = sunLight.shadow.camera.bottom = -80;
sunLight.shadow.camera.right = sunLight.shadow.camera.top   =  80;
sunLight.shadow.bias = -0.0005;
scene.add(sunLight);

export const hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x5a8a3a, 0.5);
scene.add(hemiLight);

// ── OCEAN — animated water ────────────────────────────────────────────────────
const oceanGeo  = new THREE.PlaneGeometry(OCEAN_SIZE, OCEAN_SIZE, 8, 8);
export const oceanMesh = new THREE.Mesh(oceanGeo, MAT.ocean);
oceanMesh.rotation.x = -Math.PI / 2;
oceanMesh.position.y = -0.5;
scene.add(oceanMesh);

// shallow water ring
const shallowRing = new THREE.Mesh(
    new THREE.RingGeometry(ISLAND_RADIUS - 1, ISLAND_RADIUS + 10, 64),
    MAT.shallows
);
shallowRing.rotation.x = -Math.PI / 2;
shallowRing.position.y = -0.28;
scene.add(shallowRing);

// ── TERRAIN — displaced PlaneGeometry with vertex colors ──────────────────────
const T_SEGS = 80;
const T_SIZE = ISLAND_RADIUS * 2 + 4;
const terrGeo = new THREE.PlaneGeometry(T_SIZE, T_SIZE, T_SEGS, T_SEGS);

const tPos    = terrGeo.attributes.position;
const tColors = new Float32Array(tPos.count * 3);

// simple noise helper
function noise(x, z) {
    return Math.sin(x * 0.18) * Math.cos(z * 0.14) * 0.6
         + Math.sin(x * 0.32 + 1.2) * Math.sin(z * 0.28) * 0.35
         + Math.cos(x * 0.09 + z * 0.11) * 0.25;
}

// ── EXPORTED HEIGHT SAMPLER ───────────────────────────────────────────────────
// Returns the terrain Y at any world (x, z). Used by main.js to keep
// the player standing on the surface instead of floating at y=0.
export function getTerrainHeight(wx, wz) {
    const dist = Math.sqrt(wx * wx + wz * wz);
    if (dist >= ISLAND_RADIUS) return 0;
    const islandT = Math.max(0, 1 - dist / ISLAND_RADIUS);
    const hillH   = Math.pow(islandT, 1.8) * 6;
    const noiseH  = noise(wx, wz) * islandT * 2.2;
    return hillH + noiseH;
}

for (let i = 0; i < tPos.count; i++) {
    // PlaneGeometry is in XY before rotation — X stays X, Y becomes Z after -PI/2
    const wx = tPos.getX(i);
    const wz = tPos.getY(i);
    const dist = Math.sqrt(wx*wx + wz*wz);

    // island shape — smooth falloff from centre
    const islandT = Math.max(0, 1 - dist / ISLAND_RADIUS);
    const hillH   = Math.pow(islandT, 1.8) * 6; // gentle max hill ~6 units at edge
    const noiseH  = noise(wx, wz) * islandT * 2.2;
    const h       = dist < ISLAND_RADIUS ? hillH + noiseH : 0;

    tPos.setZ(i, h); // Z in flat plane becomes Y after rotateX(-PI/2)

    // vertex colors: beach → grass → rock → peak
    const t = Math.min(1, h / 6);
    let r, g, b;
    if (dist > ISLAND_RADIUS - BEACH_WIDTH) {
        // sand beach
        r = 0.92; g = 0.84; b = 0.62;
    } else if (t < 0.25) {
        // bright grass
        r = 0.30; g = 0.58; b = 0.22;
    } else if (t < 0.55) {
        // mid grass / slightly rocky
        const f = (t - 0.25) / 0.30;
        r = 0.30 + f*0.18; g = 0.58 - f*0.12; b = 0.22 - f*0.06;
    } else if (t < 0.80) {
        // rock
        const f = (t - 0.55) / 0.25;
        r = 0.48 + f*0.18; g = 0.46 + f*0.12; b = 0.38 + f*0.12;
    } else {
        // peak rock
        r = 0.62; g = 0.58; b = 0.52;
    }
    tColors[i*3]   = r;
    tColors[i*3+1] = g;
    tColors[i*3+2] = b;
}

tPos.needsUpdate = true;
terrGeo.setAttribute('color', new THREE.BufferAttribute(tColors, 3));
terrGeo.rotateX(-Math.PI / 2);
terrGeo.computeVertexNormals();

const terrMat  = new THREE.MeshLambertMaterial({ vertexColors: true });
const terrMesh = new THREE.Mesh(terrGeo, terrMat);
terrMesh.receiveShadow = true;
scene.add(terrMesh);

// ── CENTRAL STONE PLAZA ───────────────────────────────────────────────────────
for (let x = -8; x <= 8; x += 2) {
    for (let z = -8; z <= 8; z += 2) {
        const p = box(2, 0.15, 2, MAT.path);
        p.position.set(x, 0.08, z);
        scene.add(p);
    }
}

// ── STONE OUTCROPS ────────────────────────────────────────────────────────────
const rockMat = new THREE.MeshLambertMaterial({ color: 0x7a8a8a });
[[22, 12], [-26, 18], [28, -22], [-18, -28]].forEach(([x, z]) => {
    const h1 = 0.8 + Math.random() * 0.8;
    const r1 = new THREE.Mesh(new THREE.DodecahedronGeometry(h1, 0), rockMat);
    r1.position.set(x, h1*0.4, z);
    r1.rotation.y = Math.random() * Math.PI;
    r1.scale.y = 0.7;
    scene.add(r1);
    const r2 = new THREE.Mesh(new THREE.DodecahedronGeometry(h1*0.65, 0), rockMat);
    r2.position.set(x+1.2, h1*0.3, z-0.8);
    r2.rotation.y = Math.random() * Math.PI;
    r2.scale.y = 0.65;
    scene.add(r2);
    addCollider(x, z, 2.0);
});

// ── FLOWERS ───────────────────────────────────────────────────────────────────
const flowerColors = [0xff5252, 0xff9800, 0xffeb3b, 0xe91e63, 0xce93d8, 0x64ffda];
for (let i = 0; i < 80; i++) {
    const ang = Math.random() * Math.PI * 2;
    const r   = 10 + Math.random() * 30;
    const fx  = Math.cos(ang) * r;
    const fz  = Math.sin(ang) * r;
    if (Math.sqrt(fx*fx+fz*fz) > ISLAND_RADIUS - BEACH_WIDTH - 2) continue;
    if (Math.abs(fx) < 10 && Math.abs(fz) < 10) continue;

    const stemGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.5, 5);
    const stem    = new THREE.Mesh(stemGeo, new THREE.MeshLambertMaterial({ color: 0x558b2f }));
    stem.position.set(fx, 0.25, fz);
    scene.add(stem);

    const headGeo = new THREE.SphereGeometry(0.18, 6, 4);
    const head    = new THREE.Mesh(headGeo, new THREE.MeshLambertMaterial({
        color: flowerColors[i % flowerColors.length],
        emissive: flowerColors[i % flowerColors.length],
        emissiveIntensity: 0.08,
    }));
    head.position.set(fx, 0.62, fz);
    scene.add(head);
}

// ── LANTERN POSTS ─────────────────────────────────────────────────────────────
[[-6,-6],[6,-6],[-6,6],[6,6]].forEach(([x, z]) => {
    const poleGeo = new THREE.CylinderGeometry(0.08, 0.10, 3.2, 8);
    const pole    = new THREE.Mesh(poleGeo, new THREE.MeshLambertMaterial({ color: 0x37474f }));
    pole.position.set(x, 1.6, z);
    scene.add(pole);

    const lampGeo = new THREE.SphereGeometry(0.28, 8, 6);
    const lamp    = new THREE.Mesh(lampGeo, new THREE.MeshLambertMaterial({
        color: 0xffee88, emissive: 0xffcc00, emissiveIntensity: 1.2
    }));
    lamp.position.set(x, 3.3, z);
    scene.add(lamp);

    const pl = new THREE.PointLight(0xffcc44, 1.8, 12);
    pl.position.set(x, 3.3, z);
    scene.add(pl);
    addCollider(x, z, 0.4);
});

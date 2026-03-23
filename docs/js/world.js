// ─────────────────────────────────────────────────────────────────────────────
//  world.js
//  Builds everything that is part of the static island world:
//    - Lighting (sun directional light, ambient, hemisphere)
//    - Ocean plane
//    - Island ground + grass tiles
//    - Beach ring + shallow water ring
//    - Central plaza
//    - Pond + stone outcrops
//    - Flowers, fence, lantern posts
//  Does NOT include trees, clouds, sun sphere, birds — those are in environment.js
// ─────────────────────────────────────────────────────────────────────────────
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160/build/three.module.js';
import { scene, MAT, box, addTo, ISLAND_RADIUS, BEACH_WIDTH, OCEAN_SIZE } from './state.js';
import { addCollider } from './collision.js';

// ── LIGHTING ──────────────────────────────────────────────────────────────────
// We export sun and hemi so main.js can animate them in the game loop
export const ambientLight = new THREE.AmbientLight(0xffeedd, 0.5);
scene.add(ambientLight);

// The main sun — moves across the sky, casts shadows
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

// Hemisphere light — sky blue from above, green from ground — natural outdoor feel
export const hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x5a8a3a, 0.5);
scene.add(hemiLight);

// ── OCEAN ─────────────────────────────────────────────────────────────────────
// One giant flat plane — so large the edge is never visible
const oceanMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(OCEAN_SIZE, OCEAN_SIZE, 4, 4),
    MAT.ocean
);
oceanMesh.rotation.x = -Math.PI / 2;
oceanMesh.position.y = -0.5; // just below island ground level
oceanMesh.receiveShadow = true;
scene.add(oceanMesh);

// ── ISLAND GROUND ─────────────────────────────────────────────────────────────
// Circular disc — the base green layer
const islandGround = new THREE.Mesh(
    new THREE.CircleGeometry(ISLAND_RADIUS, 64),
    MAT.grass
);
islandGround.rotation.x = -Math.PI / 2;
islandGround.receiveShadow = true;
scene.add(islandGround);

// Alternating grass tiles — checkerboard pattern, only inside the grass zone
for (let x = -ISLAND_RADIUS; x < ISLAND_RADIUS; x += 2) {
    for (let z = -ISLAND_RADIUS; z < ISLAND_RADIUS; z += 2) {
        const d = Math.sqrt(x * x + z * z);
        if (d > ISLAND_RADIUS - BEACH_WIDTH - 2) continue;
        if ((Math.floor(x / 2) + Math.floor(z / 2)) % 2 === 0) {
            const t = box(2, 0.08, 2, MAT.grassAlt);
            t.position.set(x + 1, 0.04, z + 1);
            t.castShadow = false;
            scene.add(t);
        }
    }
}

// ── BEACH RING ────────────────────────────────────────────────────────────────
// Sand tiles around the outer edge of the island
for (let x = -ISLAND_RADIUS; x < ISLAND_RADIUS; x += 2) {
    for (let z = -ISLAND_RADIUS; z < ISLAND_RADIUS; z += 2) {
        const d = Math.sqrt(x * x + z * z);
        if (d >= ISLAND_RADIUS - BEACH_WIDTH && d < ISLAND_RADIUS) {
            const mat = (Math.floor(x / 2) + Math.floor(z / 2)) % 2 === 0 ? MAT.sand : MAT.sandAlt;
            const t = box(2, 0.1, 2, mat);
            t.position.set(x + 1, 0.05, z + 1);
            t.castShadow = false;
            scene.add(t);
        }
    }
}

// ── SHALLOW WATER RING ────────────────────────────────────────────────────────
// Lighter blue ring right at beach edge — looks like surf
const shallowRing = new THREE.Mesh(
    new THREE.RingGeometry(ISLAND_RADIUS - 1, ISLAND_RADIUS + 8, 64),
    MAT.shallows
);
shallowRing.rotation.x = -Math.PI / 2;
shallowRing.position.y = -0.3;
scene.add(shallowRing);

// ── CENTRAL PLAZA ─────────────────────────────────────────────────────────────
// Stone path tiles in a grid — this is where the NPCs stand
for (let x = -6; x <= 6; x += 2) {
    for (let z = -6; z <= 6; z += 2) {
        const p = box(2, 0.12, 2, MAT.path);
        p.position.set(x, 0.06, z);
        scene.add(p);
    }
}

// ── POND ──────────────────────────────────────────────────────────────────────
const pond = box(8, 0.3, 8, MAT.water);
pond.position.set(-30, 0.15, -30);
scene.add(pond);
addCollider(-30, -30, 5.5);

// ── STONE OUTCROPS ────────────────────────────────────────────────────────────
[[20, 10], [-24, 16], [26, -20]].forEach(([x, z]) => {
    const r  = box(2, 1, 2, MAT.stone);
    r.position.set(x, 0.5, z);
    scene.add(r);
    const r2 = box(1.5, 1.5, 1.5, MAT.stone);
    r2.position.set(x + 1.5, 0.75, z - 0.5);
    scene.add(r2);
    addCollider(x + 0.5, z - 0.2, 2.2);
});

// ── FLOWERS ───────────────────────────────────────────────────────────────────
const flowerColors = [0xff5252, 0xff9800, 0xffeb3b, 0xe91e63, 0xce93d8];
for (let i = 0; i < 60; i++) {
    const ang = Math.random() * Math.PI * 2;
    const r   = 8 + Math.random() * 28;
    const fx  = Math.cos(ang) * r;
    const fz  = Math.sin(ang) * r;
    if (Math.sqrt(fx * fx + fz * fz) > ISLAND_RADIUS - BEACH_WIDTH - 2) continue;
    if (Math.abs(fx) < 5 && Math.abs(fz) < 5) continue;

    const stem = box(0.1, 0.5, 0.1, new THREE.MeshLambertMaterial({ color: 0x66bb6a }));
    stem.position.set(fx, 0.25, fz);
    scene.add(stem);

    const head = box(0.35, 0.35, 0.35, new THREE.MeshLambertMaterial({ color: flowerColors[i % flowerColors.length] }));
    head.position.set(fx, 0.6, fz);
    scene.add(head);
}

// ── FENCE AROUND PLAZA ────────────────────────────────────────────────────────
const fenceMat = new THREE.MeshLambertMaterial({ color: 0x8d6e63 });
for (let x = -7; x <= 7; x += 2) {
    [-7, 7].forEach(z => {
        const p = box(0.2, 1.2, 0.2, fenceMat);
        p.position.set(x, 0.6, z);
        scene.add(p);
        addCollider(x, z, 0.4);
    });
}
for (let z = -7; z <= 7; z += 2) {
    [-7, 7].forEach(x => {
        const p = box(0.2, 1.2, 0.2, fenceMat);
        p.position.set(x, 0.6, z);
        scene.add(p);
        addCollider(x, z, 0.4);
    });
}

// ── LANTERN POSTS ─────────────────────────────────────────────────────────────
[[-5,-5],[5,-5],[-5,5],[5,5]].forEach(([x, z]) => {
    const pole = box(0.15, 3, 0.15, new THREE.MeshLambertMaterial({ color: 0x37474f }));
    pole.position.set(x, 1.5, z);
    scene.add(pole);

    const lamp = box(0.5, 0.5, 0.5, new THREE.MeshLambertMaterial({
        color: 0xffee88, emissive: 0xffcc00, emissiveIntensity: 0.8
    }));
    lamp.position.set(x, 3.2, z);
    scene.add(lamp);

    const light = new THREE.PointLight(0xffcc44, 1.5, 10);
    light.position.set(x, 3.2, z);
    scene.add(light);

    addCollider(x, z, 0.4);
});

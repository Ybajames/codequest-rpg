// ─────────────────────────────────────────────────────────────────────────────
//  environment.js
//  Everything that moves or is part of the natural environment:
//    - Trees (static, but have colliders)
//    - Sun sphere (visual ball in sky — animated in main.js)
//    - Clouds (drift across sky — animated in main.js)
//    - Birds (fly in circles — animated in main.js)
//
//  We export sunSphere, clouds, birds so main.js can animate them each frame.
// ─────────────────────────────────────────────────────────────────────────────
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160/build/three.module.js';
import { scene, MAT, box, ISLAND_RADIUS, BEACH_WIDTH } from './state.js';
import { addCollider } from './collision.js';

// ── TREES ─────────────────────────────────────────────────────────────────────
// Each tree is a group: trunk + 4 leaf layers
// We only place trees inside the grass zone — not on the beach
function makeTree(x, z, height = 4, variant = 0) {
    if (Math.sqrt(x * x + z * z) > ISLAND_RADIUS - BEACH_WIDTH - 1) return null;

    const g = new THREE.Group();
    g.position.set(x, 0, z);

    const trunk = box(0.6, height, 0.6, MAT.wood);
    trunk.position.y = height / 2;
    g.add(trunk);

    // 4 leaf layers — each one smaller and higher, gives a pyramid shape
    const leafMat = variant % 2 === 0 ? MAT.leaves : MAT.leavesAlt;
    [
        { w: 3.5, h: 1.2, y: height + 0.4 },
        { w: 2.8, h: 1.2, y: height + 1.4 },
        { w: 2.0, h: 1.2, y: height + 2.4 },
        { w: 1.2, h: 1.0, y: height + 3.2 },
    ].forEach(l => {
        const leaf = box(l.w, l.h, l.w, leafMat);
        leaf.position.y = l.y;
        g.add(leaf);
    });

    scene.add(g);
    addCollider(x, z, 0.8); // trunk collision radius
    return g;
}

// Spread trees around the island in clusters and scattered positions
const treePositions = [
    [-35,-35],[-33,-38],[-38,-33],[34,-35],[36,-38],[32,-33],
    [-35,34],[-33,36],[-38,32],[34,34],[36,32],[32,36],
    [-22,28],[-15,32],[5,36],[24,28],[-28,8],[-36,0],[-36,14],[-34,-8],
    [32,8],[36,-8],[36,14],[32,-22],[14,-32],[-7,-36],[-24,-28],
    [16,20],[-16,-20],[10,-24],[20,-10],[-20,10],[-10,20],[25,10],[-25,-10],
    [10,30],[-10,-30],[30,-10],[-30,10],[18,-18],[-18,18],[28,20],[-28,-20],
    [40,5],[-40,5],[40,-5],[-40,-5],[5,40],[-5,40],[5,-40],[-5,-40],
];
treePositions.forEach(([x, z], i) => makeTree(x, z, 3 + (i % 3), i));

// ── SUN SPHERE ────────────────────────────────────────────────────────────────
// A glowing yellow ball in the sky — purely visual, moves with the DirectionalLight
// We export it so main.js can move it each frame
export const sunSphere = new THREE.Mesh(
    new THREE.SphereGeometry(8, 16, 16),
    MAT.sunSphere
);
// Soft glow layer around the sun
sunSphere.add(new THREE.Mesh(
    new THREE.SphereGeometry(11, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xffee99, transparent: true, opacity: 0.25 })
));
scene.add(sunSphere);

// ── MOON SPHERE ───────────────────────────────────────────────────────────────
export const moonSphere = new THREE.Mesh(
    new THREE.SphereGeometry(5, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xddeeff })
);
// soft pale glow around moon
moonSphere.add(new THREE.Mesh(
    new THREE.SphereGeometry(7, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xaaccff, transparent: true, opacity: 0.15 })
));
moonSphere.visible = false;
scene.add(moonSphere);

// ── CLOUDS ────────────────────────────────────────────────────────────────────
// Each cloud = several white boxes overlapping — Minecraft-style fluffy
function makeCloud(x, y, z) {
    const g = new THREE.Group();
    g.position.set(x, y, z);

    [
        { w:10, h:4, d:6,  ox:0,  oy:0,   oz:0  },
        { w:7,  h:5, d:5,  ox:-5, oy:0.5, oz:1  },
        { w:7,  h:5, d:5,  ox:5,  oy:0.5, oz:-1 },
        { w:6,  h:3, d:4,  ox:2,  oy:2,   oz:0  },
        { w:5,  h:3, d:4,  ox:-3, oy:1.5, oz:-1 },
    ].forEach(p => {
        const c = box(p.w, p.h, p.d, MAT.cloud);
        c.castShadow = c.receiveShadow = false;
        c.position.set(p.ox, p.oy, p.oz);
        g.add(c);
    });

    scene.add(g);
    return g;
}

// 12 clouds spread across the sky — exported so main.js can drift them
export const clouds = [
    makeCloud(  0, 65,  -80), makeCloud( 60, 70,  -60), makeCloud(-60, 60,  -70),
    makeCloud( 90, 75,   20), makeCloud(-90, 68,   30), makeCloud( 40, 72,   90),
    makeCloud(-40, 62,   80), makeCloud(  0, 80, -130), makeCloud(120, 65,  -20),
    makeCloud(-110, 70, -50), makeCloud( 70, 60,   60), makeCloud(-70, 75,  -40),
];

// ── BIRDS ─────────────────────────────────────────────────────────────────────
// Simple V-shape from two wing boxes + tiny body
// Each bird has orbit data in userData so main.js can fly them
function makeBird(orbitRadius, height, speed, startAngle) {
    const g = new THREE.Group();

    // Left wing — tilted slightly upward like a gliding bird
    const wingL = box(2.2, 0.15, 0.5, MAT.bird);
    wingL.position.set(-1.1, 0, 0);
    wingL.rotation.z = 0.3;
    g.add(wingL);

    // Right wing
    const wingR = box(2.2, 0.15, 0.5, MAT.bird);
    wingR.position.set(1.1, 0, 0);
    wingR.rotation.z = -0.3;
    g.add(wingR);

    // Tiny body
    g.add(box(0.4, 0.2, 0.8, MAT.bird));

    scene.add(g);

    // Flight data stored on the object — read by main.js every frame
    g.userData = {
        orbitRadius,
        height,
        speed,
        angle: startAngle,
        flapTimer: Math.random() * Math.PI * 2 // random phase so they don't all flap together
    };

    return g;
}

// 8 birds — varied orbits and speeds so they look independent
export const birds = [
    makeBird(60, 45, 0.40, 0.0),
    makeBird(80, 52, 0.30, 1.0),
    makeBird(50, 48, 0.50, 2.1),
    makeBird(95, 40, 0.25, 3.5),
    makeBird(70, 58, 0.35, 0.8),
    makeBird(45, 50, 0.45, 4.2),
    makeBird(110,44, 0.20, 1.5),
    makeBird(65, 55, 0.38, 3.0),
];

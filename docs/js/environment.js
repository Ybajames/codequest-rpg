// environment.js — realistic trees, sun, moon, clouds, birds
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160/build/three.module.js';
import { scene, MAT, box, ISLAND_RADIUS, BEACH_WIDTH } from './state.js';
import { addCollider } from './collision.js';
import { getTerrainHeight } from './world.js';

// ── REALISTIC TREES ───────────────────────────────────────────────────────────
function makeTree(x, z, height = 4, variant = 0) {
    if (Math.sqrt(x*x+z*z) > ISLAND_RADIUS - BEACH_WIDTH - 1) return;
    const g = new THREE.Group();
    g.position.set(x, getTerrainHeight(x, z), z);

    // trunk — tapered cylinder
    const trunkGeo = new THREE.CylinderGeometry(
        height * 0.06, height * 0.10, height, 7
    );
    const trunkMat = new THREE.MeshLambertMaterial({
        color: variant % 3 === 0 ? 0x5d4037 : variant % 3 === 1 ? 0x6d4c41 : 0x4e342e
    });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = height / 2;
    trunk.castShadow = true;
    g.add(trunk);

    // canopy — 3 overlapping spheres for natural look
    const leafColor = variant % 2 === 0 ? 0x2e7d32 : 0x388e3c;
    const leafMat   = new THREE.MeshLambertMaterial({ color: leafColor });
    const leafDark  = new THREE.MeshLambertMaterial({ color: 0x1b5e20 });

    [
        { r: height * 0.52, y: height * 0.90, mat: leafMat },
        { r: height * 0.40, y: height * 1.15, mat: leafDark },
        { r: height * 0.30, y: height * 1.35, mat: leafMat },
    ].forEach(({ r, y, mat }) => {
        const geo  = new THREE.SphereGeometry(r, 8, 6);
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.y = y;
        mesh.scale.x    = 0.9 + Math.random() * 0.2;
        mesh.scale.z    = 0.9 + Math.random() * 0.2;
        mesh.castShadow = true;
        g.add(mesh);
    });

    g.rotation.y = Math.random() * Math.PI * 2;
    scene.add(g);
    addCollider(x, z, 0.8);
}

const PORTAL_POSITIONS = [{x:0,z:-32},{x:30,z:8},{x:-30,z:8}];
const NPC_POSITIONS    = [{x:-18,z:-12},{x:20,z:-14},{x:-20,z:16},{x:22,z:18},{x:-22,z:-20},{x:16,z:-22},{x:0,z:10}];
const MIN_CLEAR = 8; // minimum distance from portals/NPCs

const treePositions = [
    [-35,-35],[-33,-38],[-38,-33],[34,-35],[36,-38],[32,-33],
    [-35,34],[-33,36],[-38,32],[34,34],[36,32],[32,36],
    [-22,28],[-15,32],[5,36],[24,28],[-28,8],[-36,0],[-36,14],[-34,-8],
    [32,8],[36,-8],[36,14],[32,-22],[14,-32],[-7,-36],[-24,-28],
    [16,20],[-16,-20],[10,-24],[20,-10],[-20,10],[-10,20],[25,10],[-25,-10],
    [10,30],[-10,-30],[30,-10],[-30,10],[18,-18],[-18,18],[28,20],[-28,-20],
    [40,5],[-40,5],[40,-5],[-40,-5],[5,40],[-5,40],[5,-40],[-5,-40],
].filter(([x, z]) => {
    for (const p of PORTAL_POSITIONS) {
        if (Math.sqrt((x-p.x)**2 + (z-p.z)**2) < MIN_CLEAR) return false;
    }
    for (const n of NPC_POSITIONS) {
        if (Math.sqrt((x-n.x)**2 + (z-n.z)**2) < MIN_CLEAR) return false;
    }
    return true;
});
treePositions.forEach(([x, z], i) => makeTree(x, z, 3 + (i % 3), i));

// ── SUN ───────────────────────────────────────────────────────────────────────
export const sunSphere = new THREE.Mesh(
    new THREE.SphereGeometry(8, 16, 16),
    MAT.sunSphere
);
sunSphere.add(new THREE.Mesh(
    new THREE.SphereGeometry(11, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xffee99, transparent: true, opacity: 0.25 })
));
scene.add(sunSphere);

// ── MOON ──────────────────────────────────────────────────────────────────────
export const moonSphere = new THREE.Mesh(
    new THREE.SphereGeometry(5, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xddeeff })
);
moonSphere.add(new THREE.Mesh(
    new THREE.SphereGeometry(7, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xaaccff, transparent: true, opacity: 0.15 })
));
moonSphere.visible = false;
scene.add(moonSphere);

// ── CLOUDS ────────────────────────────────────────────────────────────────────
function makeCloud(x, y, z) {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    [
        { w:10, h:4,  d:6, ox:0,  oy:0,   oz:0  },
        { w:7,  h:5,  d:5, ox:-5, oy:0.5, oz:1  },
        { w:7,  h:5,  d:5, ox:5,  oy:0.5, oz:-1 },
        { w:6,  h:3,  d:4, ox:2,  oy:2,   oz:0  },
        { w:5,  h:3,  d:4, ox:-3, oy:1.5, oz:-1 },
    ].forEach(p => {
        const geo  = new THREE.SphereGeometry(Math.max(p.w, p.h, p.d) * 0.4, 7, 5);
        const mesh = new THREE.Mesh(geo, MAT.cloud);
        mesh.scale.set(p.w * 0.18, p.h * 0.18, p.d * 0.18);
        mesh.position.set(p.ox, p.oy, p.oz);
        g.add(mesh);
    });
    scene.add(g);
    return g;
}

export const clouds = [
    makeCloud(  0,65, -80), makeCloud( 60,70, -60), makeCloud(-60,60, -70),
    makeCloud( 90,75,  20), makeCloud(-90,68,  30), makeCloud( 40,72,  90),
    makeCloud(-40,62,  80), makeCloud(  0,80,-130), makeCloud(120,65, -20),
    makeCloud(-110,70,-50), makeCloud( 70,60,  60), makeCloud(-70,75, -40),
];

// ── BIRDS ─────────────────────────────────────────────────────────────────────
function makeBird(orbitRadius, height, speed, startAngle) {
    const g     = new THREE.Group();
    const wingL = box(2.2, 0.15, 0.5, MAT.bird);
    wingL.position.set(-1.1, 0, 0); wingL.rotation.z = 0.3; g.add(wingL);
    const wingR = box(2.2, 0.15, 0.5, MAT.bird);
    wingR.position.set( 1.1, 0, 0); wingR.rotation.z = -0.3; g.add(wingR);
    g.add(box(0.4, 0.2, 0.8, MAT.bird));
    scene.add(g);
    g.userData = { orbitRadius, height, speed, angle: startAngle, flapTimer: Math.random()*Math.PI*2 };
    return g;
}

export const birds = [
    makeBird(60,45,0.40,0.0), makeBird(80,52,0.30,1.0),
    makeBird(50,48,0.50,2.1), makeBird(95,40,0.25,3.5),
    makeBird(70,58,0.35,0.8), makeBird(45,50,0.45,4.2),
    makeBird(110,44,0.20,1.5),makeBird(65,55,0.38,3.0),
];

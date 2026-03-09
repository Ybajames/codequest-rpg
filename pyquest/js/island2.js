// island2.js — Mountain Island 2: real 3D terrain, proper geometry, polished
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160/build/three.module.js';
import { scene, box, addTo } from './state.js';
import { addCollider, removeCollider } from './collision.js';

// ── CONSTANTS ─────────────────────────────────────────────────────────────────
export const I2    = { x: 0, z: -200 };
const ix           = I2.x;
const iz           = I2.z;
const ISLAND_R     = 48;
const PEAK_H       = 22;

// ── HEIGHT FUNCTION — matches the displaced terrain mesh exactly ──────────────
export function getI2Height(x, z) {
    const dx   = x - ix;
    const dz   = z - iz;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist >= ISLAND_R) return 0;
    const t    = 1 - dist / ISLAND_R;
    const base = Math.pow(t, 1.1) * PEAK_H;
    // gentle surface ridges so it doesn't look like a perfect cone
    const ridge = (
        Math.sin(dx * 0.22) * Math.cos(dz * 0.18) +
        Math.cos(dx * 0.14) * Math.sin(dz * 0.28)
    ) * 0.55 * Math.pow(1 - t, 0.6);
    return Math.max(0, base + ridge);
}

// ── MATERIALS ─────────────────────────────────────────────────────────────────
const mRock      = new THREE.MeshLambertMaterial({ color: 0x2d3442 });
const mRockMid   = new THREE.MeshLambertMaterial({ color: 0x3d4f5c });
const mRockLight = new THREE.MeshLambertMaterial({ color: 0x5a6e7a });
const mSnow      = new THREE.MeshLambertMaterial({ color: 0xddeaf5 });
const mSnowBrt   = new THREE.MeshLambertMaterial({ color: 0xeef4ff });
const mPineTrunk = new THREE.MeshLambertMaterial({ color: 0x3b2412 });
const mPineLeaf  = new THREE.MeshLambertMaterial({ color: 0x1c3d1f });
const mPineSnow  = new THREE.MeshLambertMaterial({ color: 0xd8e8f8 });
const mSakTrunk  = new THREE.MeshLambertMaterial({ color: 0x4a2c17 });
const mBlossom   = new THREE.MeshLambertMaterial({ color: 0xf9aed4, emissive: 0xc06080, emissiveIntensity: 0.12 });
const mBlossDark = new THREE.MeshLambertMaterial({ color: 0xf07bae, emissive: 0xa04060, emissiveIntensity: 0.10 });
const mIce       = new THREE.MeshLambertMaterial({ color: 0xb8daee, transparent: true, opacity: 0.80 });
const mIceCrack  = new THREE.MeshLambertMaterial({ color: 0x8aaccc, transparent: true, opacity: 0.60 });
const mPath      = new THREE.MeshLambertMaterial({ color: 0x485566 });
const mPathEdge  = new THREE.MeshLambertMaterial({ color: 0x3a4455 });
const mBridge    = new THREE.MeshLambertMaterial({ color: 0x6b4f3a });
const mRail      = new THREE.MeshLambertMaterial({ color: 0x4a3728 });
const mGate      = new THREE.MeshLambertMaterial({ color: 0x28150a });
const mGateGlow  = new THREE.MeshLambertMaterial({ color: 0x1a0020, emissive: 0x6600cc, emissiveIntensity: 1.1 });
const mGateOpen  = new THREE.MeshLambertMaterial({ color: 0x081808, emissive: 0x00bb44, emissiveIntensity: 1.0 });
const mTorii     = new THREE.MeshLambertMaterial({ color: 0xaa1c1c });
const mShrineWall= new THREE.MeshLambertMaterial({ color: 0xfbf0e0 });
const mShrineRoof= new THREE.MeshLambertMaterial({ color: 0x2a3a2a });
const mLantern   = new THREE.MeshLambertMaterial({ color: 0xff6b35, emissive: 0xff3300, emissiveIntensity: 1.4 });
const mStone     = new THREE.MeshLambertMaterial({ color: 0x505d6a });
const mStoneLight= new THREE.MeshLambertMaterial({ color: 0x6a7888 });

// ── BRIDGE ────────────────────────────────────────────────────────────────────
const BZ_START = -54;
const BZ_END   = iz + ISLAND_R + 2;
const B_LEN    = Math.abs(BZ_END - BZ_START);
const B_CZ     = (BZ_START + BZ_END) / 2;

for (let i = 0; i < B_LEN; i += 1.4) {
    const plank = box(3.6, 0.22, 1.25, mBridge);
    plank.position.set(0, 0.12, BZ_START - i);
    scene.add(plank);
}
[-2.0, 2.0].forEach(ox => {
    const rail = box(0.15, 1.0, B_LEN, mRail);
    rail.position.set(ox, 0.74, B_CZ);
    scene.add(rail);
    for (let i = 0; i <= B_LEN; i += 3.5) {
        const post = box(0.18, 1.2, 0.18, mRail);
        post.position.set(ox, 0.6, BZ_START - i);
        scene.add(post);
    }
});
for (let i = 1; i <= 5; i++) {
    const az = BZ_START - (B_LEN / 6) * i;
    const beam = box(4.5, 0.38, 0.38, mRail);
    beam.position.set(0, -0.12, az);
    scene.add(beam);
    [-1.7, 1.7].forEach(ox => {
        const leg = box(0.26, 2.0, 0.26, mRail);
        leg.position.set(ox, -1.1, az);
        scene.add(leg);
    });
}

// ── GATE ──────────────────────────────────────────────────────────────────────
export const gateState = { open: false };
const GZ    = BZ_START - 3;
const gateG = new THREE.Group();
gateG.position.set(0, 0, GZ);
scene.add(gateG);

// pillars using CylinderGeometry for a cleaner look
const pillarGeo = new THREE.CylinderGeometry(0.55, 0.65, 5.5, 8);
const addPillar = (ox) => {
    const p = new THREE.Mesh(pillarGeo, mGate);
    p.position.set(ox, 2.75, 0);
    gateG.add(p);
};
addPillar(-2.4); addPillar(2.4);
addTo(gateG, box(7.2, 0.85, 0.85, mGate), 0, 5.65, 0);
addTo(gateG, box(6.4, 0.55, 0.65, mGate), 0, 4.95, 0);

export const gateDoorL = box(1.6, 4.2, 0.2, mGateGlow);
export const gateDoorR = box(1.6, 4.2, 0.2, mGateGlow);
gateDoorL.position.set(-0.9, 2.2, 0);
gateDoorR.position.set( 0.9, 2.2, 0);
gateG.add(gateDoorL); gateG.add(gateDoorR);

export const gateLock = new THREE.PointLight(0x8800ff, 2.5, 10);
gateLock.position.set(0, 3.5, 1);
gateG.add(gateLock);
addCollider(0, GZ, 2.6);

export function openGate() {
    if (gateState.open) return;
    gateState.open = true;
    gateDoorL.position.x = -3.1;
    gateDoorR.position.x =  3.1;
    gateDoorL.material = mGateOpen;
    gateDoorR.material = mGateOpen;
    gateLock.color.set(0x00ff88);
    gateLock.intensity = 1.5;
    removeCollider(0, GZ);
}

// ── ISLAND BASE CLIFF — rises from ocean, no floating ─────────────────────────
// tapered CylinderGeometry = wider at bottom, creates cliff silhouette
const cliffGeo = new THREE.CylinderGeometry(ISLAND_R + 0.5, ISLAND_R + 4, 6, 48, 1);
const cliff    = new THREE.Mesh(cliffGeo, mRock);
cliff.position.set(ix, -3.2, iz);
scene.add(cliff);

// rock shelf just at waterline
const shelfGeo = new THREE.CylinderGeometry(ISLAND_R + 2, ISLAND_R + 4, 0.6, 48);
const shelf    = new THREE.Mesh(shelfGeo, mRockMid);
shelf.position.set(ix, -0.4, iz);
scene.add(shelf);

// ── TERRAIN MESH — displaced PlaneGeometry with vertex colors ─────────────────
const T_SIZE = ISLAND_R * 2 + 6;
const T_SEGS = 90;
const terrGeo = new THREE.PlaneGeometry(T_SIZE, T_SIZE, T_SEGS, T_SEGS);
// Do NOT call rotateX before modifying vertices — in Three.js r160 rotateX
// locks the position buffer as read-only. Write heights first, rotate after.

const tPos    = terrGeo.attributes.position;
const tColors = new Float32Array(tPos.count * 3);

for (let i = 0; i < tPos.count; i++) {
    // PlaneGeometry is flat in XY before rotation — X=worldX, Y=worldZ after rotation
    const wx = tPos.getX(i) + ix;
    const wz = tPos.getY(i) + iz;
    const h  = getI2Height(wx, wz);
    tPos.setZ(i, h); // Z in flat plane becomes Y (height) after rotateX(-PI/2)

    const t = h / PEAK_H;
    let r, g, b;
    if (t < 0.18) {
        r = 0.18; g = 0.20; b = 0.26;
    } else if (t < 0.40) {
        const f = (t - 0.18) / 0.22;
        r = 0.18 + f*0.16; g = 0.20 + f*0.17; b = 0.26 + f*0.14;
    } else if (t < 0.62) {
        const f = (t - 0.40) / 0.22;
        r = 0.34 + f*0.22; g = 0.37 + f*0.22; b = 0.40 + f*0.22;
    } else if (t < 0.78) {
        const f = (t - 0.62) / 0.16;
        r = 0.56 + f*0.32; g = 0.59 + f*0.31; b = 0.62 + f*0.30;
    } else {
        const f = Math.min(1, (t - 0.78) / 0.14);
        r = 0.88 + f*0.07; g = 0.91 + f*0.05; b = 0.95 + f*0.04;
    }
    tColors[i*3] = r; tColors[i*3+1] = g; tColors[i*3+2] = b;
}

tPos.needsUpdate = true;
terrGeo.setAttribute('color', new THREE.BufferAttribute(tColors, 3));
terrGeo.rotateX(-Math.PI / 2); // rotate AFTER all vertex writes
terrGeo.computeVertexNormals();

const terrMat  = new THREE.MeshLambertMaterial({ vertexColors: true });
const terrMesh = new THREE.Mesh(terrGeo, terrMat);
terrMesh.position.set(ix, 0, iz);
terrMesh.receiveShadow = true;
scene.add(terrMesh);

// ── HELPER: place any mesh ON the terrain ─────────────────────────────────────
function onTerrain(x, z) { return getI2Height(x, z); }

// ── PINE TREES — ConeGeometry canopy, CylinderGeometry trunk ─────────────────
function makePine(ox, oz, scale = 1.0) {
    const wx = ix + ox, wz = iz + oz;
    const wy = onTerrain(wx, wz);
    if (wy < 0.1) return;
    const g = new THREE.Group();
    g.position.set(wx, wy, wz);

    // trunk
    const trunkGeo = new THREE.CylinderGeometry(0.13*scale, 0.22*scale, 2.6*scale, 7);
    const trunk    = new THREE.Mesh(trunkGeo, mPineTrunk);
    trunk.position.y = 1.3 * scale;
    trunk.castShadow = true;
    g.add(trunk);

    // 3 canopy tiers — bottom widest
    [
        { r: 2.1, h: 1.6, y: 2.1 },
        { r: 1.55,h: 1.4, y: 3.2 },
        { r: 1.0, h: 1.2, y: 4.2 },
    ].forEach(({ r, h, y }) => {
        const cGeo  = new THREE.ConeGeometry(r*scale, h*scale, 7);
        const cone  = new THREE.Mesh(cGeo, mPineLeaf);
        cone.position.y = y * scale;
        cone.castShadow  = true;
        g.add(cone);
        // snow cap on each tier
        const sGeo  = new THREE.ConeGeometry(r*0.62*scale, h*0.34*scale, 7);
        const snow  = new THREE.Mesh(sGeo, mPineSnow);
        snow.position.y = (y + h*0.52) * scale;
        g.add(snow);
    });

    g.rotation.y = Math.random() * Math.PI * 2;
    scene.add(g);
    addCollider(wx, wz, 0.85 * scale);
}

// pine distribution: dense on lower-mid slopes, fewer near peak
const pines = [
    // outer ring
    [28,2,1.2],[26,-12,1.1],[-26,10,1.1],[-28,-8,1.15],[8,30,1.0],
    [-10,28,1.05],[20,22,1.0],[-20,20,0.95],[26,14,1.1],[-24,16,1.0],
    [14,-28,1.0],[-16,-26,1.05],[4,-30,0.95],[28,-20,1.1],[-28,-20,1.05],
    // mid ring
    [18,10,0.9],[16,-14,0.92],[-14,12,0.88],[-16,-10,0.9],[6,22,0.88],
    [-8,20,0.9],[22,-2,0.92],[-20,2,0.88],[10,-20,0.85],[-10,-18,0.88],
    [20,8,0.9],[0,-22,0.85],[-22,6,0.9],[12,18,0.86],[-12,16,0.88],
    // upper slopes — smaller
    [12,6,0.7],[10,-8,0.68],[-8,8,0.72],[-10,-6,0.7],[6,12,0.66],
    [-6,10,0.68],[14,0,0.7],[-12,2,0.68],[8,-10,0.65],[0,14,0.66],
    [10,4,0.64],[-8,-4,0.66],[6,-8,0.62],[-4,8,0.64],[4,-4,0.60],
];
pines.forEach(([ox,oz,s]) => makePine(ox, oz, s));

// ── SAKURA TREES — SphereGeometry blooms, curved trunk ───────────────────────
const SAKURA_SPOTS = [
    { ox: 18, oz: 14 },   // NPC 0 (Functions) — base right
    { ox:-16, oz: -6 },   // NPC 1 (Lists)     — mid left
    { ox:  8, oz:-14 },   // NPC 2 (Strings)   — mid back
    { ox: -4, oz:  8 },   // NPC 3 (Dictionary)— upper left
    { ox:  0, oz:  0 },   // NPC 4 (Classes)   — peak
];
export const sakuraPositions = [];

function makeSakura(ox, oz) {
    const wx = ix + ox, wz = iz + oz;
    const wy = onTerrain(wx, wz);
    const g  = new THREE.Group();
    g.position.set(wx, wy, wz);

    // trunk — CylinderGeometry, slightly leaning
    const tGeo = new THREE.CylinderGeometry(0.10, 0.20, 5.0, 7);
    const trunk = new THREE.Mesh(tGeo, mSakTrunk);
    trunk.position.y = 2.5;
    trunk.rotation.z = (Math.random() - 0.5) * 0.12;
    trunk.castShadow = true;
    g.add(trunk);

    // branches — thinner cylinders at angles
    [
        { len:2.0, ox:0.7, oy:4.4, oz: 0.4, rz: 0.45, rx: 0.0 },
        { len:1.8, ox:-0.6,oy:4.2, oz:-0.3, rz:-0.40, rx: 0.0 },
        { len:1.5, ox:0.3, oy:4.8, oz: 0.5, rz: 0.20, rx: 0.3 },
        { len:1.6, ox:-0.4,oy:4.6, oz:-0.4, rz:-0.25, rx:-0.3 },
    ].forEach(({ len, ox:bx, oy, oz:bz, rz, rx }) => {
        const bGeo   = new THREE.CylinderGeometry(0.05, 0.09, len, 5);
        const branch = new THREE.Mesh(bGeo, mSakTrunk);
        branch.position.set(bx, oy, bz);
        branch.rotation.z = rz;
        branch.rotation.x = rx;
        g.add(branch);
    });

    // blossom cloud — overlapping SphereGeometry blobs
    const blosCount = 7 + Math.floor(Math.random() * 4);
    for (let i = 0; i < blosCount; i++) {
        const br    = 0.85 + Math.random() * 0.75;
        const bGeo  = new THREE.SphereGeometry(br, 8, 6);
        const blos  = new THREE.Mesh(bGeo, i % 2 === 0 ? mBlossom : mBlossDark);
        blos.position.set(
            (Math.random() - 0.5) * 2.6,
            5.0 + Math.random() * 1.6,
            (Math.random() - 0.5) * 2.6
        );
        blos.scale.y = 0.72;
        blos.castShadow = true;
        g.add(blos);
    }

    // fallen petals on ground — tiny flat spheres
    for (let i = 0; i < 6; i++) {
        const pGeo  = new THREE.SphereGeometry(0.12, 5, 3);
        const petal = new THREE.Mesh(pGeo, mBlossom);
        petal.position.set((Math.random()-0.5)*3.5, 0.06, (Math.random()-0.5)*3.5);
        petal.scale.y = 0.18;
        g.add(petal);
    }

    // soft pink glow under tree
    const tLight = new THREE.PointLight(0xff88cc, 0.9, 7);
    tLight.position.set(0, 3, 0);
    g.add(tLight);

    scene.add(g);
    addCollider(wx, wz, 1.1);
    sakuraPositions.push({ wx, wz, wy });
    return g;
}

SAKURA_SPOTS.forEach(({ ox, oz }) => makeSakura(ox, oz));

// ── ROCKS — IcosahedronGeometry, natural low-poly ─────────────────────────────
function makeRock(ox, oz, radius = 1.0, flattenY = 0.55) {
    const wx = ix + ox, wz = iz + oz;
    const wy = onTerrain(wx, wz);
    if (wy < 0.1) return;
    const rGeo = new THREE.IcosahedronGeometry(radius, 1);
    rGeo.scale(1, flattenY, 0.82 + Math.random()*0.3);
    const rock = new THREE.Mesh(rGeo, Math.random() > 0.5 ? mStone : mStoneLight);
    rock.position.set(wx, wy + radius * flattenY * 0.5, wz);
    rock.rotation.y = Math.random() * Math.PI * 2;
    rock.rotation.x = (Math.random()-0.5) * 0.2;
    rock.castShadow = true;
    scene.add(rock);
}

// rock clusters on the slopes
[
    [24,4,1.1],[24,6,0.7],[23,5,0.5],        // cluster A
    [-22,12,1.0],[-22,14,0.65],[-23,11,0.45],// cluster B
    [12,-22,0.9],[14,-21,0.6],[11,-23,0.5],  // cluster C
    [-18,-16,1.1],[-17,-17,0.7],             // cluster D
    [6,24,0.8],[8,22,0.55],[5,25,0.4],       // cluster E
    [-8,-20,0.9],[-9,-18,0.6],               // cluster F
    [16,0,0.7],[18,2,0.5],                   // mid right
    [-14,4,0.75],[-16,6,0.5],                // mid left
    [6,-14,0.65],[8,-12,0.4],                // upper back
    [-4,10,0.6],[-6,12,0.42],               // upper front
    [2,8,0.55],[4,6,0.35],                   // near peak
    [0,-8,0.5],[2,-6,0.35],
].forEach(([ox,oz,r]) => makeRock(ox, oz, r));

// ── FROZEN POND ───────────────────────────────────────────────────────────────
const pondX = ix - 20, pondZ = iz + 18;
const pondY = onTerrain(pondX, pondZ);

const pondGeo  = new THREE.CircleGeometry(5.8, 40);
const pondMesh = new THREE.Mesh(pondGeo, mIce);
pondMesh.rotation.x = -Math.PI / 2;
pondMesh.position.set(pondX, pondY + 0.12, pondZ);
scene.add(pondMesh);

// ice crack lines using thin CylinderGeometry lying flat
for (let i = 0; i < 7; i++) {
    const a   = Math.random() * Math.PI;
    const len = 2.5 + Math.random() * 3.5;
    const cGeo  = new THREE.CylinderGeometry(0.025, 0.025, len, 4);
    const crack = new THREE.Mesh(cGeo, mIceCrack);
    crack.rotation.z = Math.PI / 2;
    crack.rotation.y = a;
    crack.position.set(pondX + (Math.random()-0.5)*6, pondY + 0.14, pondZ + (Math.random()-0.5)*6);
    scene.add(crack);
}
// pond edge rocks
for (let i = 0; i < 12; i++) {
    const a  = (i / 12) * Math.PI * 2;
    const r  = 5.6 + Math.random() * 0.8;
    const rh = 0.25 + Math.random() * 0.35;
    const rGeo = new THREE.IcosahedronGeometry(rh, 1);
    rGeo.scale(1, 0.5, 1);
    const rk = new THREE.Mesh(rGeo, mStone);
    rk.position.set(pondX + Math.cos(a)*r, pondY + rh*0.3, pondZ + Math.sin(a)*r);
    rk.rotation.y = Math.random() * Math.PI;
    scene.add(rk);
}
addCollider(pondX, pondZ, 5.2);

// ── PATH ──────────────────────────────────────────────────────────────────────
// Winding path tiles up the mountain
const pathPts = [
    [18,14],[20,6],[18,-4],[12,-14],[4,-20],
    [-8,-18],[-16,-8],[-18,4],[-14,14],[-4,18],
    [8,14],[12,6],[10,-4],[4,-10],[-4,-6],
    [-4,4],[0,8],[2,4],[0,0],
];
pathPts.forEach(([ox, oz], i) => {
    const px = ix + ox, pz = iz + oz;
    const py = onTerrain(px, pz);
    const pGeo  = new THREE.CircleGeometry(1.8, 7);
    const pMesh = new THREE.Mesh(pGeo, mPath);
    pMesh.rotation.x = -Math.PI / 2;
    pMesh.position.set(px, py + 0.1, pz);
    scene.add(pMesh);
    // step stones every other point
    if (i % 2 === 0) {
        const sGeo = new THREE.CylinderGeometry(0.5 + Math.random()*0.3, 0.55, 0.15, 6);
        const step = new THREE.Mesh(sGeo, mStone);
        step.position.set(px + (Math.random()-0.5)*2, py + 0.08, pz + (Math.random()-0.5)*2);
        step.rotation.y = Math.random() * Math.PI;
        scene.add(step);
    }
});

// ── STONE LANTERNS along the path ─────────────────────────────────────────────
const lanternPts = [[18,14],[4,-20],[-18,4],[8,14],[0,0]];
export const lanternLights = [];
lanternPts.forEach(([ox, oz]) => {
    const wx = ix + ox, wz = iz + oz;
    const wy = onTerrain(wx, wz);
    const lg = new THREE.Group();
    lg.position.set(wx, wy, wz);

    // base — sits flush on ground
    const baseGeo = new THREE.CylinderGeometry(0.35, 0.42, 0.3, 8);
    const baseMesh = new THREE.Mesh(baseGeo, mStone);
    baseMesh.position.set(0, 0.15, 0);
    lg.add(baseMesh);
    // pole
    const poleGeo = new THREE.CylinderGeometry(0.1, 0.12, 1.5, 7);
    const pole    = new THREE.Mesh(poleGeo, mStone);
    pole.position.y = 1.05;
    lg.add(pole);
    // lantern box
    const boxGeo  = new THREE.BoxGeometry(0.55, 0.55, 0.55);
    const lanBox  = new THREE.Mesh(boxGeo, mLantern);
    lanBox.position.y = 1.95;
    lg.add(lanBox);
    // cap
    const capGeo  = new THREE.CylinderGeometry(0.38, 0.10, 0.25, 8);
    const cap     = new THREE.Mesh(capGeo, mStone);
    cap.position.y = 2.35;
    lg.add(cap);

    const pl = new THREE.PointLight(0xff9944, 1.4, 9);
    pl.position.set(0, 2, 0);
    lg.add(pl);
    lanternLights.push(pl);

    scene.add(lg);
    addCollider(wx, wz, 0.5);
});

// ── PEAK SHRINE ───────────────────────────────────────────────────────────────
// ── PEAK MARKER — simple glowing light at the summit ─────────────────────────
const peakY = onTerrain(ix, iz);
export const peakLight = new THREE.PointLight(0xffffff, 2.0, 20);
peakLight.position.set(ix, peakY + 3, iz);
scene.add(peakLight);

// ── SNOW PARTICLES ────────────────────────────────────────────────────────────
export const SNOW_COUNT = 900;
const snowGeo           = new THREE.BufferGeometry();
export const snowPos    = new Float32Array(SNOW_COUNT * 3);
export const snowVel    = new Float32Array(SNOW_COUNT);
for (let i = 0; i < SNOW_COUNT; i++) {
    snowPos[i*3]   = ix + (Math.random()-0.5)*95;
    snowPos[i*3+1] = Math.random() * 48;
    snowPos[i*3+2] = iz + (Math.random()-0.5)*95;
    snowVel[i]     = 1.4 + Math.random() * 2.8;
}
snowGeo.setAttribute('position', new THREE.BufferAttribute(snowPos, 3));
export const snowParticles = new THREE.Points(
    snowGeo,
    new THREE.PointsMaterial({ color: 0xffffff, size: 0.35, transparent: true, opacity: 0.88 })
);
scene.add(snowParticles);

// ── ISLAND 2 LIGHTING ─────────────────────────────────────────────────────────
// overcast daylight from the north-east
const i2Sun = new THREE.DirectionalLight(0x9ab8d4, 1.0);
i2Sun.position.set(50, 90, iz - 50);
i2Sun.castShadow = false;
scene.add(i2Sun);
// cold fill from below
const i2Fill = new THREE.HemisphereLight(0x8ab0cc, 0x405060, 0.55);
scene.add(i2Fill);

// ── NPC DATA — Japanese scholar design, different from island 1 ───────────────
export const I2_NPC_DATA = [
    {
        name: "FUNCTIONS MASTER",   color: 0x2563eb,
        lesson: "FUNCTIONS\nReusable blocks of code.\n[E] for the challenge!",
        ability: "Function", currentChallenge: 0, completed: [],
        sakuraIdx: 0,
        challenges: [
            { level:1, challenge:"Define a function called greet.\n\nAll functions start with the 'def' keyword.", hint:"Type:  def greet():", solutions:["def greet():"], xp:30 },
            { level:2, challenge:"Define a function called add that takes two parameters: a and b.", hint:"Type:  def add(a, b):", solutions:["def add(a, b):","def add(a,b):"], xp:42 },
            { level:3, challenge:"Return a value from inside a function.\n\nUse the 'return' keyword.", hint:"Type:  return a + b", solutions:["return a + b","return a+b"], xp:58 },
            { level:4, challenge:"Call a function called greet and pass the string 'World' as an argument.", hint:"Type:  greet('World')", solutions:["greet('world')","greet('World')","greet(\"world\")","greet(\"World\")"], xp:65 },
            { level:5, challenge:"Define a function with a default parameter.\n\nExample: def greet(name='World'):", hint:"Type:  def greet(name='World'):", solutions:["def greet(name='world'):","def greet(name='World'):","def greet(name=\"World\"):","def greet(name=\"world\"):"], xp:80 },
        ],
    },
    {
        name: "LISTS MASTER",   color: 0x059669,
        lesson: "LISTS\nOrdered collections of data.\n[E] for the challenge!",
        ability: "List", currentChallenge: 0, completed: [],
        sakuraIdx: 1,
        challenges: [
            { level:1, challenge:"Create a list called fruits with 3 items:\n'apple', 'banana', 'cherry'", hint:"Type:  fruits = ['apple', 'banana', 'cherry']", solutions:["fruits=['apple','banana','cherry']","fruits = ['apple', 'banana', 'cherry']"], xp:30 },
            { level:2, challenge:"Get the first item from a list called items.\n\nPython lists start at index 0.", hint:"Type:  items[0]", solutions:["items[0]"], xp:42 },
            { level:3, challenge:"Add a new item to the end of a list.\n\nUse the .append() method.", hint:"Type:  fruits.append('mango')", solutions:["fruits.append('mango')","fruits.append(\"mango\")"], xp:58 },
            { level:4, challenge:"Get the number of items in a list called fruits.\n\nUse the len() function.", hint:"Type:  len(fruits)", solutions:["len(fruits)"], xp:65 },
            { level:5, challenge:"Remove an item from a list by value.\n\nUse the .remove() method.", hint:"Type:  fruits.remove('apple')", solutions:["fruits.remove('apple')","fruits.remove(\"apple\")"], xp:80 },
        ],
    },
    {
        name: "STRINGS MASTER",  color: 0xd97706,
        lesson: "STRINGS\nText and characters.\n[E] for the challenge!",
        ability: "String", currentChallenge: 0, completed: [],
        sakuraIdx: 2,
        challenges: [
            { level:1, challenge:"Get the number of characters in a string called name.\n\nUse the len() function.", hint:"Type:  len(name)", solutions:["len(name)"], xp:30 },
            { level:2, challenge:"Convert a string to all uppercase letters.\n\nUse the .upper() method.", hint:"Type:  name.upper()", solutions:["name.upper()"], xp:42 },
            { level:3, challenge:"Split a string into a list of words.\n\nUse the .split() method.", hint:"Type:  sentence.split()", solutions:["sentence.split()","sentence.split(' ')","sentence.split(\" \")"], xp:58 },
            { level:4, challenge:"Check if a string starts with 'Hello'.\n\nUse the .startswith() method.", hint:"Type:  name.startswith('Hello')", solutions:["name.startswith('hello')","name.startswith('Hello')","name.startswith(\"Hello\")","name.startswith(\"hello\")"], xp:65 },
            { level:5, challenge:"Replace a word in a string.\n\nExample: sentence.replace('old', 'new')", hint:"Type:  sentence.replace('old', 'new')", solutions:["sentence.replace('old','new')","sentence.replace('old', 'new')","sentence.replace(\"old\",\"new\")","sentence.replace(\"old\", \"new\")"], xp:80 },
        ],
    },
    {
        name: "DICT MASTER",  color: 0xbe185d,
        lesson: "DICTIONARIES\nKey-value pairs.\n[E] for the challenge!",
        ability: "Dictionary", currentChallenge: 0, completed: [],
        sakuraIdx: 3,
        challenges: [
            { level:1, challenge:"Create a dictionary called person\nwith key 'name' and value 'Alex'.", hint:"Type:  person = {'name': 'Alex'}", solutions:["person={'name':'alex'}","person = {'name': 'Alex'}","person={'name':'Alex'}","person = {'name': 'alex'}"], xp:30 },
            { level:2, challenge:"Access the value with key 'name'\nfrom a dictionary called person.", hint:"Type:  person['name']", solutions:["person['name']","person[\"name\"]"], xp:42 },
            { level:3, challenge:"Add a new key 'age' with value 25\nto the person dictionary.", hint:"Type:  person['age'] = 25", solutions:["person['age']=25","person['age'] = 25","person[\"age\"]=25","person[\"age\"] = 25"], xp:58 },
            { level:4, challenge:"Check if a key 'name' exists in a dictionary.\n\nUse the 'in' keyword.", hint:"Type:  'name' in person", solutions:["'name' in person","\"name\" in person"], xp:65 },
            { level:5, challenge:"Get all keys from a dictionary called person.\n\nUse the .keys() method.", hint:"Type:  person.keys()", solutions:["person.keys()"], xp:80 },
        ],
    },
    {
        name: "CLASSES MASTER",  color: 0xdc2626,
        lesson: "CLASSES\nObject blueprints.\n[E] for the challenge!",
        ability: "Class", currentChallenge: 0, completed: [],
        sakuraIdx: 4,
        challenges: [
            { level:1, challenge:"Define a class called Animal.\n\nAll class definitions start with 'class'.", hint:"Type:  class Animal:", solutions:["class animal:","class Animal:"], xp:35 },
            { level:2, challenge:"Add an __init__ method inside a class.\n\nThis method runs when an object is created.", hint:"Type:  def __init__(self):", solutions:["def __init__(self):","def __init__( self ):"], xp:52 },
            { level:3, challenge:"Create an instance (object) of the Animal class.", hint:"Type:  my_animal = Animal()", solutions:["my_animal=animal()","my_animal = Animal()","my_animal=Animal()"], xp:68 },
            { level:4, challenge:"Define a method called speak inside a class.\n\nMethods always take 'self' as first parameter.", hint:"Type:  def speak(self):", solutions:["def speak(self):"], xp:75 },
            { level:5, challenge:"Access an attribute called name on an object called dog.\n\nUse dot notation.", hint:"Type:  dog.name", solutions:["dog.name"], xp:90 },
        ],
    },
];

// ── NPC BUILDER — Japanese scholar/monk look ──────────────────────────────────
function makeI2NPC(data) {
    const sp    = SAKURA_SPOTS[data.sakuraIdx];
    const npcX  = ix + sp.ox + 1.2;
    const npcZ  = iz + sp.oz + 1.2;
    const npcY  = onTerrain(npcX, npcZ) - 0.2; // slight sink so feet touch ground
    const color = data.color;
    const g     = new THREE.Group();
    g.position.set(npcX, npcY, npcZ);

    const bM  = new THREE.MeshLambertMaterial({ color });
    const rM  = new THREE.MeshLambertMaterial({ color: new THREE.Color(color).offsetHSL(0, -0.2, -0.1) }); // robe (darker)
    const sM  = new THREE.MeshLambertMaterial({ color: 0xf5e0c8 }); // skin — slightly warmer
    const eM  = new THREE.MeshLambertMaterial({ color: 0x1a1008 });
    const hM  = new THREE.MeshLambertMaterial({ color: 0x1a1208 }); // dark hair
    const wbM = new THREE.MeshLambertMaterial({ color: 0xf5f0e8 }); // white belt/trim
    const nM  = new THREE.MeshLambertMaterial({ color, emissive: new THREE.Color(color), emissiveIntensity: 0.5 });

    // robe body — wider and taller than island 1 NPCs
    const robeGeo = new THREE.CylinderGeometry(0.48, 0.62, 1.8, 8);
    const robe    = new THREE.Mesh(robeGeo, rM);
    robe.position.y = 1.1;
    g.add(robe);

    // upper body/shoulders
    addTo(g, box(0.95, 0.7, 0.52, bM), 0, 2.18, 0);

    // white belt trim
    addTo(g, box(0.98, 0.16, 0.56, wbM), 0, 1.74, 0);

    // head
    const headGeo = new THREE.BoxGeometry(0.78, 0.75, 0.75);
    const head    = new THREE.Mesh(headGeo, sM);
    head.position.set(0, 2.92, 0);
    g.add(head);
    // eyes
    addTo(head, box(0.14,0.11,0.04,eM), -0.19, 0.05, 0.40);
    addTo(head, box(0.14,0.11,0.04,eM),  0.19, 0.05, 0.40);

    // hair — topknot style
    addTo(head, box(0.82, 0.18, 0.78, hM), 0,  0.46, 0);
    addTo(head, box(0.28, 0.35, 0.28, hM), 0,  0.70, 0);

    // arms — wide sleeves (wider box)
    addTo(g, box(0.42, 0.95, 0.42, rM), -0.70, 2.10, 0);
    addTo(g, box(0.42, 0.95, 0.42, rM),  0.70, 2.10, 0);
    // hands
    addTo(g, box(0.26, 0.26, 0.26, sM), -0.70, 1.55, 0);
    addTo(g, box(0.26, 0.26, 0.26, sM),  0.70, 1.55, 0);

    // staff / scroll in one hand
    const staffGeo = new THREE.CylinderGeometry(0.045, 0.045, 2.8, 6);
    const staff    = new THREE.Mesh(staffGeo, new THREE.MeshLambertMaterial({ color: 0x5c3d1e }));
    staff.position.set(0.85, 1.4, 0.2);
    staff.rotation.z = 0.12;
    g.add(staff);
    // staff top ornament
    const orbGeo = new THREE.SphereGeometry(0.12, 7, 5);
    const orb    = new THREE.Mesh(orbGeo, new THREE.MeshLambertMaterial({ color, emissive: new THREE.Color(color), emissiveIntensity: 0.8 }));
    orb.position.set(0.87, 2.88, 0.24);
    g.add(orb);

    // name badge
    addTo(g, box(1.55, 0.40, 0.05, nM), 0, 3.80, 0);

    const npcLight = new THREE.PointLight(new THREE.Color(color), 1.1, 9);
    npcLight.position.set(0, 2, 0);
    g.add(npcLight);

    g.userData = { ...data, light: npcLight };
    scene.add(g);
    addCollider(npcX, npcZ, 1.3);
    return g;
}

export const i2Npcs = I2_NPC_DATA.map(data => makeI2NPC(data));

// bridge crossing threshold used by main.js
export const BRIDGE_END_Z = BZ_END - 2;

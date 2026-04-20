// portals.js — 3 glowing game portals on the island
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160/build/three.module.js';
import { scene, playerData } from './state.js';
import { openArena, openRace, openQuiz } from './games.js';
import { getTerrainHeight } from './world.js';

const PORTALS = [
    {
        id:    'arena',
        label: '🔵 CODE ARENA — PvP Battle',
        pos:   { x:  0, z: -32 },
        color: 0x2196f3,
        icon:  '⚔️',
        onEnter: () => openArena(playerData.username),
    },
    {
        id:    'race',
        label: '🔴 CODE RACE — Racing Game',
        pos:   { x: 30, z:  8 },
        color: 0xf44336,
        icon:  '🏎️',
        onEnter: () => openRace(playerData.username),
    },
    {
        id:    'quiz',
        label: '🟡 MINI QUIZ — Solo Challenge',
        pos:   { x:-30, z:  8 },
        color: 0xffc107,
        icon:  '⚡',
        onEnter: () => openQuiz(playerData.username),
    },
];

// ── PORTAL MESH BUILDER ───────────────────────────────────────────────────────
const portalObjects = [];

PORTALS.forEach(p => {
    const g = new THREE.Group();
    g.position.set(p.pos.x, getTerrainHeight(p.pos.x, p.pos.z), p.pos.z);
    scene.add(g);

    // outer ring
    const outerGeo = new THREE.TorusGeometry(2.2, 0.22, 16, 48);
    const outerMat = new THREE.MeshLambertMaterial({
        color: p.color, emissive: p.color, emissiveIntensity: 0.8,
    });
    const outerRing = new THREE.Mesh(outerGeo, outerMat);
    outerRing.rotation.x = Math.PI / 2;
    outerRing.position.y = 2.5;
    g.add(outerRing);

    // inner ring
    const innerGeo = new THREE.TorusGeometry(1.8, 0.10, 12, 40);
    const innerMat = new THREE.MeshLambertMaterial({
        color: 0xffffff, emissive: p.color, emissiveIntensity: 0.5,
    });
    const innerRing = new THREE.Mesh(innerGeo, innerMat);
    innerRing.rotation.x = Math.PI / 2;
    innerRing.position.y = 2.5;
    g.add(innerRing);

    // portal disc
    const discGeo = new THREE.CircleGeometry(1.8, 40);
    const discMat = new THREE.MeshBasicMaterial({
        color: p.color, transparent: true, opacity: 0.35, side: THREE.DoubleSide,
    });
    const disc = new THREE.Mesh(discGeo, discMat);
    disc.rotation.x = Math.PI / 2;
    disc.position.y = 2.5;
    g.add(disc);

    // pillars
    [-1.6, 1.6].forEach(ox => {
        const pillar = new THREE.Mesh(
            new THREE.CylinderGeometry(0.15, 0.20, 5.0, 8),
            new THREE.MeshLambertMaterial({ color: 0x37474f })
        );
        pillar.position.set(ox, 2.5, 0);
        g.add(pillar);
    });

    // base
    const base = new THREE.Mesh(
        new THREE.CylinderGeometry(2.8, 3.0, 0.3, 12),
        new THREE.MeshLambertMaterial({ color: 0x546e7a })
    );
    base.position.y = 0.15;
    g.add(base);

    // label
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(0,0,0,0)';
    ctx.fillRect(0, 0, 512, 128);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px monospace';
    ctx.textAlign = 'center';
    ctx.shadowColor = `#${p.color.toString(16).padStart(6,'0')}`;
    ctx.shadowBlur = 18;
    ctx.fillText(p.icon + ' ' + p.id.toUpperCase(), 256, 70);
    const labelTex = new THREE.CanvasTexture(canvas);
    const label = new THREE.Mesh(
        new THREE.PlaneGeometry(4, 1),
        new THREE.MeshBasicMaterial({ map: labelTex, transparent: true, depthTest: false })
    );
    label.position.set(0, 5.8, 0);
    label.renderOrder = 1;
    g.add(label);

    // glow light
    const pl = new THREE.PointLight(p.color, 2.5, 14);
    pl.position.set(0, 2.5, 0);
    g.add(pl);

    // particles
    const particles = [];
    for (let i = 0; i < 12; i++) {
        const pGeo  = new THREE.SphereGeometry(0.08, 5, 4);
        const pMat  = new THREE.MeshBasicMaterial({ color: p.color });
        const part  = new THREE.Mesh(pGeo, pMat);
        part.userData.angle  = (i / 12) * Math.PI * 2;
        part.userData.radius = 2.2;
        part.userData.speed  = 0.6 + Math.random() * 0.4;
        part.userData.phase  = Math.random() * Math.PI * 2;
        scene.add(part);
        particles.push({ mesh: part, portalPos: p.pos });
    }

    portalObjects.push({ group: g, outerRing, innerRing, disc, light: pl, particles, data: p });
});

// ── ANIMATE ───────────────────────────────────────────────────────────────────
export function animatePortals(t) {
    portalObjects.forEach((po, pi) => {
        po.outerRing.rotation.z = t * 0.6 + pi;
        po.innerRing.rotation.z = -t * 0.9 + pi;
        po.disc.material.opacity = 0.25 + Math.sin(t * 2 + pi) * 0.15;
        po.light.intensity = 2.0 + Math.sin(t * 3 + pi) * 1.0;

        po.particles.forEach(({ mesh, portalPos }) => {
            mesh.userData.angle += mesh.userData.speed * 0.016;
            const a = mesh.userData.angle;
            const r = mesh.userData.radius;
            const portalWorldY = getTerrainHeight(portalPos.x, portalPos.z);
            mesh.position.set(
                portalPos.x + Math.cos(a) * r,
                portalWorldY + 2.5 + Math.sin(t * 2 + mesh.userData.phase) * 0.4,
                portalPos.z + Math.sin(a) * r
            );
        });
    });
}

// ── PORTAL COLLISION CHECK ────────────────────────────────────────────────────
export function checkPortals(playerPos) {
    for (const po of portalObjects) {
        const dx = playerPos.x - po.data.pos.x;
        const dz = playerPos.z - po.data.pos.z;
        if (Math.sqrt(dx*dx + dz*dz) < 3.0) {
            return { label: po.data.label, onEnter: po.data.onEnter };
        }
    }
    return null;
}

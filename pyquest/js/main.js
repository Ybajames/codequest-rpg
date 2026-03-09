// ─────────────────────────────────────────────────────────────────────────────
//  main.js
//  Entry point for the whole game.
//  Responsibilities:
//    1. Show username screen — get player's name before game starts
//    2. Set up pointer lock overlay
//    3. Run the game loop — animate sun, clouds, birds, NPCs, player movement
//
//  This file does NOT build any 3D objects — that's all in the other modules.
//  It just imports everything and coordinates the frame-by-frame updates.
// ─────────────────────────────────────────────────────────────────────────────
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160/build/three.module.js';

// ── IMPORT ALL MODULES ────────────────────────────────────────────────────────
import { renderer, scene, camera, MAT, playerData } from './state.js';

// World + environment — these run their setup code on import
import './world.js';
import { sunSphere, clouds, birds } from './environment.js';
import { sunLight, hemiLight as hemi } from './world.js';

// Player
import {
    playerGroup, cameraPivot,
    pArmL, pArmR, pLegL, pLegR,
    controls, GRAVITY, JUMP_V, SPEED
} from './player.js';

// Collision
import { resolveCollisions, resolveIslandBoundary } from './collision.js';

// NPCs
import { npcs } from './npcs.js';

// Enemies
import { bugGroup, bugLight, bugState } from './enemies.js';

// Inventory + quests
import { inventory, completeQuest } from './inventory.js';

// XP system
import { addXP } from './xp.js';

// Audio
import { initAudio, setOceanVolume } from './audio.js';

// Terminal
import { terminalOpen, openTerminal, closeTerminal, setOverlayRef } from './terminal.js';

// ─────────────────────────────────────────────────────────────────────────────
//  USERNAME SCREEN
//  Shows before anything else — player types their name, clicks Enter World.
//  Name is saved to playerData.username (from state.js) so any file can use it.
//  Simple for now — database will be added before hosting.
// ─────────────────────────────────────────────────────────────────────────────
const usernameScreen = document.getElementById('usernameScreen');
const usernameInput  = document.getElementById('usernameInput');
const usernameBtn    = document.getElementById('usernameBtn');
const usernameError  = document.getElementById('usernameError');

function submitUsername() {
    const name = usernameInput.value.trim();

    // Validation — name must be between 2 and 16 characters, letters/numbers only
    if (name.length < 2) {
        usernameError.innerText = 'Name must be at least 2 characters!';
        usernameError.style.display = 'block';
        return;
    }
    if (name.length > 16) {
        usernameError.innerText = 'Name must be 16 characters or less!';
        usernameError.style.display = 'block';
        return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(name)) {
        usernameError.innerText = 'Letters, numbers and _ only please!';
        usernameError.style.display = 'block';
        return;
    }

    // Save the name globally
    playerData.username = name;

    // Fade out username screen, then show the lock overlay
    usernameScreen.style.opacity = '0';
    setTimeout(() => {
        usernameScreen.style.display = 'none';
        lockOverlay.style.display = 'flex';
    }, 400);
}

usernameBtn.addEventListener('click', submitUsername);

// Also allow Enter key on the username input
usernameInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') submitUsername();
});

// ─────────────────────────────────────────────────────────────────────────────
//  POINTER LOCK OVERLAY
//  Shows after username screen — "Welcome, [name]! Click to Enter World"
// ─────────────────────────────────────────────────────────────────────────────
const lockOverlay = document.createElement('div');
lockOverlay.id = 'lockOverlay';
lockOverlay.style.display = 'none'; // hidden until username is submitted
lockOverlay.innerHTML = `
    <h1>CodeQuest 3D</h1>
    <p id="welcomeMsg">Welcome, Explorer!</p>
    <p style="font-size:12px; margin-top:8px;">Explore the island. Learn to code.</p>
    <button class="play-btn" id="playBtn">▶ ENTER WORLD</button>
`;
document.body.appendChild(lockOverlay);

// Give terminal.js a reference to this overlay so it can hide it
setOverlayRef(lockOverlay);

document.getElementById('playBtn').addEventListener('click', () => {
    initAudio(); // start audio context on first user click
    // Update the welcome message with the player's actual name
    document.getElementById('welcomeMsg').innerText = `Welcome, ${playerData.username}!`;
    renderer.domElement.requestPointerLock();
});

document.addEventListener('pointerlockchange', () => {
    controls.isLocked = document.pointerLockElement === renderer.domElement;
    if (!terminalOpen) {
        lockOverlay.style.display = controls.isLocked ? 'none' : 'flex';
    }
});

renderer.domElement.addEventListener('click', () => {
    if (!controls.isLocked && !terminalOpen) renderer.domElement.requestPointerLock();
});

// ── KEYBOARD EVENTS ───────────────────────────────────────────────────────────
document.addEventListener('keydown', e => {
    // While terminal is open — only ESC works (closes terminal)
    if (terminalOpen) {
        if (e.code === 'Escape') closeTerminal();
        return;
    }
    controls.keys[e.code] = true;
    if (e.code === 'Space' && controls.onGround) {
        controls.velocityY = JUMP_V;
        controls.onGround  = false;
    }
});

document.addEventListener('keyup', e => {
    if (terminalOpen) return;
    controls.keys[e.code] = false;
});

// ─────────────────────────────────────────────────────────────────────────────
//  STATUS PANEL TEXT
// ─────────────────────────────────────────────────────────────────────────────
const lessonText = document.getElementById('lessonText');

// ─────────────────────────────────────────────────────────────────────────────
//  GAME LOOP
//  Order every frame:
//    1. Player movement + physics (only when terminal is closed)
//    2. Collision resolution
//    3. Animate environment (sun, sky, clouds, birds)
//    4. Animate NPCs
//    5. Animate bug enemy
//    6. Check interactions (E key near NPCs)
//    7. Render
// ─────────────────────────────────────────────────────────────────────────────
const clock = new THREE.Clock();
const SUN_ORBIT_RADIUS = 200;
const SUN_HEIGHT_BASE  = 80;

function animate() {
    requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.05); // cap delta so big lag spikes don't teleport player
    const t  = clock.elapsedTime;

    // ── 1. PLAYER MOVEMENT ──
    // Frozen while terminal is open so student can type without moving
    if (!terminalOpen) {
        const dir     = new THREE.Vector3();
        const forward = new THREE.Vector3(-Math.sin(controls.yaw), 0, -Math.cos(controls.yaw));
        const right   = new THREE.Vector3( Math.cos(controls.yaw), 0, -Math.sin(controls.yaw));

        if (controls.keys['KeyW'] || controls.keys['ArrowUp'])    dir.add(forward);
        if (controls.keys['KeyS'] || controls.keys['ArrowDown'])  dir.sub(forward);
        if (controls.keys['KeyD'] || controls.keys['ArrowRight']) dir.add(right);
        if (controls.keys['KeyA'] || controls.keys['ArrowLeft'])  dir.sub(right);

        if (dir.lengthSq() > 0) dir.normalize();
        playerGroup.position.addScaledVector(dir, SPEED * dt);

        // Gravity
        controls.velocityY += GRAVITY * dt;
        playerGroup.position.y += controls.velocityY * dt;
        if (playerGroup.position.y <= 0) {
            playerGroup.position.y = 0;
            controls.velocityY = 0;
            controls.onGround  = true;
        }

        // ── 2. COLLISION ──
        resolveIslandBoundary(playerGroup);
        resolveCollisions(playerGroup);

        // ── OCEAN VOLUME — louder near the beach ──
        const distToCenter = Math.sqrt(
            playerGroup.position.x ** 2 + playerGroup.position.z ** 2
        );
        // Starts fading in at radius 30, full volume at radius 45+
        const oceanVol = Math.max(0, Math.min(1, (distToCenter - 30) / 15));
        setOceanVolume(oceanVol);

        // Apply rotation from mouse look
        playerGroup.rotation.y = controls.yaw;
        cameraPivot.rotation.x = controls.pitch;

        // Walk animation — arms and legs swing when moving
        const walkSpeed = dir.lengthSq() > 0 ? t * 6 : 0;
        pArmL.rotation.x =  Math.sin(walkSpeed) * 0.5;
        pArmR.rotation.x = -Math.sin(walkSpeed) * 0.5;
        pLegL.rotation.x = -Math.sin(walkSpeed) * 0.5;
        pLegR.rotation.x =  Math.sin(walkSpeed) * 0.5;
    }

    // ── 3. SUN + SKY ──
    // Sun arcs across the sky — full cycle every ~7 minutes
    const sunAngle = t * 0.015;
    const sunX = Math.cos(sunAngle) * SUN_ORBIT_RADIUS;
    const sunY = Math.sin(sunAngle) * SUN_HEIGHT_BASE + 40; // never dips below y=40
    const sunZ = Math.sin(sunAngle * 0.5) * 60;

    sunLight.position.set(sunX, sunY, sunZ);
    sunSphere.position.set(sunX, sunY, sunZ);

    // Height factor: 0 = near horizon, 1 = high in sky
    const hf = Math.max(0, Math.min(1, sunY / 120));

    // Sun colour shifts from warm orange (low) to bright yellow (high)
    sunLight.color.setHex(hf > 0.5 ? 0xfffbe0 : 0xff9933);
    sunSphere.material.color.setHex(hf > 0.5 ? 0xffdd44 : 0xff8800);

    // Sky and fog colour react to sun height
    const skyColor = new THREE.Color().lerpColors(
        new THREE.Color(0xff7733), // orange at sunrise/sunset
        new THREE.Color(0x87ceeb), // blue during day
        hf
    );
    scene.background = skyColor;
    scene.fog.color  = skyColor;
    hemi.color       = skyColor; // Note: hemi imported below

    // ── 4a. CLOUDS ──
    // Drift slowly to the right, wrap around at the edges
    clouds.forEach((cloud, i) => {
        cloud.position.x += 2 * dt;
        if (cloud.position.x > 180) {
            cloud.position.x = -180;
            cloud.position.z = (Math.random() - 0.5) * 300;
        }
        cloud.position.y += Math.sin(t * 0.3 + i) * 0.01; // gentle bob
    });

    // ── 4b. BIRDS ──
    birds.forEach(bird => {
        bird.userData.angle += bird.userData.speed * dt;
        const a = bird.userData.angle;
        const r = bird.userData.orbitRadius;

        // Circular orbit around the island
        bird.position.set(
            Math.cos(a) * r,
            bird.userData.height + Math.sin(t * 0.5 + a) * 3, // gentle altitude drift
            Math.sin(a) * r
        );

        // Face direction of travel — tangent of the circle
        bird.rotation.y = -a - Math.PI / 2;

        // Wing flap animation
        bird.userData.flapTimer += dt * 3;
        const flap = Math.sin(bird.userData.flapTimer) * 0.4;
        bird.children[0].rotation.z =  0.3 + flap; // left wing
        bird.children[1].rotation.z = -0.3 - flap; // right wing
    });

    // ── 5. NPC ANIMATIONS ──
    npcs.forEach((npc, i) => {
        // Pulse the NPC's point light — gives them a magical feel
        npc.userData.light.intensity = 0.6 + Math.sin(t * 2 + i) * 0.3;

        // NPC always faces the player
        const dx = playerGroup.position.x - npc.position.x;
        const dz = playerGroup.position.z - npc.position.z;
        npc.rotation.y = Math.atan2(dx, dz);
    });

    // ── 6. OCEAN SHIMMER ──
    MAT.ocean.opacity = 0.82 + Math.sin(t * 0.8) * 0.06;

    // ── 7. BUG ENEMY ──
    if (bugState.alive) {
        // Bug rotates in place and pulses — stationary target
        bugGroup.rotation.y = t * 1.2;
        bugLight.intensity  = 1.0 + Math.sin(t * 5) * 0.5;
    }

    // ── 8. INTERACTIONS ──
    // Only check when terminal is closed
    if (!terminalOpen) {
        let interacting = false;

        // NPC proximity check
        for (const npc of npcs) {
            const dist = playerGroup.position.distanceTo(npc.position);
            if (dist < 4) {
                interacting = true;
                const alreadyUnlocked = inventory.includes(npc.userData.ability);

                if (alreadyUnlocked) {
                    lessonText.innerText = `✓ ${npc.userData.ability} unlocked!\nYou already know this one!`;
                } else {
                    const idx = npc.userData.currentChallenge || 0;
                    const total = npc.userData.challenges.length;
                    lessonText.innerText = npc.userData.lesson + `\nChallenge ${idx + 1}/${total}  [E] to start`;
                    if (controls.keys['KeyE']) {
                        openTerminal(npc.userData);
                        controls.keys['KeyE'] = false;
                    }
                }
            }
        }

        // Bug proximity check
        if (bugState.alive) {
            const bugDist = playerGroup.position.distanceTo(bugGroup.position);
            if (bugDist < 3.5) {
                interacting = true;
                lessonText.innerText = '⚠ PYTHON BUG!\nRequires: Print ability\n[E] to defeat';
                if (controls.keys['KeyE'] && inventory.includes('Print')) {
                    bugState.alive = false;
                    scene.remove(bugGroup);
                    completeQuest('defeat_bug');
                    addXP(30, 'Bug Defeated!');
                    lessonText.innerText = `✓ Bug destroyed!\nprint() saves the day, ${playerData.username}!`;
                    controls.keys['KeyE'] = false;
                }
            }
        }

        if (!interacting) {
            lessonText.innerText = `Welcome, ${playerData.username}!\nExplore the island.\nWalk up to a glowing teacher!`;
        }
    }

    // ── 9. RENDER ──
    renderer.render(scene, camera);
}

animate();

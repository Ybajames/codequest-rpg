// main.js — CodeQuest 3D entry point
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160/build/three.module.js';
import { VRButton } from 'https://cdn.jsdelivr.net/npm/three@0.160/examples/jsm/webxr/VRButton.js';

import { renderer, scene, camera, MAT, playerData } from './state.js';
import './world.js';
import { sunSphere, moonSphere, clouds, birds } from './environment.js';
import { sunLight, hemiLight as hemi, getTerrainHeight } from './world.js';
import { playerGroup, cameraPivot, pArmL, pArmR, pLegL, pLegR, controls, GRAVITY, JUMP_V, SPEED } from './player.js';
import { resolveCollisions, resolveIslandBoundary } from './collision.js';
import { inventory, completeQuest, loadProgress }   from './inventory.js';
import { addXP, xpState }      from './xp.js';
import { initAudio, setOceanVolume } from './audio.js';
import { terminalOpen, openTerminal, closeTerminal, setOverlayRef } from './terminal.js';
import { checkPortals, animatePortals } from './portals.js';
import { guideNPC, animateGuide, getGuideMessage } from './guide.js';
import { npcs } from './npcs.js';
import { drawMinimap } from './minimap.js';
import { mobileMove, mobileLook, mobileInteract } from './mobile.js';
import './leaderboard.js';

// ── POINTER LOCK OVERLAY ──────────────────────────────────────────────────────
const lockOverlay = document.createElement('div');
lockOverlay.id = 'lockOverlay';
lockOverlay.style.cssText = `
    display:none; position:fixed; inset:0;
    background:rgba(0,0,0,0.82);
    flex-direction:column; align-items:center; justify-content:center;
    z-index:1000; font-family:monospace; color:#e0faff;
    backdrop-filter:blur(4px);
`;
lockOverlay.innerHTML = `
    <h1 style="font-size:28px;color:#00f5ff;text-shadow:0 0 20px #00f5ff;letter-spacing:.12em;margin-bottom:10px">CodeQuest 3D</h1>
    <p id="welcomeMsg" style="font-size:14px;color:rgba(224,250,255,.7);margin-bottom:6px">Welcome, Explorer!</p>
    <p style="font-size:11px;color:rgba(224,250,255,.4);margin-bottom:24px">WASD to move · Mouse to look · E to interact · Space to jump</p>
    <button id="playBtn" style="font-family:monospace;font-size:14px;padding:14px 32px;background:transparent;border:1px solid #00f5ff;color:#00f5ff;cursor:pointer;letter-spacing:.1em;transition:background .2s"
        onmouseover="this.style.background='rgba(0,245,255,.1)'"
        onmouseout="this.style.background='transparent'">
        ▶ ENTER WORLD
    </button>
`;
document.body.appendChild(lockOverlay);
setOverlayRef(lockOverlay);

// ── VR SETUP ──────────────────────────────────────────────────────────────────
let _vrSessionActive = false;
const vrContainer = document.getElementById('vr-btn-container');
try {
    if (navigator.xr) {
        navigator.xr.isSessionSupported('immersive-vr').then(supported => {
            if (!supported) return;
            const vrBtn = VRButton.createButton(renderer);
            vrContainer.appendChild(vrBtn);
        }).catch(() => {});
    }
} catch(e) {}

const controller1 = renderer.xr.getController(0);
const controller2 = renderer.xr.getController(1);
let vrInteractPressed = false;
controller1.addEventListener('selectstart', () => { vrInteractPressed = true; });
controller2.addEventListener('selectstart', () => { vrInteractPressed = true; });

const vrRig = new THREE.Group();
scene.add(vrRig);
const _vrWorldQuat = new THREE.Quaternion();

renderer.xr.addEventListener('sessionstart', () => {
    if (_vrSessionActive) return;
    _vrSessionActive = true;
    cameraPivot.remove(camera);
    vrRig.add(camera);
    vrRig.add(controller1);
    vrRig.add(controller2);
    vrRig.position.copy(playerGroup.position);
    vrRig.position.y = getTerrainHeight(playerGroup.position.x, playerGroup.position.z);
    playerGroup.visible = false;
    playerGroup.position.y = -999;
    playerGroup.traverse(c => { c.visible = false; if (c.isMesh) c.layers.disable(0); });
    ['ui','inventory','quest-btn','quests','crosshair'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
});

renderer.xr.addEventListener('sessionend', () => {
    _vrSessionActive = false;
    vrRig.remove(camera);
    vrRig.remove(controller1);
    vrRig.remove(controller2);
    cameraPivot.add(camera);
    camera.position.set(0, 0, 0);
    playerGroup.position.set(vrRig.position.x, getTerrainHeight(vrRig.position.x, vrRig.position.z), vrRig.position.z);
    playerGroup.visible = true;
    playerGroup.traverse(c => { c.visible = true; if (c.isMesh) c.layers.enable(0); });
    ['ui','inventory','quest-btn','crosshair'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = '';
    });
});

// ── USERNAME SCREEN ───────────────────────────────────────────────────────────
const usernameScreen = document.getElementById('usernameScreen');
const usernameInput  = document.getElementById('usernameInput');
const usernameBtn    = document.getElementById('usernameBtn');
const usernameError  = document.getElementById('usernameError');

function submitUsername() {
    const name = usernameInput.value.trim();
    if (name.length < 2)                { showErr('At least 2 characters!'); return; }
    if (name.length > 16)               { showErr('Max 16 characters!'); return; }
    if (!/^[a-zA-Z0-9_]+$/.test(name))  { showErr('Letters, numbers and _ only!'); return; }
    playerData.username = name;
    window._playerUsername = name;
    usernameScreen.style.opacity = '0';
    setTimeout(() => { usernameScreen.style.display = 'none'; lockOverlay.style.display = 'flex'; }, 400);
}
function showErr(msg) { usernameError.innerText = msg; usernameError.style.display = 'block'; }
usernameBtn.addEventListener('click', submitUsername);
usernameInput.addEventListener('keydown', e => { if (e.key === 'Enter') submitUsername(); });

document.getElementById('playBtn').addEventListener('click', () => {
    initAudio();
    loadProgress();
    document.getElementById('welcomeMsg').innerText = `Welcome, ${playerData.username}!`;
    renderer.domElement.requestPointerLock();
});
document.addEventListener('pointerlockchange', () => {
    controls.isLocked = document.pointerLockElement === renderer.domElement;
    if (!terminalOpen) lockOverlay.style.display = controls.isLocked ? 'none' : 'flex';
});
renderer.domElement.addEventListener('click', () => {
    if (!controls.isLocked && !terminalOpen) renderer.domElement.requestPointerLock();
});

// ── KEYBOARD ──────────────────────────────────────────────────────────────────
document.addEventListener('keydown', e => {
    if (terminalOpen) { if (e.code === 'Escape') closeTerminal(); return; }
    controls.keys[e.code] = true;
    if (e.code === 'Space' && controls.onGround) { controls.velocityY = JUMP_V; controls.onGround = false; }
});
document.addEventListener('keyup', e => { if (terminalOpen) return; controls.keys[e.code] = false; });

// ── DIALOGUE BUBBLE ───────────────────────────────────────────────────────────
const dialogueBubble = document.createElement('div');
dialogueBubble.id = 'dialogue-bubble';
dialogueBubble.innerHTML = `<div id="dialogue-text"></div><div id="dialogue-name"></div>`;
document.body.appendChild(dialogueBubble);

let dialogueTimeout = null;
let lastDialogueNPC = null;

function showDialogue(npcName, text) {
    if (lastDialogueNPC === npcName) return;
    lastDialogueNPC = npcName;
    document.getElementById('dialogue-text').innerText = text;
    document.getElementById('dialogue-name').innerText = npcName;
    dialogueBubble.classList.add('dialogue-show');
    clearTimeout(dialogueTimeout);
    dialogueTimeout = setTimeout(hideDialogue, 4500);
}
function hideDialogue() {
    dialogueBubble.classList.remove('dialogue-show');
    lastDialogueNPC = null;
}

const lessonText = document.getElementById('lessonText');

// ── GAME LOOP ─────────────────────────────────────────────────────────────────
const clock = new THREE.Clock();
const SUN_ORBIT_RADIUS = 200;
const SUN_HEIGHT_BASE  = 80;

function animate() {
    const dt = Math.min(clock.getDelta(), 0.05);
    const t  = clock.elapsedTime;

    // 1. player movement
    if (!terminalOpen && !renderer.xr.isPresenting) {
        const dir     = new THREE.Vector3();
        const forward = new THREE.Vector3(-Math.sin(controls.yaw), 0, -Math.cos(controls.yaw));
        const right   = new THREE.Vector3( Math.cos(controls.yaw), 0, -Math.sin(controls.yaw));

        if (controls.keys['KeyW'] || controls.keys['ArrowUp']    || mobileMove.y < -0.2) dir.add(forward);
        if (controls.keys['KeyS'] || controls.keys['ArrowDown']  || mobileMove.y >  0.2) dir.sub(forward);
        if (controls.keys['KeyD'] || controls.keys['ArrowRight'] || mobileMove.x >  0.2) dir.add(right);
        if (controls.keys['KeyA'] || controls.keys['ArrowLeft']  || mobileMove.x < -0.2) dir.sub(right);

        // Mobile look
        if (mobileLook.x !== 0 || mobileLook.y !== 0) {
            controls.yaw   -= mobileLook.x;
            controls.pitch -= mobileLook.y;
            controls.pitch  = Math.max(-1.2, Math.min(1.2, controls.pitch));
            mobileLook.x = 0; mobileLook.y = 0;
        }

        if (dir.lengthSq() > 0) dir.normalize();
        playerGroup.position.addScaledVector(dir, SPEED * dt);

        controls.velocityY += GRAVITY * dt;
        playerGroup.position.y += controls.velocityY * dt;

        // Snap to terrain surface instead of flat y=0
        const groundY = getTerrainHeight(playerGroup.position.x, playerGroup.position.z);
        if (playerGroup.position.y <= groundY) {
            playerGroup.position.y = groundY;
            controls.velocityY     = 0;
            controls.onGround      = true;
        }

        resolveIslandBoundary(playerGroup);
        resolveCollisions(playerGroup);

        const d2c = Math.sqrt(playerGroup.position.x**2 + playerGroup.position.z**2);
        setOceanVolume(Math.max(0, Math.min(1, (d2c - 30) / 15)));

        playerGroup.rotation.y = controls.yaw;
        cameraPivot.rotation.x = controls.pitch;

        const ws = dir.lengthSq() > 0 ? t * 6 : 0;
        pArmL.rotation.x =  Math.sin(ws) * 0.5;
        pArmR.rotation.x = -Math.sin(ws) * 0.5;
        pLegL.rotation.x = -Math.sin(ws) * 0.5;
        pLegR.rotation.x =  Math.sin(ws) * 0.5;
    }

    // 2. day/night cycle
    const sa = t * 0.015;
    const sx = Math.cos(sa) * SUN_ORBIT_RADIUS;
    const sy = Math.sin(sa) * SUN_HEIGHT_BASE + 40;
    const sz = Math.sin(sa * 0.5) * 60;
    sunLight.position.set(sx, sy, sz);
    sunSphere.position.set(sx, sy, sz);
    moonSphere.position.set(-sx, -sy + 20, -sz);

    const sunH = sy / (SUN_HEIGHT_BASE + 40);
    if (sunH > 0.15) {
        sunSphere.visible = true; moonSphere.visible = false;
        const dayT = Math.min(1, (sunH - 0.15) / 0.85);
        sunLight.intensity = 0.8 + dayT * 0.6;
        sunLight.color.setHex(0xfffbe0);
        sunSphere.material.color.setHex(0xffdd44);
        const sky = new THREE.Color().lerpColors(new THREE.Color(0xffd580), new THREE.Color(0x87ceeb), dayT);
        scene.background = sky;
        if (scene.fog) { scene.fog.color = sky; scene.fog.density = 0.008; }
        hemi.intensity = 0.4 + dayT * 0.1;
    } else if (sunH > -0.08) {
        sunSphere.visible = true; moonSphere.visible = false;
        const t2 = (sunH + 0.08) / 0.23;
        sunLight.intensity = t2 * 0.8;
        sunLight.color.setHex(0xff6600);
        sunSphere.material.color.setHex(t2 > 0.5 ? 0xff8800 : 0xff4400);
        const sky = new THREE.Color().lerpColors(new THREE.Color(0x1a0a2e), new THREE.Color(0xff4400), t2);
        scene.background = sky;
        if (scene.fog) { scene.fog.color = sky; scene.fog.density = 0.006; }
        hemi.intensity = 0.15 + t2 * 0.25;
    } else {
        sunSphere.visible = false;
        moonSphere.visible = (-sy + 20) > 0;
        sunLight.intensity = 0;
        const nightSky = new THREE.Color(0x060a14);
        scene.background = nightSky;
        if (scene.fog) { scene.fog.color = nightSky; scene.fog.density = 0.005; }
        hemi.intensity = 0.12;
    }

    // 3. clouds + birds
    clouds.forEach((c, i) => {
        c.position.x += 2 * dt;
        if (c.position.x > 180) { c.position.x = -180; c.position.z = (Math.random()-0.5)*300; }
        c.position.y += Math.sin(t*0.3+i)*0.01;
    });
    birds.forEach(bird => {
        bird.userData.angle += bird.userData.speed * dt;
        const a = bird.userData.angle, r = bird.userData.orbitRadius;
        bird.position.set(Math.cos(a)*r, bird.userData.height+Math.sin(t*0.5+a)*3, Math.sin(a)*r);
        bird.rotation.y = -a - Math.PI/2;
        bird.userData.flapTimer += dt*3;
        const flap = Math.sin(bird.userData.flapTimer)*0.4;
        bird.children[0].rotation.z =  0.3 + flap;
        bird.children[1].rotation.z = -0.3 - flap;
    });

    // 4. NPC pulse
    const facePos = renderer.xr.isPresenting ? vrRig.position : playerGroup.position;
    npcs.forEach((npc, i) => {
        npc.userData.light.intensity = 0.6 + Math.sin(t*2+i)*0.3;
        npc.rotation.y = Math.atan2(facePos.x-npc.position.x, facePos.z-npc.position.z);
    });

    // 5. ocean shimmer
    MAT.ocean.opacity = 0.82 + Math.sin(t*0.8)*0.06;

    // 6. portals + guide
    animatePortals(t);
    animateGuide(facePos, t);

    // 7. VR movement
    if (renderer.xr.isPresenting) {
        playerGroup.visible = false;
        playerGroup.position.y = -999;
        playerGroup.traverse(c => { c.visible = false; });
        const session = renderer.xr.getSession();
        if (session) {
            camera.getWorldQuaternion(_vrWorldQuat);
            for (const source of session.inputSources) {
                if (!source.gamepad) continue;
                const axes = source.gamepad.axes;
                if (source.handedness === 'left' && axes.length >= 4) {
                    const camDir   = new THREE.Vector3(0,0,-1).applyQuaternion(_vrWorldQuat);
                    const camRight = new THREE.Vector3(1,0, 0).applyQuaternion(_vrWorldQuat);
                    camDir.y = 0; camDir.normalize();
                    camRight.y = 0; camRight.normalize();
                    if (Math.abs(axes[3]) > 0.12) vrRig.position.addScaledVector(camDir,  -axes[3]*SPEED*dt);
                    if (Math.abs(axes[2]) > 0.12) vrRig.position.addScaledVector(camRight, axes[2]*SPEED*dt);
                    // Snap VR rig to terrain surface
                    vrRig.position.y = getTerrainHeight(vrRig.position.x, vrRig.position.z);
                    playerGroup.position.x = vrRig.position.x;
                    playerGroup.position.z = vrRig.position.z;
                    playerGroup.position.y = -999;
                }
                if (source.handedness === 'right' && axes.length >= 4) {
                    if (Math.abs(axes[2]) > 0.12) vrRig.rotation.y -= axes[2]*1.2*dt;
                }
            }
        }
        resolveCollisions(vrRig);
        resolveIslandBoundary(vrRig);
    }

    // 8. interactions
    const interactPos = renderer.xr.isPresenting ? vrRig.position : playerGroup.position;
    const pressedE    = controls.keys['KeyE'] || vrInteractPressed || mobileInteract;
    vrInteractPressed = false;

    if (!terminalOpen) {
        let interacting = false;

        for (const npc of npcs) {
            if (interactPos.distanceTo(npc.position) < 4) {
                interacting = true;
                const done = inventory.includes(npc.userData.ability);
                showDialogue(npc.userData.name, done
                    ? `✓ ${npc.userData.ability} mastered!`
                    : npc.userData.lesson
                );
                lessonText.innerText = done
                    ? `✓ ${npc.userData.ability} unlocked!\n[E] to review challenges`
                    : npc.userData.lesson + `\nChallenge ${(npc.userData.currentChallenge||0)+1}/${npc.userData.challenges.length}  [E] to open`;
                if (pressedE) {
                    openTerminal(npc.userData);
                    controls.keys['KeyE'] = false;
                }
            }
        }

        const portalHit = checkPortals(interactPos);
        if (portalHit) {
            interacting = true;
            lessonText.innerText = portalHit.label + '\n[E] to enter';
            if (pressedE) {
                portalHit.onEnter();
                controls.keys['KeyE'] = false;
            }
        }

        if (guideNPC && interactPos.distanceTo(guideNPC.position) < 5) {
            interacting = true;
            lessonText.innerText = getGuideMessage();
        }

        if (!interacting) {
            hideDialogue();
            lessonText.innerText = `Welcome, ${playerData.username}!\nExplore the island.\nWalk to an NPC to learn Python.\nStep into a portal to play!`;
        }
    }

    window._xpTotal = xpState.totalXP;
    window._xpLevel = xpState.level;

    // Draw minimap
    drawMinimap(playerGroup.position.x, playerGroup.position.z, controls.yaw);

    renderer.render(scene, camera);
}

renderer.setAnimationLoop(animate);

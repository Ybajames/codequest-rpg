// main.js — entry point, username screen, game loop
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160/build/three.module.js';
import { showCompanion, animateCompanion, isNearRobot, toggleProfile, closeProfile, setProfileData } from './vrcompanion.js';
import {
    npcPanel, vrTerm, showNPCPanel, hideNPCPanel,
    openVRTerminal, closeVRTerminal, vrTermOpen,
    setVRCallbacks, setVRFeedback, advanceVRChallenge,
    handleVRKey, getVRInput, getVRAttempts, incrementVRAttempts, showVRHint,
    vrRaycast, updateVRCursor, laser1, laser2, setLasersVisible,
    callVRSubmit, callVRClose,
} from './vrui.js';
import { VRButton } from 'https://cdn.jsdelivr.net/npm/three@0.160/examples/jsm/webxr/VRButton.js';

import { renderer, scene, camera, MAT, playerData } from './state.js';
import './world.js';
import { sunSphere, moonSphere, clouds, birds } from './environment.js';
import { sunLight, hemiLight as hemi } from './world.js';
import { playerGroup, cameraPivot, pArmL, pArmR, pLegL, pLegR, controls, GRAVITY, JUMP_V, SPEED } from './player.js';
import { resolveCollisions, resolveIslandBoundary } from './collision.js';
import { npcs }                         from './npcs.js';
import { bugGroup, bugLight, bugState } from './enemies.js';
import { inventory, completeQuest, loadProgress, questsDoneCount } from './inventory.js';
import { addXP, xpState }               from './xp.js';
import { initAudio, setOceanVolume, enterIsland2, exitIsland2 } from './audio.js';
import { terminalOpen, openTerminal, closeTerminal, setOverlayRef } from './terminal.js';
import {
    i2Npcs, I2, getI2Height, gateState, openGate, gateLock,
    snowParticles, snowPos, snowVel, SNOW_COUNT,
    peakLight, BRIDGE_END_Z, lanternLights,
} from './island2.js';
import {
    bossState, bossGroup, bossRing, shards, spawnBoss, defeatBoss,
    bossLightRed, bossLightPurp, BOSS_X_POS, BOSS_Z_POS,
} from './boss.js';

// ── ZONE STATE ────────────────────────────────────────────────────────────────
let zone = 'island'; // 'island' | 'island2'
const STARTER_SKILLS = ['Variable','Constant','Print','Input','Logic','Loop'];
function allStarterUnlocked() { return STARTER_SKILLS.every(s => inventory.includes(s)); }
const ALL_SKILLS = ['Variable','Constant','Print','Input','Logic','Loop','Function','List','String','Dictionary','Class'];
function allSkillsUnlocked() { return ALL_SKILLS.every(s => inventory.includes(s)); }

// ── PROGRESS MAP — created dynamically so index.html needs no changes ─────────
const progressMap = document.createElement('div');
progressMap.id = 'progress-map';
progressMap.innerHTML = `
    <div class="map-zone active" id="map-zone-island1">
        <span class="map-zone-icon">🏝️</span>
        <span class="map-zone-label">STARTER</span>
    </div>
    <div class="map-connector" id="map-connector-bridge"></div>
    <div class="map-zone" id="map-zone-island2">
        <span class="map-zone-icon">🏔️</span>
        <span class="map-zone-label">MOUNTAIN</span>
    </div>
`;
document.body.appendChild(progressMap);

const saveIndicatorEl = document.createElement('div');
saveIndicatorEl.id = 'save-indicator';
saveIndicatorEl.innerText = '● SAVED';
document.body.appendChild(saveIndicatorEl);

function updateProgressMap() {
    const mapIsland1   = document.getElementById('map-zone-island1');
    const mapIsland2   = document.getElementById('map-zone-island2');
    const mapConnector = document.getElementById('map-connector-bridge');
    if (!mapIsland1 || !mapIsland2 || !mapConnector) return;
    const bridgeOpen = allStarterUnlocked();
    const onIsland2  = zone === 'island2';
    mapIsland1.className   = 'map-zone' + (onIsland2 ? ' complete' : ' active');
    mapIsland2.className   = 'map-zone' + (onIsland2 ? ' active' : (bridgeOpen ? '' : ''));
    mapConnector.className = 'map-connector' + (bridgeOpen ? ' unlocked' : '');
}

export function flashSaveIndicator() {
    saveIndicatorEl.classList.remove('saving');
    void saveIndicatorEl.offsetWidth;
    saveIndicatorEl.classList.add('saving');
    setTimeout(() => saveIndicatorEl.classList.remove('saving'), 1500);
}

// ── POINTER LOCK OVERLAY ──────────────────────────────────────────────────────
const lockOverlay = document.createElement('div');
lockOverlay.id = 'lockOverlay';
lockOverlay.style.display = 'none';
lockOverlay.innerHTML = `
    <h1>CodeQuest 3D</h1>
    <p id="welcomeMsg">Welcome, Explorer!</p>
    <p style="font-size:12px;margin-top:8px;">Explore the island. Learn to code.</p>
    <button class="play-btn" id="playBtn">▶ ENTER WORLD</button>
`;
document.body.appendChild(lockOverlay);
setOverlayRef(lockOverlay);

// ── VR SETUP ──────────────────────────────────────────────────────────────────
// Guard flag — prevents the "offerSession called more than once" error
// that occurs if the VR button is clicked while a session is already starting.
let _vrSessionActive = false;

const vrContainer = document.getElementById('vr-btn-container');
try {
    if (navigator.xr) {
        navigator.xr.isSessionSupported('immersive-vr').then(supported => {
            if (!supported) return;
            const vrBtn = VRButton.createButton(renderer);
            // VRButton internally calls renderer.xr.setSession — intercept clicks
            // to prevent double-calls when button is clicked rapidly.
            vrBtn.addEventListener('click', () => {
                if (_vrSessionActive) return; // already starting, ignore
            }, true); // capture phase so it fires before VRButton's own handler
            vrContainer.appendChild(vrBtn);
        }).catch(() => {});
    }
} catch(e) {}

// VR controllers
const controller1 = renderer.xr.getController(0);
const controller2 = renderer.xr.getController(1);
// Controllers are added to vrRig inside sessionstart so their world positions are correct.

// One-frame "just pressed" latch — avoids the trigger firing and clearing
// before the game loop reads it (which happened when using keys['KeyE'] directly).
let vrInteractPressed = false;

const _c1WorldPos = new THREE.Vector3();
const _c1WorldDir = new THREE.Vector3();
const _c1WorldQuat = new THREE.Quaternion();

controller1.addEventListener('selectstart', () => {
    controller1.getWorldPosition(_c1WorldPos);
    controller1.getWorldQuaternion(_c1WorldQuat);
    _c1WorldDir.set(0, 0, -1).applyQuaternion(_c1WorldQuat);

    // check if pointing at a VR panel button
    const hit = vrRaycast(_c1WorldPos, _c1WorldDir);
    if (hit) {
        handleVRPanelHit(hit);
        return;
    }

    // check robot
    if (isNearRobot(_c1WorldPos)) {
        toggleProfile();
    } else {
        vrInteractPressed = true;
    }
});

const _c2WorldPos = new THREE.Vector3();
const _c2WorldDir = new THREE.Vector3();
const _c2WorldQuat = new THREE.Quaternion();
controller2.addEventListener('selectstart', () => {
    controller2.getWorldPosition(_c2WorldPos);
    controller2.getWorldQuaternion(_c2WorldQuat);
    _c2WorldDir.set(0, 0, -1).applyQuaternion(_c2WorldQuat);

    const hit = vrRaycast(_c2WorldPos, _c2WorldDir);
    if (hit) {
        handleVRPanelHit(hit);
        return;
    }
    vrInteractPressed = true;
});

function handleVRPanelHit(hit) {
    if (!hit || !hit.button) return; // ray hit panel background — no button
    if (hit.panel === 'npc') {
        if (hit.button === 'start') {
            openVRTerminal(_vrCurrentNPC);
        } else if (hit.button === 'close') {
            hideNPCPanel();
        }
    } else if (hit.panel === 'term') {
        if (hit.button === 'submit') {
            callVRSubmit();
        } else if (hit.button === 'close') {
            callVRClose();
        } else if (hit.button === 'hint') {
            showVRHint();
        } else if (hit.button.startsWith('key_')) {
            const key = hit.button.slice(4); // strip 'key_'
            handleVRKey(key);
        }
    }
}

// ── VR RIG ────────────────────────────────────────────────────────────────────
const vrRig = new THREE.Group();
scene.add(vrRig);

renderer.xr.addEventListener('sessionstart', () => {
    if (_vrSessionActive) return; // guard: ignore duplicate sessionstart events
    _vrSessionActive = true;

    cameraPivot.remove(camera);
    vrRig.add(camera);
    vrRig.add(controller1);
    vrRig.add(controller2);
    vrRig.position.copy(playerGroup.position);
    vrRig.position.y = 0; // rig sits at ground level — Quest floor tracking places eyes correctly
    // hide player mesh + disable from render layer
    playerGroup.visible = false;
    playerGroup.position.y = -999;
    playerGroup.traverse(child => {
        child.visible = false;
        if (child.isMesh) child.layers.disable(0);
    });
    showCompanion(true);
    setLasersVisible(true);
    // hide 2D HTML UI
    ['ui','inventory','quest-btn','quests','crosshair'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
});

renderer.xr.addEventListener('sessionend', () => {
    _vrSessionActive = false; // reset guard so a new session can start later

    vrRig.remove(camera);
    vrRig.remove(controller1);
    vrRig.remove(controller2);
    cameraPivot.add(camera);
    camera.position.set(0, 0, 0);
    playerGroup.position.set(vrRig.position.x, 0, vrRig.position.z);
    playerGroup.visible = true;
    playerGroup.traverse(child => {
        child.visible = true;
        if (child.isMesh) child.layers.enable(0);
    });
    showCompanion(false);
    setLasersVisible(false);
    closeVRTerminal();
    hideNPCPanel();
    // restore 2D UI
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
    if (name.length < 2)              { showErr('Name must be at least 2 characters!'); return; }
    if (name.length > 16)             { showErr('Name must be 16 characters or less!'); return; }
    if (!/^[a-zA-Z0-9_]+$/.test(name)){ showErr('Letters, numbers and _ only!'); return; }
    playerData.username = name;
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
    // dev shortcuts
    if (e.shiftKey && e.code === 'KeyM') goToIsland2();
    if (e.shiftKey && e.code === 'KeyI') goToIsland1();
});
document.addEventListener('keyup', e => { if (terminalOpen) return; controls.keys[e.code] = false; });

// ── VR ANSWER CHECKING ────────────────────────────────────────────────────────
// Mirrors the normalizeCode + checkAnswer logic from terminal.js so VR can
// check answers without opening the HTML terminal.
function vrNormalize(str) {
    return str.trim().toLowerCase()
        .replace(/\s+/g, ' ')
        .replace(/\s*=\s*/g, '=')
        .replace(/\s*>\s*/g, '>')
        .replace(/\s*<\s*/g, '<')
        .replace(/\s*\(\s*/g, '(')
        .replace(/\s*\)\s*/g, ')')
        .replace(/\s*:\s*$/, ':');
}
function vrCheckAnswer(input, solutions) {
    const n = vrNormalize(input);
    return solutions.some(s => {
        const ns = vrNormalize(s);
        if (ns.includes('{string}')) {
            const pattern = ns.replace('{string}', '(?:\'[^\']*\'|"[^"]*")');
            return new RegExp('^' + pattern + '$').test(n);
        }
        if (ns.includes('{any}')) {
            const pattern = ns.replace('{any}', '.+');
            return new RegExp('^' + pattern + '$').test(n);
        }
        return ns === n;
    });
}

// Wire up VR terminal submit + close callbacks
setVRCallbacks(
    // submit
    () => {
        if (!vrTermOpen) return;
        const npcData   = _vrCurrentNPC;
        if (!npcData) return;
        const idx       = npcData.currentChallenge || 0;
        const challenge = npcData.challenges[idx];
        const input     = getVRInput();
        if (!input.trim()) return;

        incrementVRAttempts();

        if (vrCheckAnswer(input, challenge.solutions)) {
            setVRFeedback('correct', 'Correct! Great work!');
            import('./audio.js').then(a => { a.playCorrect(); setTimeout(() => a.playUnlock(), 700); });
            import('./xp.js').then(x => x.addXP(challenge.xp, 'Challenge Complete!'));

            npcData.completed = npcData.completed || [];
            npcData.completed.push(idx);
            const nextIdx = idx + 1;

            if (nextIdx >= npcData.challenges.length) {
                import('./inventory.js').then(inv => inv.unlockAbility(npcData.ability));
                setTimeout(() => {
                    closeVRTerminal();
                    hideNPCPanel();
                }, 1800);
            } else {
                npcData.currentChallenge = nextIdx;
                setTimeout(() => advanceVRChallenge(npcData), 1400);
            }
        } else {
            import('./audio.js').then(a => a.playWrong());
            const attempts = getVRAttempts();
            const msg = attempts <= 1
                ? 'Not quite — check your syntax!'
                : attempts === 2 ? 'Try the Hint button!'
                : 'Hint shows the exact answer!';
            setVRFeedback('wrong', msg);
            if (attempts >= 2) showVRHint();
        }
    },
    // close
    () => {
        closeVRTerminal();
        hideNPCPanel();
    }
);

// Module-level reusable objects — avoids per-frame allocation in hot paths
const _vrWorldQuat = new THREE.Quaternion();
// keep a ref to current NPC being shown in VR terminal
let _vrCurrentNPC = null;

const lessonText = document.getElementById('lessonText');

// ── NPC DIALOGUE SYSTEM ───────────────────────────────────────────────────────
// Dialogue lines per NPC — shown as a speech bubble when approaching
const NPC_GREETINGS = {
    'VARIABLES TEACHER': [
        "Ah, a new student! Every program starts with data. Let me teach you variables!",
        "A variable is like a labelled box — it holds a value you can use later.",
        "You're making progress! Variables are the foundation of all code.",
    ],
    'CONSTANTS TEACHER': [
        "Some values never change — PI, gravity, the speed of light. Those are constants!",
        "In Python we write constants in UPPERCASE so everyone knows not to change them.",
        "Well done! Knowing what should stay fixed is wisdom in programming.",
    ],
    'PRINT TEACHER': [
        "How does your program talk to the world? With print()!",
        "print() is the most useful function in Python. Every coder uses it daily.",
        "You've mastered the art of output! The world will hear your programs now.",
    ],
    'INPUT TEACHER': [
        "Programs that can listen are far more powerful than ones that can't.",
        "input() pauses your program and waits for the user to type something.",
        "Excellent! Your programs can now have real conversations with users.",
    ],
    'LOGIC TEACHER': [
        "Should your program go left or right? That's what if statements decide!",
        "Logic is the heart of intelligence — even in code.",
        "Beautiful! Your programs can now make decisions like a true thinker.",
    ],
    'LOOPS TEACHER': [
        "Why write the same line 100 times? Just use a loop!",
        "Loops are one of the most powerful ideas in all of programming.",
        "Superb! Loops will save you from repeating yourself forever.",
    ],
    'FUNCTIONS MASTER': [
        "Welcome to the mountain! Functions are the building blocks of great code.",
        "A function is a named, reusable block of code. Write once, use many times.",
        "Magnificent! Your code is now modular and elegant.",
    ],
    'LISTS MASTER': [
        "One variable holds one value. But a list? A list holds many!",
        "Lists are the workhorses of Python — you'll use them constantly.",
        "Brilliant work! Now you can store and process entire collections of data.",
    ],
    'STRINGS MASTER': [
        "All text in Python is a string — names, sentences, code itself!",
        "Strings have dozens of built-in methods. Master them and words bow to you.",
        "Outstanding! You speak Python's language of text fluently now.",
    ],
    'DICT MASTER': [
        "What if you could look things up by name instead of by number?",
        "Dictionaries store key-value pairs — like a real dictionary!",
        "Impressive! Dictionaries are used in almost every Python program ever written.",
    ],
    'CLASSES MASTER': [
        "You've climbed far. Now learn the pinnacle of Python — classes!",
        "A class is a blueprint. It defines what an object IS and what it can DO.",
        "You've done it! You now understand the foundations of object-oriented programming.",
    ],
};

// Dialogue bubble DOM
const dialogueBubble = document.createElement('div');
dialogueBubble.id = 'dialogue-bubble';
dialogueBubble.innerHTML = `<div id="dialogue-text"></div><div id="dialogue-name"></div>`;
document.body.appendChild(dialogueBubble);

let dialogueTimeout = null;
let lastDialogueNPC = null;

function showDialogue(npcName, abilityDone) {
    if (lastDialogueNPC === npcName) return; // already showing for this NPC
    lastDialogueNPC = npcName;
    const lines = NPC_GREETINGS[npcName] || ["Press E to start the challenge!"];
    // pick line based on progress: done = line 2, some challenges = line 1, fresh = line 0
    const lineIdx = abilityDone ? 2 : 0;
    const text = lines[Math.min(lineIdx, lines.length - 1)];
    document.getElementById('dialogue-text').innerText = text;
    document.getElementById('dialogue-name').innerText = npcName;
    dialogueBubble.classList.add('dialogue-show');
    clearTimeout(dialogueTimeout);
    dialogueTimeout = setTimeout(hideDialogue, 4000);
}

function hideDialogue() {
    dialogueBubble.classList.remove('dialogue-show');
    lastDialogueNPC = null;
}

// ── ZONE TRANSITIONS ──────────────────────────────────────────────────────────
function goToIsland2() {
    zone = 'island2';
    enterIsland2();
    playerGroup.position.set(I2.x + 16, getI2Height(I2.x + 16, I2.z + 26), I2.z + 26);
    if (renderer.xr.isPresenting) vrRig.position.set(I2.x + 16, 0, I2.z + 26);
    scene.background = new THREE.Color(0x6080a0);
    scene.fog = new THREE.FogExp2(0x7090b0, 0.004);
    completeQuest('cross_bridge');
    updateProgressMap();
}
function goToIsland1() {
    zone = 'island';
    exitIsland2();
    playerGroup.position.set(0, 0, -50);
    if (renderer.xr.isPresenting) vrRig.position.set(0, 0, -50);
    scene.background = new THREE.Color(0x87ceeb);
    scene.fog = new THREE.FogExp2(0x87ceeb, 0.008);
    updateProgressMap();
}

// ── GAME LOOP ─────────────────────────────────────────────────────────────────
const clock = new THREE.Clock();
const SUN_ORBIT_RADIUS = 200;
const SUN_HEIGHT_BASE  = 80;

function animate() {
    const dt = Math.min(clock.getDelta(), 0.05);
    const t  = clock.elapsedTime;

    // 1. player movement — skip entirely in VR
    if (!terminalOpen && !renderer.xr.isPresenting) {
        const dir     = new THREE.Vector3();
        const forward = new THREE.Vector3(-Math.sin(controls.yaw), 0, -Math.cos(controls.yaw));
        const right   = new THREE.Vector3( Math.cos(controls.yaw), 0, -Math.sin(controls.yaw));

        if (controls.keys['KeyW'] || controls.keys['ArrowUp'])    dir.add(forward);
        if (controls.keys['KeyS'] || controls.keys['ArrowDown'])  dir.sub(forward);
        if (controls.keys['KeyD'] || controls.keys['ArrowRight']) dir.add(right);
        if (controls.keys['KeyA'] || controls.keys['ArrowLeft'])  dir.sub(right);

        if (dir.lengthSq() > 0) dir.normalize();
        playerGroup.position.addScaledVector(dir, SPEED * dt);

        // gravity
        controls.velocityY += GRAVITY * dt;
        playerGroup.position.y += controls.velocityY * dt;

        // ground — dynamically heights on island2, flat 0 on island1
        const groundY = zone === 'island2'
            ? getI2Height(playerGroup.position.x, playerGroup.position.z)
            : 0;

        if (playerGroup.position.y <= groundY) {
            playerGroup.position.y = groundY;
            controls.velocityY     = 0;
            controls.onGround      = true;
        }

        // boundaries
        if (zone === 'island') {
            resolveIslandBoundary(playerGroup);
            const d2c = Math.sqrt(playerGroup.position.x**2 + playerGroup.position.z**2);
            setOceanVolume(Math.max(0, Math.min(1, (d2c - 30) / 15)));
        } else {
            // soft circular boundary on island 2
            const dx = playerGroup.position.x - I2.x;
            const dz = playerGroup.position.z - I2.z;
            const d  = Math.sqrt(dx*dx + dz*dz);
            if (d > 38) {
                playerGroup.position.x = I2.x + (dx/d)*38;
                playerGroup.position.z = I2.z + (dz/d)*38;
            }
            setOceanVolume(0);
        }
        resolveCollisions(playerGroup);

        playerGroup.rotation.y = controls.yaw;
        cameraPivot.rotation.x = controls.pitch;

        const ws = dir.lengthSq() > 0 ? t * 6 : 0;
        pArmL.rotation.x =  Math.sin(ws) * 0.5;
        pArmR.rotation.x = -Math.sin(ws) * 0.5;
        pLegL.rotation.x = -Math.sin(ws) * 0.5;
        pLegR.rotation.x =  Math.sin(ws) * 0.5;
    }

    // 2. sun + moon day/night cycle (island 1 only)
    if (zone === 'island') {
        const sa = t * 0.015;

        // sun orbits — opposite side from moon
        const sx = Math.cos(sa) * SUN_ORBIT_RADIUS;
        const sy = Math.sin(sa) * SUN_HEIGHT_BASE + 40;
        const sz = Math.sin(sa * 0.5) * 60;
        sunLight.position.set(sx, sy, sz);
        sunSphere.position.set(sx, sy, sz);

        // moon on opposite side of orbit
        const mx = -sx;
        const my = -sy + 20;
        const mz = -sz;
        moonSphere.position.set(mx, my, mz);

        // sun height factor: 1 = high noon, 0 = horizon, negative = below
        const sunH = sy / (SUN_HEIGHT_BASE + 40); // -0.3 to 1

        if (sunH > 0.15) {
            // ── DAY ──────────────────────────────────────────────────────────
            sunSphere.visible  = true;
            moonSphere.visible = false;
            const dayT = Math.min(1, (sunH - 0.15) / 0.85);
            sunLight.intensity = 0.8 + dayT * 0.6;
            sunLight.color.setHex(0xfffbe0);
            sunSphere.material.color.setHex(0xffdd44);
            const sky = new THREE.Color().lerpColors(
                new THREE.Color(0xffd580), // warm yellow near horizon
                new THREE.Color(0x87ceeb), // sky blue high up
                dayT
            );
            scene.background = sky;
            if (scene.fog) { scene.fog.color = sky; scene.fog.density = 0.008; }
            hemi.color.set(0x87ceeb);        // sky blue from above
            hemi.groundColor.set(0x5a8a3a); // green from ground
            hemi.intensity = 0.4 + dayT * 0.1;

        } else if (sunH > -0.08) {
            // ── SUNSET / SUNRISE ─────────────────────────────────────────────
            sunSphere.visible  = true;
            moonSphere.visible = false;
            const t2 = (sunH + 0.08) / 0.23; // 0 = dark, 1 = day
            sunLight.intensity = t2 * 0.8;
            sunLight.color.setHex(0xff6600);
            sunSphere.material.color.setHex(t2 > 0.5 ? 0xff8800 : 0xff4400);
            const sky = new THREE.Color().lerpColors(
                new THREE.Color(0x1a0a2e), // deep purple night
                new THREE.Color(0xff4400), // orange sunset
                t2
            );
            scene.background = sky;
            if (scene.fog) { scene.fog.color = sky; scene.fog.density = 0.006; }
            hemi.color.set(new THREE.Color().lerpColors(new THREE.Color(0x1a2a4a), new THREE.Color(0xff6633), t2));
            hemi.groundColor.set(new THREE.Color().lerpColors(new THREE.Color(0x050a14), new THREE.Color(0x3a2a10), t2));
            hemi.intensity = 0.15 + t2 * 0.25;

        } else {
            // ── NIGHT ────────────────────────────────────────────────────────
            sunSphere.visible  = false;
            moonSphere.visible = my > 0; // only show moon when above horizon
            sunLight.intensity = 0;

            // moonlight — cool blue directional
            const nightSky = new THREE.Color(0x060a14); // very dark navy
            scene.background = nightSky;
            if (scene.fog) { scene.fog.color = nightSky; scene.fog.density = 0.005; }
            hemi.color.set(0x1a2a4a);
            hemi.intensity = 0.12;

            // pulse moonSphere glow slightly
            if (moonSphere.visible) {
                const moonGlow = 0.85 + Math.sin(t * 0.3) * 0.1;
                moonSphere.material.opacity !== undefined && (moonSphere.material.opacity = moonGlow);
            }
        }
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

    // 4. NPC face player + light pulse
    const _facePos = renderer.xr.isPresenting ? vrRig.position : playerGroup.position;
    npcs.forEach((npc, i) => {
        npc.userData.light.intensity = 0.6 + Math.sin(t*2+i)*0.3;
        npc.rotation.y = Math.atan2(_facePos.x-npc.position.x, _facePos.z-npc.position.z);
    });
    i2Npcs.forEach((npc, i) => {
        npc.userData.light.intensity = 0.9 + Math.sin(t*1.8+i)*0.4;
        npc.rotation.y = Math.atan2(_facePos.x-npc.position.x, _facePos.z-npc.position.z);
    });

    // 5. snow
    if (zone === 'island2') {
        for (let i = 0; i < SNOW_COUNT; i++) {
            snowPos[i*3+1] -= snowVel[i] * dt;
            snowPos[i*3]   += Math.sin(t*0.5+i*0.1)*0.02;
            if (snowPos[i*3+1] < 0) {
                snowPos[i*3]   = I2.x + (Math.random()-0.5)*80;
                snowPos[i*3+1] = 35 + Math.random()*5;
                snowPos[i*3+2] = I2.z + (Math.random()-0.5)*80;
            }
        }
        snowParticles.geometry.attributes.position.needsUpdate = true;
        snowParticles.visible = true;
        peakLight.intensity = 2.5 + Math.sin(t*1.5)*0.8;
        lanternLights.forEach((l,i) => { l.intensity = 1.2 + Math.sin(t*2.8 + i*0.9)*0.5; });
    } else {
        snowParticles.visible = false;
    }

    // 6. gate lock pulse
    if (!gateState.open) gateLock.intensity = 1.5 + Math.sin(t*3)*0.8;

    // 7. ocean shimmer
    MAT.ocean.opacity = 0.82 + Math.sin(t*0.8)*0.06;

    // 8. bug
    if (bugState.alive) {
        bugGroup.rotation.y = t*1.2;
        bugLight.intensity  = 1.0 + Math.sin(t*5)*0.5;
    }

    // 8b. boss animation
    if (bossState.alive) {
        bossGroup.rotation.y = t * 0.4;
        bossLightRed.intensity  = 2.5 + Math.sin(t * 3.0) * 1.0;
        bossLightPurp.intensity = 1.5 + Math.sin(t * 2.2 + 1) * 0.8;
        bossRing.material.opacity = 0.35 + Math.sin(t * 2.5) * 0.2;
        shards.forEach((s, i) => {
            s.userData.orbitAngle += s.userData.orbitSpeed * dt;
            const a = s.userData.orbitAngle;
            const r = s.userData.orbitRadius;
            s.position.set(
                BOSS_X_POS + Math.cos(a) * r,
                s.userData.orbitHeight + Math.sin(t * 1.5 + i) * 0.4,
                BOSS_Z_POS + Math.sin(a) * r
            );
            s.rotation.y = a * 2;
            s.rotation.x = t * 0.8 + i;
        });
    }

    // 9. interactions
    // In VR use vrRig position for distance checks, not playerGroup (which is underground)
    const interactPos = renderer.xr.isPresenting ? vrRig.position : playerGroup.position;
    // Unified interact: keyboard E on desktop, controller trigger in VR
    const pressedE = controls.keys['KeyE'] || vrInteractPressed;
    vrInteractPressed = false; // consume the latch every frame

    // Update laser pointer positions each frame in VR
    if (renderer.xr.isPresenting) {
        controller1.getWorldPosition(_c1WorldPos);
        controller1.getWorldQuaternion(_c1WorldQuat);
        _c1WorldDir.set(0, 0, -1).applyQuaternion(_c1WorldQuat);
        laser1.position.copy(_c1WorldPos);
        laser1.quaternion.copy(_c1WorldQuat);

        controller2.getWorldPosition(_c2WorldPos);
        controller2.getWorldQuaternion(_c2WorldQuat);
        _c2WorldDir.set(0, 0, -1).applyQuaternion(_c2WorldQuat);
        laser2.position.copy(_c2WorldPos);
        laser2.quaternion.copy(_c2WorldQuat);

        // Update cursor dot — whichever controller is pointing at a panel wins
        updateVRCursor(_c1WorldPos, _c1WorldDir, _c2WorldPos, _c2WorldDir);
    }

    if (!terminalOpen && !vrTermOpen) {
        let interacting = false;

        if (zone === 'island') {
            // NPCs
            for (const npc of npcs) {
                if (interactPos.distanceTo(npc.position) < 4) {
                    interacting = true;
                    const done = inventory.includes(npc.userData.ability);
                    showDialogue(npc.userData.name, done);
                    if (done) {
                        lessonText.innerText = `✓ ${npc.userData.ability} unlocked!\nYou know this one!`;
                        if (renderer.xr.isPresenting) { _vrCurrentNPC = npc.userData; showNPCPanel(npc.userData, npc.position); }
                    } else {
                        const idx = npc.userData.currentChallenge || 0;
                        lessonText.innerText = npc.userData.lesson + `\nChallenge ${idx+1}/${npc.userData.challenges.length}  [E] to start`;
                        if (renderer.xr.isPresenting) {
                            _vrCurrentNPC = npc.userData;
                            showNPCPanel(npc.userData, npc.position);
                        } else if (pressedE) {
                            openTerminal(npc.userData); controls.keys['KeyE'] = false;
                        }
                    }
                }
            }
            // bug
            if (bugState.alive && interactPos.distanceTo(bugGroup.position) < 3.5) {
                interacting = true;
                lessonText.innerText = '⚠ PYTHON BUG!\nRequires: Print ability\n[E] to defeat';
                if (pressedE && inventory.includes('Print')) {
                    bugState.alive = false;
                    scene.remove(bugGroup);
                    completeQuest('defeat_bug');
                    addXP(30);
                    lessonText.innerText = '✓ Bug destroyed!\nprint() saves the day!';
                    controls.keys['KeyE'] = false;
                }
            }
            // boss spawn check — triggers when 4+ quests done
            if (!bossState.spawned && questsDoneCount() >= 7) spawnBoss();

            // boss interaction
            if (bossState.alive) {
                const bossDist = interactPos.distanceTo(bossGroup.position);
                if (bossDist < 5) {
                    interacting = true;
                    if (allSkillsUnlocked()) {
                        lessonText.innerText = '💀 FINAL BOSS\nYou have all skills!\n[E] to unleash your power!';
                        if (pressedE) {
                            defeatBoss();
                            completeQuest('defeat_boss');
                            addXP(200);
                            lessonText.innerText = '🏆 FINAL BOSS DEFEATED!\nYou are a Python Master!';
                            controls.keys['KeyE'] = false;
                        }
                    } else {
                        const have = ALL_SKILLS.filter(a => inventory.includes(a)).length;
                        lessonText.innerText = `💀 FINAL BOSS\nToo powerful!\nUnlock all 11 skills first.\n${have} / 11 skills`;
                    }
                }
            }

            // bridge gate
            const gateDist = Math.sqrt(interactPos.x**2 + (interactPos.z - (-54))**2);
            if (gateDist < 5) {
                interacting = true;
                if (allStarterUnlocked()) {
                    if (!gateState.open) { openGate(); updateProgressMap(); }
                    lessonText.innerText = '🌉 BRIDGE OPEN!\nWalk north to the mountain!\n↑ Keep walking';
                } else {
                    const have = STARTER_SKILLS.filter(s => inventory.includes(s)).length;
                    lessonText.innerText = `🔒 BRIDGE LOCKED\nMaster all 6 starter skills\n${have} / 6 unlocked`;
                }
            }
            // auto-cross when player walks to bridge end
            if (interactPos.z < BRIDGE_END_Z && gateState.open) goToIsland2();

        } else {
            // island 2 NPCs
            for (const npc of i2Npcs) {
                if (interactPos.distanceTo(npc.position) < 4) {
                    interacting = true;
                    const done = inventory.includes(npc.userData.ability);
                    showDialogue(npc.userData.name, done);
                    if (done) {
                        lessonText.innerText = `✓ ${npc.userData.ability} unlocked!\nKeep climbing! 🏔️`;
                        if (renderer.xr.isPresenting) { _vrCurrentNPC = npc.userData; showNPCPanel(npc.userData, npc.position); }
                    } else {
                        const idx = npc.userData.currentChallenge || 0;
                        lessonText.innerText = npc.userData.lesson + `\nChallenge ${idx+1}/${npc.userData.challenges.length}  [E] to start`;
                        if (renderer.xr.isPresenting) {
                            _vrCurrentNPC = npc.userData;
                            showNPCPanel(npc.userData, npc.position);
                        } else if (pressedE) {
                            openTerminal(npc.userData); controls.keys['KeyE'] = false;
                        }
                    }
                }
            }
            // return to island 1 — walk to edge
            const edgeDist = Math.sqrt((interactPos.x-I2.x)**2 + (interactPos.z-(I2.z+33))**2);
            if (edgeDist < 4) {
                interacting = true;
                lessonText.innerText = '🌉 Return to starter island?\n[E] to cross back';
                if (pressedE) { goToIsland1(); controls.keys['KeyE'] = false; }
            }
        }

        if (!interacting) {
            hideDialogue();
            if (renderer.xr.isPresenting) hideNPCPanel();
            if (zone === 'island2') {
                const h = interactPos.y;
                const hint = h > 18 ? '🏔️ Almost at the peak!' : h > 12 ? '⛰️ Halfway up!' : h > 5 ? '🌿 Keep climbing north!' : '🌉 Head toward the mountain!';
                lessonText.innerText = `${hint}\nFind each teacher on the way up.`;
            } else {
                if (bossState.alive) {
                    lessonText.innerText = `⚠ FINAL BOSS NEARBY!\nHead north — but get all 11 skills first!`;
                } else if (bossState.defeated) {
                    lessonText.innerText = `🏆 You defeated the Final Boss!\nPython Master, ${playerData.username}!`;
                } else {
                    lessonText.innerText = `Welcome, ${playerData.username}!\nExplore the island.\nWalk to a glowing teacher!`;
                }
            }
        }
    }

    // ── VR MOVEMENT ──────────────────────────────────────────────────────────────
    if (renderer.xr.isPresenting) {
        // always keep player hidden and underground — nothing should override this
        playerGroup.visible = false;
        playerGroup.position.y = -999;
        const session = renderer.xr.getSession();
        if (session) {
            // Get the camera's world quaternion (includes vrRig rotation)
            // so forward/right directions are correct even after snap-turning
            camera.getWorldQuaternion(_vrWorldQuat);

            for (const source of session.inputSources) {
                if (!source.gamepad) continue;
                const axes = source.gamepad.axes;
                // left thumbstick — move relative to headset facing direction
                if (source.handedness === 'left' && axes.length >= 4) {
                    const camDir = new THREE.Vector3(0, 0, -1).applyQuaternion(_vrWorldQuat);
                    camDir.y = 0; camDir.normalize();
                    const camRight = new THREE.Vector3(1, 0, 0).applyQuaternion(_vrWorldQuat);
                    camRight.y = 0; camRight.normalize();
                    if (Math.abs(axes[3]) > 0.12) vrRig.position.addScaledVector(camDir,  -axes[3] * SPEED * dt);
                    if (Math.abs(axes[2]) > 0.12) vrRig.position.addScaledVector(camRight, axes[2] * SPEED * dt);
                    const gY = zone === 'island2' ? getI2Height(vrRig.position.x, vrRig.position.z) : 0;
                    vrRig.position.y = gY; // rig at ground level, Quest tracking handles eye height
                    // sync x/z for collisions — keep player underground
                    playerGroup.position.x = vrRig.position.x;
                    playerGroup.position.z = vrRig.position.z;
                    playerGroup.position.y = -999;
                }
                // right thumbstick — smooth turn (rotate the rig, not the camera)
                if (source.handedness === 'right' && axes.length >= 4) {
                    if (Math.abs(axes[2]) > 0.12) vrRig.rotation.y -= axes[2] * 1.2 * dt;
                }
            }
        }
        resolveCollisions(vrRig);
        if (zone === 'island') resolveIslandBoundary(vrRig);
    }

    // animate companion + update profile data
    if (renderer.xr.isPresenting) {
        // detect movement from thumbstick axes, not keyboard keys
        let _vrIsMoving = false;
        const _mvSession = renderer.xr.getSession();
        if (_mvSession) {
            for (const src of _mvSession.inputSources) {
                if (src.handedness === 'left' && src.gamepad?.axes?.length >= 4) {
                    if (Math.abs(src.gamepad.axes[2]) > 0.12 || Math.abs(src.gamepad.axes[3]) > 0.12) {
                        _vrIsMoving = true;
                    }
                }
            }
        }
        animateCompanion(vrRig.position, vrRig.rotation.y, t, _vrIsMoving);

        // keep profile data fresh
        setProfileData({
            username:     playerData.username,
            level:        xpState.level,
            xp:           xpState.xp,
            xpNext:       xpState.xpToNext,
            skills:       [...inventory],
            bugDefeated:  inventory.includes('Print') && !bugState.alive,
            bossDefeated: bossState.defeated,
            quests: [
                { label:'📖 Learn Variables',       done: inventory.includes('Variable') },
                { label:'📖 Learn Print',           done: inventory.includes('Print') },
                { label:'🧪 Write your First Loop', done: inventory.includes('Loop') },
                { label:'🧠 Logical Thinker',       done: inventory.includes('Logic') },
                { label:'🔬 Learn 3 Skills',        done: inventory.length >= 3 },
                { label:'⚔️ Defeat the Bug',        done: !bugState.alive },
                { label:'🎓 Master all 6 Skills',   done: ['Variable','Constant','Print','Input','Logic','Loop'].every(s=>inventory.includes(s)) },
                { label:'🌉 Cross the Bridge',      done: zone === 'island2' || inventory.includes('Function') },
                { label:'⚙️ Learn Functions',       done: inventory.includes('Function') },
                { label:'🏔️ Reach the Peak',        done: inventory.includes('Class') },
                { label:'💀 Defeat the Final Boss', done: bossState.defeated },
            ],
        });
    }

    // 10. render
    renderer.render(scene, camera);
}

renderer.setAnimationLoop(animate);

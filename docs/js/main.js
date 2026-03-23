// main.js — entry point, username screen, game loop
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160/build/three.module.js';

import { renderer, scene, camera, MAT, playerData } from './state.js';
import './world.js';
import { sunSphere, clouds, birds }    from './environment.js';
import { sunLight, hemiLight as hemi } from './world.js';
import { playerGroup, cameraPivot, pArmL, pArmR, pLegL, pLegR, controls, GRAVITY, JUMP_V, SPEED } from './player.js';
import { resolveCollisions, resolveIslandBoundary } from './collision.js';
import { npcs }                         from './npcs.js';
import { bugGroup, bugLight, bugState } from './enemies.js';
import { inventory, completeQuest, loadProgress, questsDoneCount } from './inventory.js';
import { addXP }                        from './xp.js';
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
    scene.background = new THREE.Color(0x6080a0);
    scene.fog = new THREE.FogExp2(0x7090b0, 0.004);
    completeQuest('cross_bridge');
    updateProgressMap();
}
function goToIsland1() {
    zone = 'island';
    exitIsland2();
    playerGroup.position.set(0, 0, -50);
    scene.background = new THREE.Color(0x87ceeb);
    scene.fog = new THREE.FogExp2(0x87ceeb, 0.008);
    updateProgressMap();
}

// ── GAME LOOP ─────────────────────────────────────────────────────────────────
const clock = new THREE.Clock();
const SUN_ORBIT_RADIUS = 200;
const SUN_HEIGHT_BASE  = 80;

function animate() {
    requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.05);
    const t  = clock.elapsedTime;

    // 1. player movement
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

    // 2. sun (island 1 only)
    if (zone === 'island') {
        const sa = t * 0.015;
        const sx = Math.cos(sa) * SUN_ORBIT_RADIUS;
        const sy = Math.sin(sa) * SUN_HEIGHT_BASE + 40;
        const sz = Math.sin(sa * 0.5) * 60;
        sunLight.position.set(sx, sy, sz);
        sunSphere.position.set(sx, sy, sz);
        const hf  = Math.max(0, Math.min(1, sy / 120));
        sunLight.color.setHex(hf > 0.5 ? 0xfffbe0 : 0xff9933);
        sunSphere.material.color.setHex(hf > 0.5 ? 0xffdd44 : 0xff8800);
        const sky = new THREE.Color().lerpColors(new THREE.Color(0xff7733), new THREE.Color(0x87ceeb), hf);
        scene.background = sky;
        if (scene.fog) scene.fog.color = sky;
        hemi.color = sky;
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
    npcs.forEach((npc, i) => {
        npc.userData.light.intensity = 0.6 + Math.sin(t*2+i)*0.3;
        npc.rotation.y = Math.atan2(playerGroup.position.x-npc.position.x, playerGroup.position.z-npc.position.z);
    });
    i2Npcs.forEach((npc, i) => {
        npc.userData.light.intensity = 0.9 + Math.sin(t*1.8+i)*0.4;
        npc.rotation.y = Math.atan2(playerGroup.position.x-npc.position.x, playerGroup.position.z-npc.position.z);
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
    if (!terminalOpen) {
        let interacting = false;

        if (zone === 'island') {
            // NPCs
            for (const npc of npcs) {
                if (playerGroup.position.distanceTo(npc.position) < 4) {
                    interacting = true;
                    const done = inventory.includes(npc.userData.ability);
                    showDialogue(npc.userData.name, done);
                    if (done) {
                        lessonText.innerText = `✓ ${npc.userData.ability} unlocked!\nYou know this one!`;
                    } else {
                        const idx = npc.userData.currentChallenge || 0;
                        lessonText.innerText = npc.userData.lesson + `\nChallenge ${idx+1}/${npc.userData.challenges.length}  [E] to start`;
                        if (controls.keys['KeyE']) { openTerminal(npc.userData); controls.keys['KeyE'] = false; }
                    }
                }
            }
            // bug
            if (bugState.alive && playerGroup.position.distanceTo(bugGroup.position) < 3.5) {
                interacting = true;
                lessonText.innerText = '⚠ PYTHON BUG!\nRequires: Print ability\n[E] to defeat';
                if (controls.keys['KeyE'] && inventory.includes('Print')) {
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
                const bossDist = playerGroup.position.distanceTo(bossGroup.position);
                if (bossDist < 5) {
                    interacting = true;
                    if (allSkillsUnlocked()) {
                        lessonText.innerText = '💀 FINAL BOSS\nYou have all skills!\n[E] to unleash your power!';
                        if (controls.keys['KeyE']) {
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
            const gateDist = Math.sqrt(playerGroup.position.x**2 + (playerGroup.position.z - (-54))**2);
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
            if (playerGroup.position.z < BRIDGE_END_Z && gateState.open) goToIsland2();

        } else {
            // island 2 NPCs
            for (const npc of i2Npcs) {
                if (playerGroup.position.distanceTo(npc.position) < 4) {
                    interacting = true;
                    const done = inventory.includes(npc.userData.ability);
                    showDialogue(npc.userData.name, done);
                    if (done) {
                        lessonText.innerText = `✓ ${npc.userData.ability} unlocked!\nKeep climbing! 🏔️`;
                    } else {
                        const idx = npc.userData.currentChallenge || 0;
                        lessonText.innerText = npc.userData.lesson + `\nChallenge ${idx+1}/${npc.userData.challenges.length}  [E] to start`;
                        if (controls.keys['KeyE']) { openTerminal(npc.userData); controls.keys['KeyE'] = false; }
                    }
                }
            }
            // return to island 1 — walk to edge
            const edgeDist = Math.sqrt((playerGroup.position.x-I2.x)**2 + (playerGroup.position.z-(I2.z+33))**2);
            if (edgeDist < 4) {
                interacting = true;
                lessonText.innerText = '🌉 Return to starter island?\n[E] to cross back';
                if (controls.keys['KeyE']) { goToIsland1(); controls.keys['KeyE'] = false; }
            }
        }

        if (!interacting) {
            hideDialogue();
            if (zone === 'island2') {
                const h = playerGroup.position.y;
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

    // 10. render
    renderer.render(scene, camera);
}

animate();

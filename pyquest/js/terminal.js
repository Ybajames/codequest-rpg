// terminal.js — code terminal open/close/answer check
import { renderer } from './state.js';
import { unlockAbility } from './inventory.js';
import { addXP } from './xp.js';
import { playCorrect, playWrong, playUnlock } from './audio.js';

export let terminalOpen = false;
let currentNPC       = null;
let currentChallenge = null;
let attemptCount     = 0;

// dom refs
const terminalEl        = document.getElementById('terminal');
const terminalTitle     = document.getElementById('terminal-title');
const terminalNPCName   = document.getElementById('terminal-npc-name');
const terminalChallenge = document.getElementById('terminal-challenge');
const codeInput         = document.getElementById('codeInput');
const feedbackEl        = document.getElementById('terminal-feedback');
const feedbackIcon      = document.getElementById('feedback-icon');
const feedbackText      = document.getElementById('feedback-text');
const hintEl            = document.getElementById('terminal-hint');
const hintText          = document.getElementById('hint-text');
const attemptsText      = document.getElementById('attempts-text');
const challengeLevel    = document.getElementById('challenge-level');
const successOverlay    = document.getElementById('successOverlay');
const successAbility    = document.getElementById('success-ability');
const crosshair         = document.getElementById('crosshair');

export let overlayRef = null;
export function setOverlayRef(el) { overlayRef = el; }

// open terminal with the NPC's current active challenge
export function openTerminal(npcData) {
    currentNPC = npcData;
    terminalOpen = true;
    attemptCount = 0;

    // get the current challenge for this NPC
    const idx = npcData.currentChallenge || 0;
    currentChallenge = npcData.challenges[idx];

    // load content
    terminalNPCName.innerText   = npcData.name;
    terminalChallenge.innerText = currentChallenge.challenge;
    terminalTitle.innerText     = npcData.ability.toLowerCase() + '_challenge.py';
    attemptsText.innerText      = 'Attempts: 0';

    // show challenge level badge e.g. "Level 1 / 5 — 20 XP"
    challengeLevel.innerText = `Challenge ${idx + 1} / ${npcData.challenges.length}  ·  +${currentChallenge.xp} XP`;

    // reset ui
    codeInput.value      = '';
    feedbackEl.className = 'feedback-hidden';
    hintEl.className     = 'hint-hidden';
    hintText.innerText   = currentChallenge.hint;

    terminalEl.className = 'terminal-visible';
    crosshair.classList.add('hidden');
    document.exitPointerLock();
    if (overlayRef) overlayRef.style.display = 'none';

    setTimeout(() => codeInput.focus(), 350);
}

export function closeTerminal() {
    terminalOpen = false;
    currentNPC   = null;
    currentChallenge = null;
    terminalEl.className = 'terminal-hidden';
    crosshair.classList.remove('hidden');
    setTimeout(() => renderer.domElement.requestPointerLock(), 100);
}

// normalize before comparing — handles spacing differences
function normalizeCode(str) {
    return str.trim().toLowerCase()
        .replace(/\s+/g, ' ')
        .replace(/\s*=\s*/g, '=')
        .replace(/\s*>\s*/g, '>')
        .replace(/\s*<\s*/g, '<')
        .replace(/\s*\(\s*/g, '(')
        .replace(/\s*\)\s*/g, ')')
        .replace(/\s*:\s*$/, ':');
}

// Smart answer checking — handles pattern wildcards like {STRING} and {ANY_NAME}
function checkAnswer(input, solutions) {
    const n = normalizeCode(input);
    return solutions.some(s => {
        const ns = normalizeCode(s);
        // If solution contains {STRING} wildcard — match any quoted string assignment
        if (ns.includes('{string}')) {
            const pattern = ns.replace('{string}', '(?:\'[^\']*\'|"[^"]*")');
            return new RegExp('^' + pattern + '$').test(n);
        }
        // If solution contains {ANY} wildcard — match any value
        if (ns.includes('{any}')) {
            const pattern = ns.replace('{any}', '.+');
            return new RegExp('^' + pattern + '$').test(n);
        }
        return ns === n;
    });
}

function submitAnswer() {
    if (!currentNPC || !currentChallenge) return;
    const input = codeInput.value;
    if (!input.trim()) return;

    attemptCount++;
    attemptsText.innerText = `Attempts: ${attemptCount}`;

    if (checkAnswer(input, currentChallenge.solutions)) {
        // correct
        feedbackEl.className   = 'feedback-success';
        feedbackIcon.innerText = '✓';
        feedbackText.innerText = 'Correct! Great work!';

        playCorrect();
        setTimeout(() => playUnlock(), 700);

        // award XP for this specific challenge
        addXP(currentChallenge.xp, 'Challenge Complete!');

        // mark this challenge done + advance to next
        const idx = currentNPC.currentChallenge || 0;
        currentNPC.completed.push(idx);
        const nextIdx = idx + 1;

        if (nextIdx >= currentNPC.challenges.length) {
            // all challenges for this NPC done — unlock ability
            unlockAbility(currentNPC.ability);
            const abilityName = currentNPC.ability;
            setTimeout(() => {
                closeTerminal();
                showSuccessFlash(abilityName);
            }, 800);
        } else {
            // more challenges left — advance and show next after delay
            currentNPC.currentChallenge = nextIdx;
            feedbackText.innerText = `Correct! Challenge ${nextIdx + 1} unlocked! 🔓`;
            setTimeout(() => {
                openTerminal(currentNPC);
            }, 1200);
        }

    } else {
        // wrong
        feedbackEl.className   = 'feedback-error';
        feedbackIcon.innerText = '✗';
        playWrong();

        if (attemptCount === 1) {
            feedbackText.innerText = "Not quite. Check your syntax and try again.";
        } else if (attemptCount === 2) {
            feedbackText.innerText = "Still not right — try the Hint button!";
            hintEl.className = '';
        } else {
            feedbackText.innerText = "Keep going! The hint shows the exact answer.";
            hintEl.className = '';
        }

        codeInput.classList.add('shake');
        setTimeout(() => codeInput.classList.remove('shake'), 400);
        codeInput.focus();
    }
}

function showSuccessFlash(abilityName) {
    successAbility.innerText = abilityName;
    successOverlay.className = 'success-visible';
    setTimeout(() => { successOverlay.className = 'success-hidden'; }, 2500);
}

// button events
document.getElementById('btn-submit').addEventListener('click', submitAnswer);
document.getElementById('btn-hint').addEventListener('click', () => { hintEl.className = ''; codeInput.focus(); });
document.getElementById('terminal-close').addEventListener('click', closeTerminal);
codeInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitAnswer(); }
});

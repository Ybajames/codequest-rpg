// ─────────────────────────────────────────────────────────────────────────────
//  terminal.js
//  The code terminal — pops up when player presses E near an NPC.
//  Student types real Python, we check it against accepted solutions.
//
//  Exports:
//    terminalOpen    — boolean, read by main.js to freeze player movement
//    openTerminal()  — call with npc.userData when player presses E
//    closeTerminal() — called by ESC or X button
// ─────────────────────────────────────────────────────────────────────────────
import { renderer } from './state.js';
import { unlockAbility } from './inventory.js';
import { addXP } from './xp.js';
import { playCorrect, playWrong, playUnlock } from './audio.js';

// ── STATE ─────────────────────────────────────────────────────────────────────
export let terminalOpen = false;
let currentNPC   = null;
let attemptCount = 0;

// ── DOM REFERENCES ────────────────────────────────────────────────────────────
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
const successOverlay    = document.getElementById('successOverlay');
const successAbility    = document.getElementById('success-ability');
const crosshair         = document.getElementById('crosshair');

// We need a reference to the overlay to hide it while terminal is open
// This is set from main.js after the overlay is created
export let overlayRef = null;
export function setOverlayRef(el) { overlayRef = el; }

// ── OPEN TERMINAL ─────────────────────────────────────────────────────────────
// Slides the terminal up, releases pointer lock, focuses the input
export function openTerminal(npcData) {
    currentNPC   = npcData;
    terminalOpen = true;
    attemptCount = 0;

    // Load this NPC's challenge into the terminal
    terminalNPCName.innerText   = npcData.name;
    terminalChallenge.innerText = npcData.challenge;
    terminalTitle.innerText     = npcData.ability.toLowerCase() + '_challenge.py';
    attemptsText.innerText      = 'Attempts: 0';

    // Reset all UI state
    codeInput.value      = '';
    feedbackEl.className = 'feedback-hidden';
    hintEl.className     = 'hint-hidden';
    hintText.innerText   = npcData.hint;

    // Slide terminal up into view
    terminalEl.className = 'terminal-visible';

    // Hide crosshair — player isn't aiming at anything right now
    crosshair.classList.add('hidden');

    // Release pointer lock so player can type freely
    document.exitPointerLock();
    if (overlayRef) overlayRef.style.display = 'none';

    // Auto-focus the code input after the slide animation finishes
    setTimeout(() => codeInput.focus(), 350);
}

// ── CLOSE TERMINAL ────────────────────────────────────────────────────────────
// Slides terminal back down, re-locks pointer
export function closeTerminal() {
    terminalOpen = false;
    currentNPC   = null;

    terminalEl.className = 'terminal-hidden';
    crosshair.classList.remove('hidden');

    // Re-engage pointer lock after a small delay
    setTimeout(() => renderer.domElement.requestPointerLock(), 100);
}

// ── ANSWER NORMALIZER ─────────────────────────────────────────────────────────
// We normalize both the student's input and each accepted solution before comparing.
// This means extra spaces, different spacing around operators — all accepted.
// "score = 10", "score=10", "  score  =  10  " all count as correct.
function normalizeCode(str) {
    return str
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ')        // collapse multiple spaces
        .replace(/\s*=\s*/g, '=')    // normalize spaces around =
        .replace(/\s*>\s*/g, '>')    // normalize spaces around >
        .replace(/\s*<\s*/g, '<')
        .replace(/\s*\(\s*/g, '(')   // normalize spaces inside parens
        .replace(/\s*\)\s*/g, ')')
        .replace(/\s*:\s*$/, ':');   // normalize trailing colon
}

function checkAnswer(input, solutions) {
    const normalized = normalizeCode(input);
    return solutions.some(sol => normalizeCode(sol) === normalized);
}

// ── SUBMIT ANSWER ─────────────────────────────────────────────────────────────
function submitAnswer() {
    if (!currentNPC) return;

    const input = codeInput.value;
    if (!input.trim()) return; // ignore empty submit

    attemptCount++;
    attemptsText.innerText = `Attempts: ${attemptCount}`;

    if (checkAnswer(input, currentNPC.solutions)) {
        // ── CORRECT ──
        feedbackEl.className   = 'feedback-success';
        feedbackIcon.innerText = '✓';
        feedbackText.innerText = 'Correct! Great work!';

        // Play correct chime immediately, unlock sound plays with the flash
        playCorrect();
        setTimeout(() => playUnlock(), 700);

        // Unlock the ability — this also updates the quest tracker
        unlockAbility(currentNPC.ability);

        // Award XP — 50 per completed challenge
        addXP(50, 'Challenge Complete!');

        // Close terminal after a moment, then show the big success flash
        const abilityName = currentNPC.ability;
        setTimeout(() => {
            closeTerminal();
            showSuccessFlash(abilityName);
        }, 800);

    } else {
        // ── WRONG ──
        feedbackEl.className   = 'feedback-error';
        feedbackIcon.innerText = '✗';
        playWrong();

        // Escalating hints based on attempt count
        if (attemptCount === 1) {
            feedbackText.innerText = "Not quite. Check your spelling and try again.";
        } else if (attemptCount === 2) {
            feedbackText.innerText = "Still not right. Try the Hint button!";
            hintEl.className = ''; // auto-show hint after 2 wrong tries
        } else {
            feedbackText.innerText = "Keep going! The hint shows the exact answer.";
            hintEl.className = '';
        }

        // Shake the editor — visual feedback that something went wrong
        codeInput.classList.add('shake');
        setTimeout(() => codeInput.classList.remove('shake'), 400);

        codeInput.focus();
    }
}

// ── SUCCESS FLASH ─────────────────────────────────────────────────────────────
// Big centered overlay — "ABILITY UNLOCKED" — fades out after 2.5 seconds
function showSuccessFlash(abilityName) {
    successAbility.innerText = abilityName;
    successOverlay.className = 'success-visible';
    setTimeout(() => { successOverlay.className = 'success-hidden'; }, 2500);
}

// ── BUTTON + KEYBOARD EVENTS ──────────────────────────────────────────────────
document.getElementById('btn-submit').addEventListener('click', submitAnswer);

document.getElementById('btn-hint').addEventListener('click', () => {
    hintEl.className = '';
    codeInput.focus();
});

document.getElementById('terminal-close').addEventListener('click', closeTerminal);

// Enter = submit, Shift+Enter = new line (normal behaviour)
codeInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        submitAnswer();
    }
});

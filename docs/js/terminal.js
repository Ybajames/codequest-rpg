// terminal.js — inline Python code challenge terminal
// Used by NPC skill teachers on the island.
import { playCorrect, playWrong, playUnlock } from './audio.js';
import { unlockAbility }  from './inventory.js';
import { addXP }          from './xp.js';

export let terminalOpen = false;

// ── DOM ───────────────────────────────────────────────────────────────────────
const overlay = document.createElement('div');
overlay.id = 'terminalOverlay';
overlay.innerHTML = `
  <div id="terminalBox">
    <div id="terminalHeader">
      <span id="terminalTitle">Challenge</span>
      <button id="terminalClose">✕ CLOSE</button>
    </div>
    <div id="challengeDesc"></div>
    <div id="challengeHint"></div>
    <textarea id="codeEditor" spellcheck="false" placeholder="# Write your Python answer here…"></textarea>
    <div id="terminalFooter">
      <button id="runBtn">▶ RUN</button>
      <button id="hintBtn">💡 HINT</button>
      <div id="progressPips"></div>
    </div>
    <div id="terminalOutput"></div>
  </div>
`;
document.body.appendChild(overlay);

const termTitle   = document.getElementById('terminalTitle');
const descEl      = document.getElementById('challengeDesc');
const hintEl      = document.getElementById('challengeHint');
const editor      = document.getElementById('codeEditor');
const runBtn      = document.getElementById('runBtn');
const hintBtn     = document.getElementById('hintBtn');
const pipsEl      = document.getElementById('progressPips');
const outputEl    = document.getElementById('terminalOutput');
const closeBtn    = document.getElementById('terminalClose');

// ── STATE ─────────────────────────────────────────────────────────────────────
let currentNPC       = null;
let currentChallenge = 0;
let solved           = [];

// ── OPEN / CLOSE ──────────────────────────────────────────────────────────────
export function openTerminal(npcData) {
    currentNPC       = npcData;
    currentChallenge = npcData.currentChallenge || 0;
    solved           = npcData.solved           || [];
    terminalOpen     = true;
    overlay.classList.add('open');
    document.exitPointerLock();
    loadChallenge();
}

export function closeTerminal() {
    terminalOpen = false;
    overlay.classList.remove('open');
    setTimeout(() => document.querySelector('canvas')?.requestPointerLock(), 150);
}

closeBtn.addEventListener('click', closeTerminal);
overlay.addEventListener('click', e => { if (e.target === overlay) closeTerminal(); });

// ── LOAD CHALLENGE ────────────────────────────────────────────────────────────
function loadChallenge() {
    const ch = currentNPC.challenges[currentChallenge];
    if (!ch) return;

    termTitle.innerText      = `${currentNPC.name} — ${currentNPC.ability} (${currentChallenge + 1}/${currentNPC.challenges.length})`;
    descEl.innerText         = ch.description;
    editor.value             = ch.starter || '';
    outputEl.innerText       = '';
    outputEl.className       = '';
    hintEl.style.display     = 'none';
    hintEl.innerText         = '';

    // Build progress pips
    pipsEl.innerHTML = '';
    currentNPC.challenges.forEach((_, i) => {
        const pip = document.createElement('div');
        pip.className = 'pip' + (solved.includes(i) ? ' done' : i === currentChallenge ? ' active' : '');
        pipsEl.appendChild(pip);
    });
}

// ── HINT ──────────────────────────────────────────────────────────────────────
hintBtn.addEventListener('click', () => {
    const ch = currentNPC.challenges[currentChallenge];
    if (!ch) return;
    hintEl.innerText     = '💡 ' + ch.hint;
    hintEl.style.display = 'block';
    addXP(-5, 'hint used'); // small xp cost for using hint
});

// ── RUN CODE (simulated Python evaluator) ────────────────────────────────────
runBtn.addEventListener('click', runCode);
editor.addEventListener('keydown', e => {
    // Tab inserts spaces
    if (e.key === 'Tab') {
        e.preventDefault();
        const s = editor.selectionStart, en = editor.selectionEnd;
        editor.value = editor.value.slice(0,s) + '    ' + editor.value.slice(en);
        editor.selectionStart = editor.selectionEnd = s + 4;
    }
    if (e.key === 'Enter' && e.ctrlKey) runCode();
});

function runCode() {
    const ch   = currentNPC.challenges[currentChallenge];
    const code = editor.value.trim();

    if (!code) {
        showOutput('Write some code first!', true);
        return;
    }

    // Validate answer using checker function
    try {
        const result = ch.check(code);
        if (result === true || result === 'pass') {
            onCorrect(ch);
        } else {
            const msg = typeof result === 'string' ? result : '❌ Not quite. Check your logic and try again.';
            showOutput(msg, true);
            playWrong();
        }
    } catch (e) {
        showOutput('⚠️ Error checking your code: ' + e.message, true);
        playWrong();
    }
}

function onCorrect(ch) {
    playCorrect();
    showOutput('✅ Correct! ' + (ch.successMsg || 'Well done!'), false);
    addXP(30, 'challenge solved');

    if (!solved.includes(currentChallenge)) {
        solved.push(currentChallenge);
        currentNPC.solved = solved;
    }

    // Update pip
    const pips = pipsEl.querySelectorAll('.pip');
    if (pips[currentChallenge]) {
        pips[currentChallenge].className = 'pip done';
    }

    // Check if all challenges done → unlock ability
    if (solved.length >= currentNPC.challenges.length) {
        setTimeout(() => {
            playUnlock();
            flashUnlock(currentNPC.ability);
            unlockAbility(currentNPC.ability);
            addXP(100, 'ability unlocked');
            closeTerminal();
        }, 1200);
    } else {
        // Advance to next unsolved challenge
        setTimeout(() => {
            let next = (currentChallenge + 1) % currentNPC.challenges.length;
            while (solved.includes(next) && solved.length < currentNPC.challenges.length) {
                next = (next + 1) % currentNPC.challenges.length;
            }
            currentChallenge = next;
            currentNPC.currentChallenge = next;
            loadChallenge();
        }, 1500);
    }
}

function showOutput(msg, isError) {
    outputEl.innerText = msg;
    outputEl.className = isError ? 'error' : '';
}

// ── UNLOCK FLASH ──────────────────────────────────────────────────────────────
function flashUnlock(abilityName) {
    const flash = document.getElementById('unlockFlash');
    if (!flash) return;
    flash.querySelector('.unlock-title').innerText = `⚡ ${abilityName.toUpperCase()} UNLOCKED!`;
    flash.querySelector('.unlock-sub').innerText   = 'New Python skill added to your inventory!';
    flash.classList.add('show');
    setTimeout(() => flash.classList.remove('show'), 2500);
}

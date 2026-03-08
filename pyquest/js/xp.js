// ─────────────────────────────────────────────────────────────────────────────
//  xp.js
//  Manages the player's XP and level.
//
//  How it works:
//    - Player earns XP by completing challenges and defeating enemies
//    - Every 100 XP = level up (we'll make this scale later)
//    - The XP bar on the HUD fills smoothly using CSS width transitions
//    - Level up triggers a big flash overlay (same style as ability unlock)
//
//  Exports:
//    addXP(amount, reason) — call this from anywhere to give the player XP
//    xpState              — current { xp, level, xpToNext } if needed elsewhere
// ─────────────────────────────────────────────────────────────────────────────

import { playLevelUp } from './audio.js';

// ── XP STATE ──────────────────────────────────────────────────────────────────
export const xpState = {
    level:    1,
    xp:       0,       // current XP within this level
    xpToNext: 100,     // XP needed to reach next level
    totalXP:  0,       // total XP ever earned (useful for leaderboard later)
};

// ── DOM REFERENCES ────────────────────────────────────────────────────────────
const xpFill        = document.getElementById('xpFill');
const xpText        = document.getElementById('xpText');
const levelText     = document.getElementById('levelText');
const levelUpOverlay = document.getElementById('levelUpOverlay');
const levelUpNumber  = document.getElementById('levelUpNumber');

// ── ADD XP ────────────────────────────────────────────────────────────────────
// Call this whenever the player earns XP
// reason = short string shown briefly (e.g. "Challenge Complete!")
export function addXP(amount, reason = '') {
    xpState.xp      += amount;
    xpState.totalXP += amount;

    // Check for level up — could level up multiple times if amount is large
    while (xpState.xp >= xpState.xpToNext) {
        xpState.xp      -= xpState.xpToNext;
        xpState.level   += 1;
        // Each level needs slightly more XP — adds 20 per level
        // Level 1→2: 100 XP, 2→3: 120 XP, 3→4: 140 XP etc.
        xpState.xpToNext = 100 + (xpState.level - 1) * 20;
        showLevelUp(xpState.level);
    }

    updateXPBar();
}

// ── UPDATE XP BAR ─────────────────────────────────────────────────────────────
// Updates the visual bar and text — called after every XP change
function updateXPBar() {
    const pct = Math.min(100, (xpState.xp / xpState.xpToNext) * 100);

    // CSS transition on width gives us the smooth fill animation for free
    xpFill.style.width = pct + '%';

    // Text shows current XP / XP needed
    xpText.innerText  = `${xpState.xp} / ${xpState.xpToNext} XP`;
    levelText.innerText = `LVL ${xpState.level}`;
}

// ── LEVEL UP FLASH ────────────────────────────────────────────────────────────
// Big centered overlay — same style as ability unlock
// Fades out after 2.5 seconds
function showLevelUp(newLevel) {
    levelUpNumber.innerText = `LEVEL ${newLevel}`;
    levelUpOverlay.className = 'levelup-visible';
    playLevelUp();

    setTimeout(() => {
        levelUpOverlay.className = 'levelup-hidden';
    }, 2500);
}

// Initialise the bar on load
updateXPBar();

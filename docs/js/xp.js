// xp.js — XP bar, leveling, level-up fanfare
import { playLevelUp } from './audio.js';

export const xpState = {
    totalXP: 0,
    level:   1,
    xpToNext: 100,
};

const xpFill  = document.getElementById('xpFill');
const xpLabel = document.getElementById('xpLabel');

// Flash overlay
const unlockFlash = document.createElement('div');
unlockFlash.id = 'unlockFlash';
unlockFlash.innerHTML = `<div class="unlock-title"></div><div class="unlock-sub"></div>`;
document.body.appendChild(unlockFlash);

export function addXP(amount, reason = '') {
    xpState.totalXP = Math.max(0, xpState.totalXP + amount);
    while (xpState.totalXP >= xpState.xpToNext) {
        xpState.totalXP  -= xpState.xpToNext;
        xpState.level    += 1;
        xpState.xpToNext  = Math.floor(xpState.xpToNext * 1.4);
        onLevelUp();
    }
    updateBar();
}

function updateBar() {
    const pct = (xpState.totalXP / xpState.xpToNext) * 100;
    xpFill.style.width = pct + '%';
    xpLabel.innerText  = `LVL ${xpState.level} — ${xpState.totalXP}/${xpState.xpToNext} XP`;
}

function onLevelUp() {
    playLevelUp();
    const t  = unlockFlash.querySelector('.unlock-title');
    const s  = unlockFlash.querySelector('.unlock-sub');
    t.innerText = `⬆ LEVEL ${xpState.level}`;
    s.innerText = 'Keep learning — you\'re on fire!';
    unlockFlash.classList.add('show');
    setTimeout(() => unlockFlash.classList.remove('show'), 2200);
}

updateBar();

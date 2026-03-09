// xp.js — XP tracking, leveling, HUD bar
import { playLevelUp } from './audio.js';

export const xpState = {
    level:    1,
    xp:       0,
    xpToNext: 100,
    totalXP:  0,
};

const xpFill         = document.getElementById('xpFill');
const xpText         = document.getElementById('xpText');
const levelText      = document.getElementById('levelText');
const levelUpOverlay = document.getElementById('levelUpOverlay');
const levelUpNumber  = document.getElementById('levelUpNumber');

export function addXP(amount) {
    xpState.xp      += amount;
    xpState.totalXP += amount;

    // level up — scales by 20 XP per level
    while (xpState.xp >= xpState.xpToNext) {
        xpState.xp      -= xpState.xpToNext;
        xpState.level   += 1;
        xpState.xpToNext = 100 + (xpState.level - 1) * 20;
        showLevelUp(xpState.level);
    }
    updateXPBar();
}

function updateXPBar() {
    const pct = Math.min(100, (xpState.xp / xpState.xpToNext) * 100);
    xpFill.style.width  = pct + '%';
    xpText.innerText    = `${xpState.xp} / ${xpState.xpToNext} XP`;
    levelText.innerText = `LVL ${xpState.level}`;
}

function showLevelUp(newLevel) {
    levelUpNumber.innerText  = `LEVEL ${newLevel}`;
    levelUpOverlay.className = 'levelup-visible';
    playLevelUp();
    setTimeout(() => { levelUpOverlay.className = 'levelup-hidden'; }, 2500);
}

updateXPBar();

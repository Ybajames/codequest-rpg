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

export function addXP(amount, label = 'XP Earned') {
    xpState.xp      += amount;
    xpState.totalXP += amount;
    showXPToast(amount, label);

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

function showXPToast(amount, label) {
    const toast = document.createElement('div');
    toast.className = 'xp-toast';
    toast.innerHTML = `<span class="xp-toast-plus">+${amount} XP</span><span class="xp-toast-label">${label}</span>`;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('xp-toast-show'));
    setTimeout(() => {
        toast.classList.remove('xp-toast-show');
        setTimeout(() => toast.remove(), 500);
    }, 1800);
}

function showLevelUp(newLevel) {
    levelUpNumber.innerText  = `LEVEL ${newLevel}`;
    levelUpOverlay.className = 'levelup-visible';
    playLevelUp();
    setTimeout(() => { levelUpOverlay.className = 'levelup-hidden'; }, 2500);
}

updateXPBar();

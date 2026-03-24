import { saveToCloud, loadFromCloud, ensureStudent } from './supabase.js';
// inventory.js — ability unlocks + quest tracker
export const inventory = [];

const inventoryList = document.getElementById('inventoryList');

const flags = { bugDefeated: false, islandCrossed: false, bossDefeated: false };

// ── PERSISTENCE ───────────────────────────────────────────────────────────────
const SAVE_KEY = 'codequest_save';

export function saveProgress() {
    const data = {
        inventory: [...inventory],
        flags: { bugDefeated: flags.bugDefeated, islandCrossed: flags.islandCrossed },
    };
    try {
        localStorage.setItem(SAVE_KEY, JSON.stringify(data));
        const ind = document.getElementById('save-indicator');
        if (ind) { ind.classList.remove('saving'); void ind.offsetWidth; ind.classList.add('saving'); setTimeout(() => ind.classList.remove('saving'), 1500); }
    } catch(e) {}
    // also save to cloud
    const username = window._playerUsername;
    if (username) {
        saveToCloud(username, {
            inventory:     [...inventory],
            bugDefeated:   flags.bugDefeated,
            islandCrossed: flags.islandCrossed,
            bossDefeated:  flags.bossDefeated,
            xp:            window._xpTotal  || 0,
            level:         window._xpLevel  || 1,
        });
    }
}

export async function loadProgress() {
    const username = window._playerUsername;
    // try cloud first
    if (username) {
        await ensureStudent(username);
        const cloud = await loadFromCloud(username);
        if (cloud) {
            cloud.inventory.forEach(name => unlockAbility(name, true));
            flags.bugDefeated   = cloud.bugDefeated;
            flags.islandCrossed = cloud.islandCrossed;
            flags.bossDefeated  = cloud.bossDefeated;
            updateQuests();
            return;
        }
    }
    // fallback to localStorage
    try {
        const raw = localStorage.getItem(SAVE_KEY);
        if (!raw) return;
        const data = JSON.parse(raw);
        if (data.inventory) data.inventory.forEach(name => unlockAbility(name, true));
        if (data.flags) {
            flags.bugDefeated   = data.flags.bugDefeated   || false;
            flags.islandCrossed = data.flags.islandCrossed || false;
        }
        updateQuests();
    } catch(e) {}
}

export function clearProgress() {
    try { localStorage.removeItem(SAVE_KEY); } catch(e) {}
}

export function unlockAbility(name, silent = false) {
    if (inventory.includes(name)) return;
    inventory.push(name);
    const li = document.createElement('li');
    li.className = 'ability-card' + (silent ? '' : ' ability-new');
    li.innerHTML = `<span class="ability-icon">${getAbilityIcon(name)}</span><span class="ability-name">${name}</span>`;
    inventoryList.appendChild(li);
    if (!silent) saveProgress();
    updateQuests();
}

function getAbilityIcon(name) {
    const icons = { Variable:'$', Constant:'π', Print:'▶', Input:'⌨', Logic:'?', Loop:'↻', Function:'ƒ', List:'[]', String:'"A"', Dictionary:'{}', Class:'◈' };
    return icons[name] || '⚡';
}

const STARTER_SKILLS = ['Variable','Constant','Print','Input','Logic','Loop'];
const ALL_SKILLS     = [...STARTER_SKILLS,'Function','List','String','Dictionary','Class'];

const QUESTS = [
    // starter village
    { id: 'learn_variables', label: '📖 Learn Variables',        check: () => inventory.includes('Variable'),  done: false },
    { id: 'learn_print',     label: '📖 Learn Print',            check: () => inventory.includes('Print'),     done: false },
    { id: 'first_loop',      label: '🧪 Write your First Loop',  check: () => inventory.includes('Loop'),      done: false },
    { id: 'logical_thinker', label: '🧠 Logical Thinker',        check: () => inventory.includes('Logic'),     done: false },
    { id: 'learn_three',     label: '🔬 Learn 3 Skills',         check: () => inventory.length >= 3,           done: false },
    { id: 'defeat_bug',      label: '⚔️ Defeat the Bug',         check: () => flags.bugDefeated,               done: false },
    { id: 'master_all',      label: '🎓 Master all 6 Skills',    check: () => STARTER_SKILLS.every(a => inventory.includes(a)), done: false },
    // mountain island
    { id: 'cross_bridge',    label: '🌉 Cross the Bridge',       check: () => flags.islandCrossed,             done: false },
    { id: 'learn_functions', label: '⚙️ Learn Functions',        check: () => inventory.includes('Function'),  done: false },
    { id: 'reach_peak',      label: '🏔️ Reach the Peak',         check: () => inventory.includes('Class'),     done: false },
    { id: 'completionist',   label: '🏆 Master all 11 Skills',   check: () => ALL_SKILLS.every(a => inventory.includes(a)) && flags.bugDefeated, done: false },
    { id: 'defeat_boss',     label: '💀 Defeat the Final Boss',  check: () => flags.bossDefeated, done: false },
];

export function completeQuest(id) {
    if (id === 'defeat_bug')    flags.bugDefeated   = true;
    if (id === 'cross_bridge')  flags.islandCrossed = true;
    if (id === 'defeat_boss')   flags.bossDefeated  = true;
    saveProgress();
    updateQuests();
}

const questList = document.getElementById('questList');

function updateQuests() {
    QUESTS.forEach(q => { if (!q.done && q.check()) q.done = true; });
    renderQuestTracker();
}

function renderQuestTracker() {
    questList.innerHTML = '';
    QUESTS.forEach(q => {
        const li = document.createElement('li');
        li.className = q.done ? 'quest-done' : 'quest-active';
        li.innerText = (q.done ? '✓ ' : '○ ') + q.label;
        questList.appendChild(li);
    });
}

renderQuestTracker();

// How many quests are currently completed — used by main.js to trigger boss spawn
export function questsDoneCount() {
    return QUESTS.filter(q => q.done).length;
}

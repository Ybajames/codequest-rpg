// ─────────────────────────────────────────────────────────────────────────────
//  inventory.js
//  Manages the player's unlocked abilities AND the quest tracker.
// ─────────────────────────────────────────────────────────────────────────────

// ── INVENTORY ─────────────────────────────────────────────────────────────────
export const inventory = [];

const inventoryList = document.getElementById('inventoryList');

export function unlockAbility(name) {
    if (inventory.includes(name)) return;
    inventory.push(name);
    const li = document.createElement('li');
    li.innerText = name;
    inventoryList.appendChild(li);
    updateQuests();
}

// ── INTERNAL FLAGS ────────────────────────────────────────────────────────────
// For quests triggered by events outside of ability unlocks
const flags = { bugDefeated: false };

// ── QUEST DEFINITIONS ─────────────────────────────────────────────────────────
const QUESTS = [
    {
        id:    'learn_variables',
        label: '📖 Learn Variables',
        check: () => inventory.includes('Variable'),
        done:  false,
    },
    {
        id:    'learn_print',
        label: '📖 Learn Print',
        check: () => inventory.includes('Print'),
        done:  false,
    },
    {
        id:    'first_loop',
        label: '🧪 Write your First Loop',
        check: () => inventory.includes('Loop'),
        done:  false,
    },
    {
        id:    'logical_thinker',
        label: '🧠 Logical Thinker',
        check: () => inventory.includes('Logic'),
        done:  false,
    },
    {
        id:    'learn_three',
        label: '🔬 Learn 3 Skills',
        check: () => inventory.length >= 3,
        done:  false,
    },
    {
        id:    'defeat_bug',
        label: '⚔️ Defeat the Bug',
        check: () => flags.bugDefeated,
        done:  false,
    },
    {
        id:    'master_all',
        label: '🎓 Master all 6 Skills',
        check: () => ['Variable','Constant','Print','Input','Logic','Loop']
                       .every(a => inventory.includes(a)),
        done:  false,
    },
    {
        id:    'completionist',
        label: '🏆 Completionist',
        check: () => flags.bugDefeated &&
                     ['Variable','Constant','Print','Input','Logic','Loop']
                       .every(a => inventory.includes(a)),
        done:  false,
    },
];

// completeQuest — called externally for flag-based quests
export function completeQuest(id) {
    if (id === 'defeat_bug') flags.bugDefeated = true;
    updateQuests();
}

// ── QUEST TRACKER UI ──────────────────────────────────────────────────────────
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

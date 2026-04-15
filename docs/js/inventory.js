// inventory.js — ability unlocks + quest tracker
export const inventory = [];

const inventoryList = document.getElementById('inventoryList');
const flags = { enteredArena: false, enteredRace: false };

const SAVE_KEY = 'codequest_save';

export function saveProgress() {
    const data = {
        inventory: [...inventory],
        flags: { enteredArena: flags.enteredArena, enteredRace: flags.enteredRace },
        xp:    window._xpTotal  || 0,
        level: window._xpLevel  || 1,
    };
    try {
        localStorage.setItem(SAVE_KEY, JSON.stringify(data));
        const ind = document.getElementById('save-indicator');
        if (ind) {
            ind.classList.remove('saving');
            void ind.offsetWidth;
            ind.classList.add('saving');
            setTimeout(() => ind.classList.remove('saving'), 1500);
        }
    } catch(e) {}
}

export async function loadProgress() {
    try {
        const raw = localStorage.getItem(SAVE_KEY);
        if (!raw) return;
        const data = JSON.parse(raw);
        if (data.inventory) data.inventory.forEach(name => unlockAbility(name, true));
        if (data.flags) {
            flags.enteredArena = data.flags.enteredArena || false;
            flags.enteredRace  = data.flags.enteredRace  || false;
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
    const icons = {
        Variable:'$', Constant:'π', Print:'▶', Input:'⌨',
        Logic:'?', Loop:'↻', Function:'ƒ', List:'[]',
        String:'"A"', Dictionary:'{}', Class:'◈'
    };
    return icons[name] || '⚡';
}

const STARTER_SKILLS = ['Variable','Print','Input','Logic','Loop','Function'];

const QUESTS = [
    { id:'learn_variables', label:'📖 Learn Variables',       check: () => inventory.includes('Variable'), done:false },
    { id:'learn_print',     label:'📖 Learn Print',           check: () => inventory.includes('Print'),    done:false },
    { id:'first_loop',      label:'🧪 Write your First Loop', check: () => inventory.includes('Loop'),     done:false },
    { id:'logical_thinker', label:'🧠 Logical Thinker',       check: () => inventory.includes('Logic'),    done:false },
    { id:'learn_three',     label:'🔬 Learn 3 Skills',        check: () => inventory.length >= 3,          done:false },
    { id:'master_all',      label:'🎓 Master all 6 Skills',   check: () => STARTER_SKILLS.every(a => inventory.includes(a)), done:false },
    { id:'enter_arena',     label:'⚔️ Enter Code Arena',      check: () => flags.enteredArena,             done:false },
    { id:'enter_race',      label:'🏎️ Enter Code Race',       check: () => flags.enteredRace,              done:false },
];

export function completeQuest(id) {
    if (id === 'enter_arena') flags.enteredArena = true;
    if (id === 'enter_race')  flags.enteredRace  = true;
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
        li.innerText  = (q.done ? '✓ ' : '○ ') + q.label;
        questList.appendChild(li);
    });
}

document.getElementById('quest-btn').addEventListener('click', () => {
    const panel = document.getElementById('quests');
    panel.style.display = panel.style.display === 'block' ? 'none' : 'block';
});

renderQuestTracker();

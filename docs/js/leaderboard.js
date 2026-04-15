// leaderboard.js — localStorage leaderboard for quiz + arena scores
// Stores top 10 scores per game mode, shown in a panel

const STORAGE_KEY = 'codequest_leaderboard';

function load() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || { quiz:[], arena:[], race:[] }; }
    catch { return { quiz:[], arena:[], race:[] }; }
}
function save(data) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
}

export function submitScore(mode, username, score, total) {
    const data = load();
    const pct  = Math.round(score / total * 100);
    data[mode] = data[mode] || [];
    data[mode].push({ username, score, total, pct, date: new Date().toLocaleDateString() });
    // Sort descending by pct, keep top 10
    data[mode].sort((a,b) => b.pct - a.pct || b.score - a.score);
    data[mode] = data[mode].slice(0, 10);
    save(data);
}

// ── UI ────────────────────────────────────────────────────────────────────────
const style = document.createElement('style');
style.textContent = `
#lbBtn {
    position:fixed; top:92px; left:16px;
    background:rgba(6,10,20,0.88); border:1px solid rgba(0,245,255,0.25);
    color:#e0faff; font-size:18px; width:42px; height:42px;
    border-radius:3px; cursor:pointer; z-index:300; font-family:monospace;
    transition:box-shadow .2s;
}
#lbBtn:hover { box-shadow:0 0 12px rgba(0,245,255,0.3); }

#lbPanel {
    position:fixed; top:140px; left:16px;
    width:240px; max-height:55vh; overflow-y:auto;
    background:rgba(6,10,20,0.92); border:1px solid rgba(0,245,255,0.25);
    border-radius:3px; padding:14px; display:none; z-index:300;
    font-family:monospace; font-size:11px; color:#e0faff;
}
#lbPanel h3 { color:#00f5ff; letter-spacing:.1em; font-size:11px; margin-bottom:10px; }
.lb-tabs { display:flex; gap:6px; margin-bottom:12px; }
.lb-tab {
    flex:1; padding:5px; background:transparent;
    border:1px solid rgba(0,245,255,0.2); color:rgba(224,250,255,0.5);
    font-family:monospace; font-size:10px; cursor:pointer; letter-spacing:.05em;
    transition:all .15s;
}
.lb-tab.active { border-color:#00f5ff; color:#00f5ff; background:rgba(0,245,255,0.08); }
.lb-row {
    display:grid; grid-template-columns:18px 1fr 40px;
    gap:6px; padding:5px 4px; border-bottom:1px solid rgba(255,255,255,0.05);
    align-items:center;
}
.lb-row:last-child { border-bottom:none; }
.lb-rank { color:rgba(224,250,255,0.35); }
.lb-rank.gold   { color:#ffd54f; }
.lb-rank.silver { color:#b0bec5; }
.lb-rank.bronze { color:#a1887f; }
.lb-name { color:#e0faff; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.lb-score { color:#00f5ff; text-align:right; }
.lb-empty { color:rgba(224,250,255,0.3); text-align:center; padding:16px 0; }
`;
document.head.appendChild(style);

const btn = document.createElement('button');
btn.id = 'lbBtn';
btn.title = 'Leaderboard';
btn.innerText = '🏆';
document.body.appendChild(btn);

const panel = document.createElement('div');
panel.id = 'lbPanel';
document.body.appendChild(panel);

let currentMode = 'quiz';

btn.addEventListener('click', () => {
    panel.style.display = panel.style.display === 'block' ? 'none' : 'block';
    if (panel.style.display === 'block') renderPanel();
});

function renderPanel() {
    const data = load();
    const rows = data[currentMode] || [];

    const tabs = ['quiz','arena','race'].map(m =>
        `<button class="lb-tab${m===currentMode?' active':''}" data-mode="${m}">${m.toUpperCase()}</button>`
    ).join('');

    const rankSymbol = i => i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}.`;
    const rankClass  = i => i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : '';

    const rowsHTML = rows.length === 0
        ? `<div class="lb-empty">No scores yet!<br>Play to get on the board.</div>`
        : rows.map((r, i) => `
            <div class="lb-row">
                <span class="lb-rank ${rankClass(i)}">${rankSymbol(i)}</span>
                <span class="lb-name" title="${r.username} · ${r.date}">${r.username}</span>
                <span class="lb-score">${r.pct}%</span>
            </div>
        `).join('');

    panel.innerHTML = `
        <h3>🏆 LEADERBOARD</h3>
        <div class="lb-tabs">${tabs}</div>
        ${rowsHTML}
    `;

    panel.querySelectorAll('.lb-tab').forEach(t => {
        t.addEventListener('click', () => {
            currentMode = t.dataset.mode;
            renderPanel();
        });
    });
}

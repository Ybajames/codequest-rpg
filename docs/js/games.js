// games.js -- All three portal games: Arena, Race, Quiz
import { getQuestions, shuffle } from './questions.js';
import { playCorrect, playWrong, playLevelUp } from './audio.js';
import { addXP } from './xp.js';
import { completeQuest } from './inventory.js';
import { submitScore } from './leaderboard.js';
import { createRoom, makeRoomCode, seededShuffle } from './multiplayer.js';

// -- PORTAL OVERLAY CONTAINER -------------------------------------------------
const overlay = document.createElement('div');
overlay.id = 'portalOverlay';
document.body.appendChild(overlay);

function openOverlay(html) {
    overlay.innerHTML = html;
    overlay.classList.add('open');
    document.exitPointerLock();
}

function closeOverlay() {
    overlay.classList.remove('open');
    setTimeout(() => document.querySelector('canvas')?.requestPointerLock(), 150);
}

// ============================================================================
// ARENA LOBBY — choose Solo vs Multiplayer
// ============================================================================
export function openArena(username) {
    completeQuest('enter_arena');

    openOverlay(`
      <div id="arenaGame" class="arena-duel">
        <div class="arena-header">
          <span class="arena-title">⚔️ CODE ARENA</span>
          <button class="arena-close" id="arenaClose">LEAVE</button>
        </div>
        <div class="lobby-screen">
          <div class="lobby-title">Choose Your Battle</div>
          <div class="lobby-options">
            <button class="lobby-btn solo" id="soloBtn">
              <span class="lobby-btn-icon">🤖</span>
              <span class="lobby-btn-label">VS AI Bot</span>
              <span class="lobby-btn-sub">Play solo against a bot</span>
            </button>
            <button class="lobby-btn multi" id="createBtn">
              <span class="lobby-btn-icon">🌐</span>
              <span class="lobby-btn-label">Create Room</span>
              <span class="lobby-btn-sub">Share code with a friend</span>
            </button>
            <button class="lobby-btn join" id="joinBtn">
              <span class="lobby-btn-icon">🔗</span>
              <span class="lobby-btn-label">Join Room</span>
              <span class="lobby-btn-sub">Enter a friend's room code</span>
            </button>
          </div>
          <div id="lobbyStatus" class="lobby-status"></div>
          <div id="lobbyCodeArea" style="display:none">
            <div class="lobby-code" id="lobbyCode"></div>
            <div class="lobby-code-hint">Share this code with your opponent</div>
            <div class="lobby-waiting">⏳ Waiting for opponent to join…</div>
          </div>
          <div id="lobbyJoinArea" style="display:none">
            <div class="lobby-join-row">
              <input id="joinCodeInput" maxlength="5" placeholder="Enter code…" autocomplete="off" />
              <button id="joinConfirmBtn">JOIN</button>
            </div>
          </div>
        </div>
      </div>
    `);

    document.getElementById('arenaClose').onclick = closeOverlay;

    document.getElementById('soloBtn').onclick = () => {
        openArenaSolo(username);
    };

    document.getElementById('createBtn').onclick = () => {
        const code = makeRoomCode();
        document.getElementById('lobbyCodeArea').style.display = 'block';
        document.getElementById('lobbyJoinArea').style.display = 'none';
        document.getElementById('lobbyCode').innerText = code;
        openArenaMulti(username, code, true);
    };

    document.getElementById('joinBtn').onclick = () => {
        document.getElementById('lobbyJoinArea').style.display = 'block';
        document.getElementById('lobbyCodeArea').style.display = 'none';
    };

    document.getElementById('joinConfirmBtn')?.addEventListener('click', () => {
        const code = document.getElementById('joinCodeInput')?.value.trim().toUpperCase();
        if (code?.length === 5) openArenaMulti(username, code, false);
    });
}

// ============================================================================
// CODE ARENA — Solo vs AI Bot (original logic, unchanged)
// ============================================================================
function openArenaSolo(username) {
    completeQuest('enter_arena');
    const questions = getQuestions(8);
    const enemyName = pickEnemyName();
    let qIndex = 0;
    let playerHP = 100;
    let enemyHP = 100;
    let playerShield = 0;
    let enemyShield = 0;
    let playerEnergy = 0;
    let enemyEnergy = 0;
    let playerStreak = 0;
    let enemyStreak = 0;
    let timerInterval = null;
    let answered = false;
    let roundLog = 'Answer correctly to cast a Python spell.';
    let playerHits = 0;
    let playerCasts = 0;
    let playerFx = '';
    let enemyFx = '';
    let centerFx = '';
    let footerHint = 'Correct answers cast spells. Wrong answers leave you exposed.';
    let coachNote = 'Use the answer sigils to cast quickly and keep your focus.';
    let arenaChoices = [];
    let keyHandler = null;

    function render() {
        clearInterval(timerInterval);
        answered = false;
        const q = questions[qIndex];
        const role = getArenaRole(q.topic);
        const prompt = parseArenaPrompt(q);
        const interaction = getArenaInteractionMeta(q, prompt);
        const timeLeft = 14;
        arenaChoices = getArenaChoices(q);
        const optsHTML = arenaChoices.map((choice, i) => `
            <button class="arena-sigil ${choice.isCode ? 'is-code' : ''}" data-i="${i}">
              <span class="arena-sigil-label">${String.fromCharCode(65 + i)}</span>
              <span class="arena-sigil-hotkey">${i + 1}</span>
              <span class="arena-sigil-text">${renderArenaRichText(compactArenaText(choice.text))}</span>
            </button>
        `).join('');
        coachNote = interaction.coachIntro;

        openOverlay(`
          <div id="arenaGame" class="arena-duel">
            <div class="arena-header">
              <span class="arena-title">CODE ARENA</span>
              <span class="arena-round">Round ${qIndex + 1}/${questions.length}</span>
              <button class="arena-close" id="arenaClose">LEAVE</button>
            </div>

            <div class="arena-stage">
              <div class="arena-combatant ${playerFx}">
                <div class="arena-combatant-name">${username}</div>
                <div class="arena-stat-label">Health</div>
                <div class="arena-bar hp"><div class="arena-bar-fill hp" style="width:${playerHP}%"></div></div>
                <div class="arena-stat-row">
                  <span>${playerHP} HP</span>
                  <span>${playerShield} Shield</span>
                </div>
                <div class="arena-stat-label">Energy</div>
                <div class="arena-bar energy"><div class="arena-bar-fill energy" style="width:${playerEnergy}%"></div></div>
              </div>

              <div class="arena-center">
                <div class="arena-versus-badge ${centerFx}">${role.icon}</div>
                <div class="arena-center-label">${role.label}</div>
                <div class="arena-battle-log" id="arenaBattleLog">${roundLog}</div>
              </div>

              <div class="arena-combatant enemy ${enemyFx}">
                <div class="arena-combatant-name">${enemyName}</div>
                <div class="arena-stat-label">Health</div>
                <div class="arena-bar hp"><div class="arena-bar-fill enemy-hp" style="width:${enemyHP}%"></div></div>
                <div class="arena-stat-row">
                  <span>${enemyHP} HP</span>
                  <span>${enemyShield} Shield</span>
                </div>
                <div class="arena-stat-label">Energy</div>
                <div class="arena-bar energy"><div class="arena-bar-fill enemy-energy" style="width:${enemyEnergy}%"></div></div>
              </div>
            </div>

            <div class="arena-question-area">
              <div class="arena-topic-row">
                <span class="arena-topic-chip">${q.topic}</span>
                <span class="arena-topic-chip arena-interaction-chip">${interaction.label}</span>
                <span class="arena-topic-detail">${role.spell}</span>
              </div>
              <div class="arena-question">${renderArenaRichText(prompt.lead)}</div>
              ${prompt.code ? `<pre class="arena-code-panel">${escapeHtml(prompt.code)}</pre>` : ''}
              <div class="arena-archetype-copy">${role.description}</div>
              <div class="arena-cast-hint">${interaction.hint} Use mouse, touch, or keys 1-${arenaChoices.length}</div>
              <div class="arena-spell-grid" id="arenaOpts">${optsHTML}</div>
              <div class="arena-coach-note" id="arenaCoachNote">${coachNote}</div>
            </div>

            <div class="arena-footer">
              <span id="timerSec">${timeLeft}s</span>
              <div class="timer-bar-wrap"><div class="timer-bar" id="timerBar" style="width:100%"></div></div>
              <span class="arena-footer-copy">${footerHint}</span>
            </div>
          </div>
        `);

        document.getElementById('arenaClose').onclick = closeOverlay;
        document.querySelectorAll('.arena-sigil').forEach(btn => {
            btn.addEventListener('click', () => resolveRound(btn, q, role));
        });
        bindArenaKeys(q, role);

        let remaining = timeLeft;
        timerInterval = setInterval(() => {
            remaining--;
            const el = document.getElementById('timerSec');
            const bar = document.getElementById('timerBar');
            if (el) el.innerText = `${remaining}s`;
            if (bar) bar.style.width = (remaining / timeLeft * 100) + '%';
            if (remaining <= 0 && !answered) {
                clearInterval(timerInterval);
                answered = true;
                roundLog = `${enemyName} exploited the delay and struck first.`;
                footerHint = `${enemyName} punished the hesitation.`;
                coachNote = `Tutor note: ${q.explanation}`;
                playWrong();
                lockArenaChoices(q);
                updateArenaCopy();
                runEnemyTurn(q, role, true);
                setTimeout(advanceOrFinish, 1800);
            }
        }, 1000);
    }

    function resolveRound(btn, q, role) {
        if (answered) return;
        answered = true;
        clearInterval(timerInterval);

        const chosen = arenaChoices[+btn.dataset.i];
        const correct = !!chosen?.correct;
        lockArenaChoices(q);
        btn.classList.add(correct ? 'correct' : 'wrong');

        if (correct) {
            const result = castSpell('player', q, role);
            playerHits++;
            playerCasts++;
            playerStreak++;
            enemyStreak = 0;
            playCorrect();
            addXP(20 + q.difficulty * 5, 'arena spell');
            roundLog = result.log;
            footerHint = `${role.spell} landed. Keep pressure on the duel.`;
            coachNote = `Why it works: ${q.explanation}`;
            centerFx = 'is-casting';
            enemyFx = result.dealt > 0 ? 'is-hit' : '';
            playerFx = result.shieldGain > 0 ? 'is-shielded' : '';
            updateArenaCopy();

            if (enemyHP > 0) {
                setTimeout(() => {
                    runEnemyTurn(q, role, false);
                    setTimeout(advanceOrFinish, 1400);
                }, 850);
            } else {
                setTimeout(advanceOrFinish, 1400);
            }
        } else {
            playerStreak = 0;
            playWrong();
            roundLog = `${username} miscast the ${role.spell.toLowerCase()}.`;
            footerHint = 'Missed timing. Brace for the counterattack.';
            coachNote = `Tutor note: ${q.explanation}`;
            playerFx = 'is-hit';
            enemyFx = '';
            centerFx = 'is-fizzle';
            updateArenaCopy();
            setTimeout(() => {
                runEnemyTurn(q, role, false, true);
                setTimeout(advanceOrFinish, 1400);
            }, 650);
        }
    }

    function lockArenaChoices(q) {
        document.querySelectorAll('.arena-sigil').forEach(b => {
            const choice = arenaChoices[+b.dataset.i];
            if (choice?.correct) b.classList.add('correct');
            b.disabled = true;
        });
        unbindArenaKeys();
    }

    function castSpell(caster, q, role) {
        const actorName = caster === 'player' ? username : enemyName;
        const targetName = caster === 'player' ? enemyName : username;
        const streak = caster === 'player' ? playerStreak : enemyStreak;
        const damage = role.damage + q.difficulty * 3 + Math.min(streak, 3) * 2;
        const energyGain = Math.min(100, role.energy + q.difficulty * 6);
        const shieldGain = role.shield + (role.type === 'ward' ? q.difficulty * 2 : 0);

        if (caster === 'player') {
            playerEnergy = clamp100(playerEnergy + energyGain);
            playerShield = clamp100(playerShield + shieldGain);
            const dealt = absorbDamage('enemy', damage);
            return {
                dealt,
                shieldGain,
                log: `${actorName} used ${role.spell} and hit ${targetName} for ${dealt} damage${shieldGain ? ` while raising ${shieldGain} shield` : ''}.`,
            };
        }

        enemyEnergy = clamp100(enemyEnergy + energyGain);
        enemyShield = clamp100(enemyShield + shieldGain);
        const dealt = absorbDamage('player', damage);
        return {
            dealt,
            shieldGain,
            log: `${actorName} answered first and fired ${role.spell}, dealing ${dealt} damage${shieldGain ? ` and gaining ${shieldGain} shield` : ''}.`,
        };
    }

    function absorbDamage(target, incoming) {
        if (target === 'enemy') {
            const blocked = Math.min(enemyShield, incoming);
            enemyShield -= blocked;
            const dealt = Math.max(0, incoming - blocked);
            enemyHP = Math.max(0, enemyHP - dealt);
            return dealt;
        }

        const blocked = Math.min(playerShield, incoming);
        playerShield -= blocked;
        const dealt = Math.max(0, incoming - blocked);
        playerHP = Math.max(0, playerHP - dealt);
        return dealt;
    }

    function runEnemyTurn(q, role, timeout = false, playerMissed = false) {
        if (enemyHP <= 0 || playerHP <= 0) return;

        const difficultyPressure = 0.14 * (q.difficulty - 1);
        const hitChance = timeout ? 0.9 : playerMissed ? 0.78 - difficultyPressure : 0.58 - difficultyPressure;

        if (Math.random() <= hitChance) {
            enemyStreak++;
            playerStreak = 0;
            const result = castSpell('enemy', q, role);
            roundLog = result.log;
            footerHint = `${enemyName} cast ${role.spell}. Recover before the next round.`;
            centerFx = 'is-casting';
            playerFx = result.dealt > 0 ? 'is-hit' : '';
            enemyFx = result.shieldGain > 0 ? 'is-shielded' : '';
        } else {
            enemyStreak = 0;
            roundLog = `${enemyName} fumbled the ${role.spell.toLowerCase()} and lost the timing window.`;
            footerHint = `${enemyName} lost control of the spell window.`;
            centerFx = 'is-fizzle';
            playerFx = '';
            enemyFx = 'is-hit';
        }

        updateArenaCopy();
    }

    function advanceOrFinish() {
        if (playerHP <= 0 || enemyHP <= 0 || qIndex >= questions.length - 1) {
            showArenaResult();
            return;
        }
        playerFx = '';
        enemyFx = '';
        centerFx = '';
        footerHint = 'Correct answers cast spells. Wrong answers leave you exposed.';
        qIndex++;
        render();
    }

    function showArenaResult() {
        clearInterval(timerInterval);
        unbindArenaKeys();
        const won = playerHP > enemyHP;
        const tied = playerHP === enemyHP;
        const accuracy = Math.round((playerHits / questions.length) * 100);

        if (won) {
            playLevelUp();
            addXP(140, 'arena win');
        } else if (tied) {
            addXP(45, 'arena draw');
        }

        submitScore('arena', username, Math.max(0, playerHP), 100);

        openOverlay(`
          <div id="arenaGame" class="arena-duel">
            <div class="arena-header">
              <span class="arena-title">DUEL COMPLETE</span>
            </div>
            <div class="result-screen">
              <span class="result-emoji">${won ? 'TROPHY' : tied ? 'DRAW' : 'BLAST'}</span>
              <div class="result-title" style="color:${won ? '#64ff72' : tied ? '#ffd54f' : '#ff6b6b'}">
                ${won ? 'SPELL VICTORY!' : tied ? 'ARCANE DRAW!' : 'DEFEATED!'}
              </div>
              <div class="result-sub">
                ${username}: ${playerHP} HP left<br>
                ${enemyName}: ${enemyHP} HP left<br>
                Accuracy: ${accuracy}% · Spells Cast: ${playerCasts}<br>
                ${won ? '+140 XP Duel Champion!' : tied ? '+45 XP For Holding the Arena!' : 'Train your spells and try again.'}
              </div>
              <div style="display:flex;gap:12px;justify-content:center">
                <button class="result-btn" style="border:1px solid #2196f3;color:#2196f3" id="arenaRematch">REMATCH</button>
                <button class="result-btn" style="border:1px solid rgba(255,255,255,0.2);color:rgba(255,255,255,0.5)" id="arenaLeave">ISLAND</button>
              </div>
            </div>
          </div>
        `);

        document.getElementById('arenaRematch').onclick = () => openArena(username);
        document.getElementById('arenaLeave').onclick = closeOverlay;
    }

    render();

    function bindArenaKeys(q, role) {
        unbindArenaKeys();
        keyHandler = event => {
            if (answered) return;
            const key = event.key.toUpperCase();
            const byNumber = Number.parseInt(key, 10);
            let index = -1;

            if (!Number.isNaN(byNumber) && byNumber >= 1 && byNumber <= arenaChoices.length) {
                index = byNumber - 1;
            } else {
                index = 'ABC'.indexOf(key);
            }

            if (index < 0 || index >= arenaChoices.length) return;
            const btn = document.querySelector(`.arena-sigil[data-i="${index}"]`);
            if (btn) resolveRound(btn, q, role);
        };
        document.addEventListener('keydown', keyHandler);
    }

    function unbindArenaKeys() {
        if (keyHandler) {
            document.removeEventListener('keydown', keyHandler);
            keyHandler = null;
        }
    }

    function updateArenaCopy() {
        const battleLog = document.getElementById('arenaBattleLog');
        if (battleLog) battleLog.innerText = roundLog;
        const footer = document.querySelector('.arena-footer-copy');
        if (footer) footer.innerText = footerHint;
        const coach = document.getElementById('arenaCoachNote');
        if (coach) coach.innerText = coachNote;
    }
}

// ============================================================================
// CODE ARENA — Multiplayer (real WebSocket)
// ============================================================================
function openArenaMulti(username, roomCode, isHost) {
    let room      = null;
    let opponentName = null;
    let questions = null;
    let qIndex    = 0;
    let playerHP  = 100, enemyHP = 100;
    let playerShield = 0, enemyShield = 0;
    let playerEnergy = 0, enemyEnergy = 0;
    let playerStreak = 0;
    let timerInterval = null;
    let answered  = false;
    let arenaChoices = [];
    let roundLog  = 'Waiting for opponent…';
    let playerHits = 0, playerCasts = 0;

    const statusEl  = document.getElementById('lobbyStatus');
    const codeArea  = document.getElementById('lobbyCodeArea');
    const joinArea  = document.getElementById('lobbyJoinArea');

    function setStatus(msg) {
        if (statusEl) statusEl.innerText = msg;
    }

    room = createRoom(`arena-${roomCode}`, username, 'arena', {
        onMessage(data) {
            if (data.type === 'room_state') {
                const others = data.players.filter(p => p !== username);
                if (others.length > 0) opponentName = others[0];
                setStatus(data.players.length === 1 ? '⏳ Waiting for opponent…' : `✅ ${opponentName} joined!`);
            }

            if (data.type === 'start') {
                opponentName = data.players.find(p => p !== username) || 'Opponent';
                const allQ   = getQuestions(8);
                questions    = seededShuffle(allQ, data.seed).slice(0, 8);
                startMultiRound();
            }

            if (data.type === 'arena_answer' && data.username !== username) {
                // Opponent answered
                enemyHP = data.hpLeft ?? enemyHP;
                updateMultiStage();
                if (!answered) {
                    // Opponent was faster — show it
                    roundLog = `${opponentName} answered first!`;
                    updateArenaCopy();
                }
            }

            if (data.type === 'opponent_left') {
                clearInterval(timerInterval);
                setStatus(`${opponentName} left the game.`);
                showMultiResult(true); // win by forfeit
            }
        },
        onDisconnect() { setStatus('Connection lost. Returning to island…'); setTimeout(closeOverlay, 2000); },
        onError()      { setStatus('Could not connect to server.'); },
    });

    function startMultiRound() {
        if (!questions) return;
        clearInterval(timerInterval);
        answered = false;
        const q         = questions[qIndex];
        const role      = getArenaRole(q.topic);
        const prompt    = parseArenaPrompt(q);
        const interaction = getArenaInteractionMeta(q, prompt);
        arenaChoices    = getArenaChoices(q);
        const timeLeft  = 14;
        roundLog        = `Round ${qIndex + 1} — cast your spell!`;

        const optsHTML = arenaChoices.map((c, i) => `
            <button class="arena-sigil ${c.isCode ? 'is-code' : ''}" data-i="${i}">
              <span class="arena-sigil-label">${String.fromCharCode(65 + i)}</span>
              <span class="arena-sigil-text">${renderArenaRichText(compactArenaText(c.text))}</span>
            </button>
        `).join('');

        openOverlay(`
          <div id="arenaGame" class="arena-duel">
            <div class="arena-header">
              <span class="arena-title">⚔️ LIVE ARENA</span>
              <span class="arena-round">Round ${qIndex + 1}/${questions.length} · Room ${roomCode}</span>
              <button class="arena-close" id="arenaClose">LEAVE</button>
            </div>
            <div class="arena-stage">
              <div class="arena-combatant" id="playerSide">
                <div class="arena-combatant-name">🧑 ${username}</div>
                <div class="arena-stat-label">Health</div>
                <div class="arena-bar hp"><div class="arena-bar-fill hp" id="playerHPBar" style="width:${playerHP}%"></div></div>
                <div class="arena-stat-row"><span id="playerHPNum">${playerHP} HP</span><span>${playerShield} Shield</span></div>
                <div class="arena-stat-label">Energy</div>
                <div class="arena-bar energy"><div class="arena-bar-fill energy" id="playerEnergyBar" style="width:${playerEnergy}%"></div></div>
              </div>
              <div class="arena-center">
                <div class="arena-versus-badge">${role.icon}</div>
                <div class="arena-center-label">LIVE</div>
                <div class="arena-battle-log" id="arenaBattleLog">${roundLog}</div>
              </div>
              <div class="arena-combatant enemy" id="enemySide">
                <div class="arena-combatant-name">🧑 ${opponentName}</div>
                <div class="arena-stat-label">Health</div>
                <div class="arena-bar hp"><div class="arena-bar-fill enemy-hp" id="enemyHPBar" style="width:${enemyHP}%"></div></div>
                <div class="arena-stat-row"><span id="enemyHPNum">${enemyHP} HP</span></div>
                <div class="arena-stat-label">Energy</div>
                <div class="arena-bar energy"><div class="arena-bar-fill enemy-energy" id="enemyEnergyBar" style="width:${enemyEnergy}%"></div></div>
              </div>
            </div>
            <div class="arena-question-area">
              <div class="arena-topic-row">
                <span class="arena-topic-chip">${q.topic}</span>
                <span class="arena-topic-chip arena-interaction-chip">${interaction.label}</span>
              </div>
              <div class="arena-question">${renderArenaRichText(prompt.lead)}</div>
              ${prompt.code ? `<pre class="arena-code-panel">${escapeHtml(prompt.code)}</pre>` : ''}
              <div class="arena-spell-grid" id="arenaOpts">${optsHTML}</div>
            </div>
            <div class="arena-footer">
              <span id="timerSec">${timeLeft}s</span>
              <div class="timer-bar-wrap"><div class="timer-bar" id="timerBar" style="width:100%"></div></div>
              <span class="arena-footer-copy">${interaction.hint}</span>
            </div>
          </div>
        `);

        document.getElementById('arenaClose').onclick = () => { room?.close(); closeOverlay(); };
        document.querySelectorAll('.arena-sigil').forEach(btn => {
            btn.addEventListener('click', () => resolveMultiRound(btn, q, role));
        });

        let remaining = timeLeft;
        timerInterval = setInterval(() => {
            remaining--;
            const el  = document.getElementById('timerSec');
            const bar = document.getElementById('timerBar');
            if (el)  el.innerText         = `${remaining}s`;
            if (bar) bar.style.width      = (remaining / timeLeft * 100) + '%';
            if (remaining <= 0 && !answered) {
                clearInterval(timerInterval);
                answered = true;
                lockMultiChoices(q);
                roundLog = 'Time ran out!';
                updateArenaCopy();
                // Still send our (wrong) answer so opponent knows
                room?.send({ type: 'arena_answer', username, correct: false, hpLeft: playerHP, damage: 0, qIndex });
                setTimeout(advanceMultiRound, 1600);
            }
        }, 1000);
    }

    function resolveMultiRound(btn, q, role) {
        if (answered) return;
        answered = true;
        clearInterval(timerInterval);
        const chosen  = arenaChoices[+btn.dataset.i];
        const correct = !!chosen?.correct;
        lockMultiChoices(q);
        btn.classList.add(correct ? 'correct' : 'wrong');

        let damage = 0;
        if (correct) {
            playerHits++; playerCasts++;
            playerStreak++;
            damage         = role.damage + q.difficulty * 3 + Math.min(playerStreak, 3) * 2;
            const blocked  = Math.min(enemyShield, damage);
            enemyShield   -= blocked;
            enemyHP        = Math.max(0, enemyHP - (damage - blocked));
            playerEnergy   = clamp100(playerEnergy + role.energy + q.difficulty * 6);
            roundLog       = `${username} cast ${role.spell} for ${damage - Math.min(enemyShield, damage)} damage!`;
            playCorrect();
            addXP(20 + q.difficulty * 5, 'arena spell');
        } else {
            playerStreak = 0;
            roundLog     = `${username} miscast the ${role.spell}!`;
            playWrong();
        }

        room?.send({ type: 'arena_answer', username, correct, hpLeft: playerHP, damage, qIndex });
        updateMultiStage();
        updateArenaCopy();
        setTimeout(advanceMultiRound, 1600);
    }

    function lockMultiChoices(q) {
        document.querySelectorAll('.arena-sigil').forEach(b => {
            if (arenaChoices[+b.dataset.i]?.correct) b.classList.add('correct');
            b.disabled = true;
        });
    }

    function updateMultiStage() {
        const ph = document.getElementById('playerHPBar');
        const eh = document.getElementById('enemyHPBar');
        const pn = document.getElementById('playerHPNum');
        const en = document.getElementById('enemyHPNum');
        const pe = document.getElementById('playerEnergyBar');
        const ee = document.getElementById('enemyEnergyBar');
        if (ph) ph.style.width = playerHP + '%';
        if (eh) eh.style.width = enemyHP  + '%';
        if (pn) pn.innerText   = playerHP + ' HP';
        if (en) en.innerText   = enemyHP  + ' HP';
        if (pe) pe.style.width = playerEnergy + '%';
        if (ee) ee.style.width = enemyEnergy  + '%';
    }

    function advanceMultiRound() {
        if (playerHP <= 0 || enemyHP <= 0 || qIndex >= questions.length - 1) {
            showMultiResult(false);
            return;
        }
        qIndex++;
        startMultiRound();
    }

    function showMultiResult(forfeit) {
        clearInterval(timerInterval);
        room?.close();
        const won = forfeit || playerHP > enemyHP;
        if (won) { playLevelUp(); addXP(200, 'arena multi win'); }
        submitScore('arena', username, playerHP, 100);

        openOverlay(`
          <div id="arenaGame" class="arena-duel">
            <div class="arena-header"><span class="arena-title">⚔️ DUEL COMPLETE</span></div>
            <div class="result-screen">
              <span class="result-emoji">${won ? '🏆' : '💀'}</span>
              <div class="result-title" style="color:${won ? '#64ff72' : '#ff6b6b'}">
                ${forfeit ? 'WIN BY FORFEIT!' : won ? 'VICTORY!' : 'DEFEATED!'}
              </div>
              <div class="result-sub">
                🧑 ${username}: ${playerHP} HP<br>
                🧑 ${opponentName}: ${enemyHP} HP<br>
                ${won ? '+200 XP Live Victory!' : 'Train harder and challenge again!'}
              </div>
              <div style="display:flex;gap:12px;justify-content:center">
                <button class="result-btn" style="border:1px solid #2196f3;color:#2196f3" id="multiRematch">REMATCH</button>
                <button class="result-btn" style="border:1px solid rgba(255,255,255,0.2);color:rgba(255,255,255,0.5)" id="multiLeave">ISLAND</button>
              </div>
            </div>
          </div>
        `);
        document.getElementById('multiRematch').onclick = () => openArena(username);
        document.getElementById('multiLeave').onclick   = closeOverlay;
    }

    function updateArenaCopy() {
        const bl = document.getElementById('arenaBattleLog');
        if (bl) bl.innerText = roundLog;
    }
}

// ============================================================================
// CODE RACE -- Answer correctly to move your car
// ============================================================================
export function openRace(username) {
    completeQuest('enter_race');
    const questions = getQuestions(8);
    let qIndex = 0;
    let myPos = 0;
    let enemyPos = 0;
    const MAX_POS = 84;
    const enemyName = pickEnemyName();
    let raceOver = false;

    function render() {
        const q = questions[qIndex % questions.length];
        const optsHTML = q.options.map((opt, i) => `
            <button class="race-opt" data-i="${i}">${opt}</button>
        `).join('');

        openOverlay(`
          <div id="raceGame">
            <div class="race-header">
              <span class="race-title">CODE RACE</span>
              <span style="font-size:11px;color:rgba(224,250,255,0.4)">${username} vs ${enemyName}</span>
              <button class="arena-close" id="raceClose">LEAVE</button>
            </div>
            <div class="race-track-wrap">
              <div id="raceTrack">
                <div class="track-line"></div>
                <div class="race-car" id="myCar" style="left:${myPos}%">CAR</div>
                <div class="race-car" id="enemyCar" style="left:${enemyPos}%">BOT</div>
                <div class="finish-line"></div>
              </div>
            </div>
            <div class="race-stats">
              <div>${username} <span id="myPosLabel">${Math.round(myPos)}%</span></div>
              <div>${enemyName} <span id="ePosLabel">${Math.round(enemyPos)}%</span></div>
              <div>Q <span id="raceQNum">${qIndex + 1}/${questions.length}</span></div>
            </div>
            <div class="race-question-area">
              <div class="race-question">${q.q}</div>
              <div class="race-options" id="raceOpts">${optsHTML}</div>
              <div class="race-feedback" id="raceFeedback"></div>
            </div>
          </div>
        `);

        document.getElementById('raceClose').onclick = closeOverlay;
        const fb = document.getElementById('raceFeedback');

        document.querySelectorAll('.race-opt').forEach(btn => {
            btn.addEventListener('click', () => {
                // Disable all buttons immediately
                document.querySelectorAll('.race-opt').forEach(b => { b.disabled = true; });

                const chosen = q.options[+btn.dataset.i];
                const correct = chosen === q.answer;

                btn.classList.add(correct ? 'correct' : 'wrong');
                // Always highlight correct answer
                document.querySelectorAll('.race-opt').forEach(b => {
                    if (q.options[+b.dataset.i] === q.answer) b.classList.add('correct');
                });

                if (correct) {
                    playCorrect();
                    addXP(15, 'race correct');
                    myPos = Math.min(MAX_POS, myPos + 12 + Math.random() * 5);
                    fb.style.color = '#39ff14';
                    fb.innerText = '✅ Correct! +speed boost!';
                } else {
                    playWrong();
                    myPos = Math.min(MAX_POS, myPos + 2);
                    fb.style.color = '#ff4444';
                    fb.innerText = `❌ Answer: ${q.answer}`;
                }

                enemyPos = Math.min(MAX_POS, enemyPos + 8 + Math.random() * 8);
                updateCars();

                if (myPos >= MAX_POS || enemyPos >= MAX_POS || qIndex + 1 >= questions.length) {
                    setTimeout(showRaceResult, 1400);
                    return;
                }

                qIndex++;
                setTimeout(() => { if (!raceOver) render(); }, 1400);
            });
        });
    }

    function updateCars() {
        const my = document.getElementById('myCar');
        const en = document.getElementById('enemyCar');
        if (my) my.style.left = myPos + '%';
        if (en) en.style.left = enemyPos + '%';
        const ml = document.getElementById('myPosLabel');
        const el = document.getElementById('ePosLabel');
        if (ml) ml.innerText = Math.round(myPos) + '%';
        if (el) el.innerText = Math.round(enemyPos) + '%';
    }

    function showRaceResult() {
        raceOver = true;
        const won = myPos >= enemyPos;
        if (won) {
            playLevelUp();
            addXP(100, 'race win');
        }
        submitScore('race', username, Math.round(myPos), 100);
        openOverlay(`
          <div id="raceGame">
            <div class="race-header"><span class="race-title">RACE OVER</span></div>
            <div class="result-screen">
              <span class="result-emoji">${won ? 'WIN' : 'CLOSE'}</span>
              <div class="result-title" style="color:${won ? '#ff6b35' : '#ef9a9a'}">
                ${won ? 'YOU WIN!' : 'SO CLOSE!'}
              </div>
              <div class="result-sub">
                ${username}: ${Math.round(myPos)}%<br>
                ${enemyName}: ${Math.round(enemyPos)}%<br>
                ${won ? '+100 XP Race Champion!' : 'Keep practicing and you will win next time!'}
              </div>
              <div style="display:flex;gap:12px;justify-content:center">
                <button class="result-btn" style="border:1px solid #f44336;color:#f44336" id="raceRematch">RACE AGAIN</button>
                <button class="result-btn" style="border:1px solid rgba(255,255,255,0.2);color:rgba(255,255,255,0.5)" id="raceLeave">ISLAND</button>
              </div>
            </div>
          </div>
        `);
        document.getElementById('raceRematch').onclick = () => {
            raceOver = false;
            openRace(username);
        };
        document.getElementById('raceLeave').onclick = closeOverlay;
    }

    render();
}

// ============================================================================
// MINI QUIZ -- Timed solo challenge
// ============================================================================
export function openQuiz(username) {
    const questions = getQuestions(10);
    let qIndex = 0;
    let score = 0;
    let timeLeft = 20;
    let timerInterval = null;

    function render() {
        const q = questions[qIndex];
        const pct = (qIndex / questions.length) * 100;

        openOverlay(`
          <div id="quizGame">
            <div class="quiz-header">
              <span class="quiz-title">MINI QUIZ</span>
              <span class="quiz-meta">Solo Challenge · ${username}</span>
              <button class="arena-close" id="quizClose">X</button>
            </div>
            <div id="quizProgress"><div id="quizProgressFill" style="width:${pct}%"></div></div>
            <div class="quiz-body">
              <div class="quiz-q-num">QUESTION ${qIndex + 1} OF ${questions.length} · ${q.topic.toUpperCase()}</div>
              <div class="quiz-question">${q.q}</div>
              <div class="quiz-options" id="quizOpts">
                ${q.options.map((opt, i) => `<button class="quiz-opt" data-i="${i}">${opt}</button>`).join('')}
              </div>
            </div>
            <div class="quiz-footer">
              <span>Score: <span class="quiz-score">${score}/${qIndex}</span></span>
              <span id="quizTimer">${timeLeft}s</span>
            </div>
          </div>
        `);

        document.getElementById('quizClose').onclick = () => {
            clearInterval(timerInterval);
            closeOverlay();
        };

        document.querySelectorAll('.quiz-opt').forEach(btn => {
            btn.addEventListener('click', () => {
                clearInterval(timerInterval);
                const chosen = q.options[+btn.dataset.i];
                const correct = chosen === q.answer;

                btn.classList.add(correct ? 'correct' : 'wrong');
                document.querySelectorAll('.quiz-opt').forEach(b => {
                    if (q.options[+b.dataset.i] === q.answer) b.classList.add('correct');
                    b.style.pointerEvents = 'none';
                });

                if (correct) {
                    score++;
                    playCorrect();
                    addXP(15, 'quiz correct');
                } else {
                    playWrong();
                }

                const exp = document.createElement('div');
                exp.style.cssText = 'margin-top:10px;font-size:11px;color:rgba(224,250,255,0.55);line-height:1.6;padding:8px 12px;background:rgba(0,0,0,0.3);border-left:3px solid #ffc107';
                exp.innerText = 'TIP: ' + q.explanation;
                document.querySelector('.quiz-body').appendChild(exp);

                setTimeout(() => {
                    qIndex++;
                    if (qIndex >= questions.length) showQuizResult();
                    else {
                        timeLeft = 20;
                        render();
                    }
                }, 1800);
            });
        });

        timerInterval = setInterval(() => {
            timeLeft--;
            const el = document.getElementById('quizTimer');
            if (el) {
                el.innerText = timeLeft + 's';
                if (timeLeft <= 5) el.style.color = '#ff4444';
            }
            if (timeLeft <= 0) {
                clearInterval(timerInterval);
                playWrong();
                document.querySelectorAll('.quiz-opt').forEach(b => {
                    if (q.options[+b.dataset.i] === q.answer) b.classList.add('correct');
                    b.style.pointerEvents = 'none';
                });
                setTimeout(() => {
                    qIndex++;
                    if (qIndex >= questions.length) showQuizResult();
                    else {
                        timeLeft = 20;
                        render();
                    }
                }, 1500);
            }
        }, 1000);
    }

    function showQuizResult() {
        const pct = Math.round(score / questions.length * 100);
        const grade = pct >= 80 ? 'Excellent!' : pct >= 60 ? 'Good Job!' : 'Keep Studying!';
        const bonus = score * 20;
        addXP(bonus, 'quiz finished');
        submitScore('quiz', username, score, questions.length);
        if (pct === 100) playLevelUp();

        openOverlay(`
          <div id="quizGame">
            <div class="quiz-header"><span class="quiz-title">QUIZ COMPLETE</span></div>
            <div class="result-screen">
              <span class="result-emoji">${pct >= 80 ? 'GOLD' : pct >= 60 ? 'STAR' : 'BOOK'}</span>
              <div class="result-title" style="color:#ffc107">${grade}</div>
              <div class="result-sub">
                Score: ${score} / ${questions.length} (${pct}%)<br>
                +${bonus} XP earned!<br>
                ${pct >= 80 ? 'You are a Python pro!' : 'Visit the island NPCs to practice more!'}
              </div>
              <div style="display:flex;gap:12px;justify-content:center">
                <button class="result-btn" style="border:1px solid #ffc107;color:#ffc107" id="quizRetry">TRY AGAIN</button>
                <button class="result-btn" style="border:1px solid rgba(255,255,255,0.2);color:rgba(255,255,255,0.5)" id="quizLeave">ISLAND</button>
              </div>
            </div>
          </div>
        `);
        document.getElementById('quizRetry').onclick = () => openQuiz(username);
        document.getElementById('quizLeave').onclick = closeOverlay;
    }

    render();
}

// -- HELPERS -----------------------------------------------------------------
const ENEMY_NAMES = ['Byte', 'Nano', 'Pixel', 'Zara', 'Hex', 'Luna', 'Chip', 'Vera', 'Rex'];

function pickEnemyName() {
    return ENEMY_NAMES[Math.floor(Math.random() * ENEMY_NAMES.length)] + '_Bot';
}

function clamp100(value) {
    return Math.max(0, Math.min(100, Math.round(value)));
}

function getArenaChoices(question) {
    const correct = question.answer;
    const distractors = shuffle(question.options.filter(opt => opt !== correct)).slice(0, 2);
    return shuffle([
        { text: correct, correct: true },
        ...distractors.map(text => ({ text, correct: false })),
    ]).map(choice => ({
        ...choice,
        isCode: looksLikeCode(choice.text),
    }));
}

function compactArenaText(text) {
    return String(text)
        .replace(/\s+/g, ' ')
        .replace(/\s*\\n\s*/g, ' ')
        .trim();
}

function parseArenaPrompt(question) {
    const text = String(question.q || '').trim();
    const parts = text.split(/\n\s*\n/);
    if (parts.length < 2) {
        return { lead: text, code: '' };
    }

    return {
        lead: parts.shift().trim(),
        code: parts.join('\n\n').trim(),
    };
}

function getArenaInteractionMeta(question, prompt) {
    const lead = prompt.lead.toLowerCase();

    if (/what (does|is).*print|what is printed/.test(lead)) {
        return {
            label: 'OUTPUT READ',
            hint: 'Trace the code, then fire the result.',
            coachIntro: 'Tutor note: read the code block first, then predict the output before looking at the sigils.',
        };
    }

    if (/which line correctly|which code/.test(lead)) {
        return {
            label: 'RUNE RESTORE',
            hint: 'Choose the line that completes the spell.',
            coachIntro: 'Tutor note: in Python, tiny syntax details matter. Look for the line that is valid and complete.',
        };
    }

    if (/which operator|which method/.test(lead)) {
        return {
            label: 'GLYPH PICK',
            hint: 'Pick the exact Python symbol or method.',
            coachIntro: 'Tutor note: these rounds are about precision. One symbol can change the whole meaning.',
        };
    }

    if (prompt.code) {
        return {
            label: 'TRACE CAST',
            hint: 'Read the code block before choosing your cast.',
            coachIntro: 'Tutor note: follow the values line by line, then commit to the cast.',
        };
    }

    return {
        label: 'SPELL PICK',
        hint: 'Choose the strongest Python answer fast.',
        coachIntro: 'Tutor note: keep your answer short, clear, and grounded in the concept.',
    };
}

function renderArenaRichText(text) {
    return escapeHtml(String(text)).replace(/\n/g, '<br>');
}

function escapeHtml(text) {
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function looksLikeCode(text) {
    return /[=()[\]{}.:"]|def |print|input|range|return|len|append|__init__/.test(String(text));
}

function getArenaRole(topic) {
    const map = {
        Variables:  { label: 'Bolt Spell',   spell: 'Variable Bolt', icon: 'BOLT',   type: 'attack', damage: 18, shield: 0,  energy: 16, description: 'Precise syntax powers direct arcane damage.' },
        Print:      { label: 'Echo Blast',   spell: 'Echo Blast',    icon: 'ECHO',   type: 'attack', damage: 20, shield: 0,  energy: 14, description: 'Clear output becomes a sharp ranged strike.' },
        String:     { label: 'Glyph Slash',  spell: 'Glyph Slash',   icon: 'GLYPH',  type: 'attack', damage: 17, shield: 4,  energy: 16, description: 'String control carves fast cuts through the arena.' },
        Logic:      { label: 'Logic Ward',   spell: 'Logic Ward',    icon: 'WARD',   type: 'ward',   damage: 11, shield: 16, energy: 12, description: 'Conditionals create barriers and punish sloppy attacks.' },
        Dictionary: { label: 'Key Ward',     spell: 'Key Ward',      icon: 'KEY',    type: 'ward',   damage: 12, shield: 15, energy: 13, description: 'Correct key access raises defensive wards.' },
        Input:      { label: 'Pulse Charge', spell: 'Input Pulse',   icon: 'PULSE',  type: 'charge', damage: 13, shield: 6,  energy: 22, description: 'Interactive code channels energy back into your core.' },
        Loop:       { label: 'Loop Barrage', spell: 'Loop Barrage',  icon: 'LOOP',   type: 'charge', damage: 16, shield: 7,  energy: 20, description: 'Repeated patterns unleash multi-hit arcane pressure.' },
        Function:   { label: 'Nova Cast',    spell: 'Function Nova', icon: 'NOVA',   type: 'charge', damage: 19, shield: 5,  energy: 21, description: 'Reusable logic explodes into stronger special attacks.' },
        List:       { label: 'Orbit Cast',   spell: 'List Orbit',    icon: 'ORBIT',  type: 'charge', damage: 15, shield: 8,  energy: 18, description: 'Ordered data creates rotating orbit strikes.' },
        Class:      { label: 'Titan Cast',   spell: 'Class Titan',   icon: 'TITAN',  type: 'charge', damage: 22, shield: 8,  energy: 20, description: 'Heavy object magic lands the arena’s biggest hits.' },
    };

    return map[topic] || {
        label: 'Code Pulse',
        spell: 'Code Pulse',
        icon: 'CODE',
        type: 'attack',
        damage: 16,
        shield: 4,
        energy: 15,
        description: 'Python knowledge turns into battle pressure.',
    };
}

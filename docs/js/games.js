// games.js — All three portal games: Arena, Race, Quiz
import { QUESTIONS, getQuestions, shuffle } from './questions.js';
import { playCorrect, playWrong, playLevelUp } from './audio.js';
import { addXP } from './xp.js';
import { completeQuest } from './inventory.js';
import { submitScore } from './leaderboard.js';

// ── PORTAL OVERLAY CONTAINER ──────────────────────────────────────────────────
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

// ═══════════════════════════════════════════════════════════════════════════════
// 🔵 CODE ARENA — Simulated PvP Battle
// ═══════════════════════════════════════════════════════════════════════════════
export function openArena(username) {
    completeQuest('enter_arena');
    const questions = getQuestions(5);
    let qIndex = 0, playerScore = 0, enemyScore = 0;
    const enemyName = pickEnemyName();
    let timerInterval = null;
    let answered = false;

    function render() {
        const q = questions[qIndex];
        const timeLeft = 12;

        const optsHTML = q.options.map((opt, i) =>
            `<button class="arena-opt" data-i="${i}">${opt}</button>`
        ).join('');

        openOverlay(`
          <div id="arenaGame">
            <div class="arena-header">
              <span class="arena-title">⚔️ CODE ARENA</span>
              <span style="font-size:11px;color:rgba(224,250,255,0.4)">Question ${qIndex+1}/5</span>
              <button class="arena-close" id="arenaClose">✕ LEAVE</button>
            </div>
            <div class="arena-players">
              <div class="player-card">
                <div class="name">🧑 ${username}</div>
                <div class="score" id="playerScore">${playerScore}</div>
              </div>
              <div class="vs-badge">VS</div>
              <div class="player-card">
                <div class="name">🤖 ${enemyName}</div>
                <div class="score" id="enemyScore">${enemyScore}</div>
              </div>
            </div>
            <div class="arena-question-area">
              <div class="arena-question">${q.q}</div>
              <div class="arena-options" id="arenaOpts">${optsHTML}</div>
            </div>
            <div class="arena-timer">
              <span id="timerSec">⏱ ${timeLeft}s</span>
              <div class="timer-bar-wrap"><div class="timer-bar" id="timerBar" style="width:100%"></div></div>
              <span style="color:#64b5f6">Topic: ${q.topic}</span>
            </div>
          </div>
        `);

        document.getElementById('arenaClose').onclick = closeOverlay;

        // bind options
        document.querySelectorAll('.arena-opt').forEach(btn => {
            btn.addEventListener('click', () => {
                if (answered) return;
                answered = true;
                clearInterval(timerInterval);
                const chosen = q.options[+btn.dataset.i];
                const correct = chosen === q.answer;

                btn.classList.add(correct ? 'correct' : 'wrong');

                // highlight correct
                document.querySelectorAll('.arena-opt').forEach(b => {
                    if (q.options[+b.dataset.i] === q.answer) b.classList.add('correct');
                });

                if (correct) {
                    playerScore++;
                    document.getElementById('playerScore').innerText = playerScore;
                    playCorrect();
                    addXP(20, 'arena correct');
                } else {
                    playWrong();
                    // enemy sometimes gets it right
                    if (Math.random() < 0.55) {
                        enemyScore++;
                        document.getElementById('enemyScore').innerText = enemyScore;
                    }
                }

                setTimeout(nextQuestion, 1600);
            });
        });

        // countdown timer
        let remaining = timeLeft;
        timerInterval = setInterval(() => {
            remaining--;
            const el = document.getElementById('timerSec');
            const bar = document.getElementById('timerBar');
            if (el)  el.innerText = `⏱ ${remaining}s`;
            if (bar) bar.style.width = (remaining / timeLeft * 100) + '%';
            if (remaining <= 0) {
                clearInterval(timerInterval);
                if (!answered) {
                    answered = true;
                    // enemy gets it
                    if (Math.random() < 0.7) {
                        enemyScore++;
                        if (document.getElementById('enemyScore'))
                            document.getElementById('enemyScore').innerText = enemyScore;
                    }
                    playWrong();
                    // highlight answer
                    document.querySelectorAll('.arena-opt').forEach(b => {
                        if (q.options[+b.dataset.i] === q.answer) b.classList.add('correct');
                    });
                    setTimeout(nextQuestion, 1400);
                }
            }
        }, 1000);
    }

    function nextQuestion() {
        answered = false;
        qIndex++;
        if (qIndex >= questions.length) {
            showArenaResult();
        } else {
            render();
        }
    }

    function showArenaResult() {
        const won = playerScore > enemyScore;
        const tied = playerScore === enemyScore;
        if (won) { playLevelUp(); addXP(100, 'arena win'); }
        submitScore('arena', username, playerScore, questions.length);
        openOverlay(`
          <div id="arenaGame">
            <div class="arena-header">
              <span class="arena-title">⚔️ BATTLE OVER</span>
            </div>
            <div class="result-screen">
              <span class="result-emoji">${won ? '🏆' : tied ? '🤝' : '💀'}</span>
              <div class="result-title" style="color:${won?'#64ff72':tied?'#ffd54f':'#ff6b6b'}">
                ${won ? 'VICTORY!' : tied ? 'DRAW!' : 'DEFEATED!'}
              </div>
              <div class="result-sub">
                ${username}: ${playerScore} pts  &nbsp;|&nbsp;  ${enemyName}: ${enemyScore} pts<br>
                ${won ? '+100 XP Bonus!' : tied ? '+30 XP for trying!' : 'Better luck next time!'}
              </div>
              <div style="display:flex;gap:12px;justify-content:center">
                <button class="result-btn" style="border:1px solid #2196f3;color:#2196f3" id="arenaRematch">▶ REMATCH</button>
                <button class="result-btn" style="border:1px solid rgba(255,255,255,0.2);color:rgba(255,255,255,0.5)" id="arenaLeave">← ISLAND</button>
              </div>
            </div>
          </div>
        `);
        if (tied) addXP(30, 'arena draw');
        document.getElementById('arenaRematch').onclick = () => openArena(username);
        document.getElementById('arenaLeave').onclick   = closeOverlay;
    }

    render();
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔴 CODE RACE — Answer correctly to move your car
// ═══════════════════════════════════════════════════════════════════════════════
export function openRace(username) {
    completeQuest('enter_race');
    const questions = getQuestions(8);
    let qIndex = 0, myPos = 0, enemyPos = 0, lap = 0;
    const MAX_POS = 84; // width % for finish
    const enemyName = pickEnemyName();
    let raceOver = false;

    function render() {
        const q = questions[qIndex % questions.length];
        openOverlay(`
          <div id="raceGame">
            <div class="race-header">
              <span class="race-title">🏎️ CODE RACE</span>
              <span style="font-size:11px;color:rgba(224,250,255,0.4)">${username} vs ${enemyName}</span>
              <button class="arena-close" id="raceClose">✕ LEAVE</button>
            </div>
            <div class="race-track-wrap">
              <div id="raceTrack">
                <div class="track-line"></div>
                <div class="race-car" id="myCar"    style="left:${myPos}%">🚗</div>
                <div class="race-car" id="enemyCar" style="left:${enemyPos}%">🚕</div>
                <div class="finish-line"></div>
              </div>
            </div>
            <div class="race-stats">
              <div>🧑 ${username} <span id="myPosLabel">${Math.round(myPos)}%</span></div>
              <div>🤖 ${enemyName} <span id="ePosLabel">${Math.round(enemyPos)}%</span></div>
              <div>Q&nbsp;<span id="raceQNum">${qIndex+1}/${questions.length}</span></div>
            </div>
            <div class="race-question-area">
              <div class="race-question">${q.q}</div>
              <div style="font-size:11px;color:rgba(224,250,255,0.4);margin-bottom:6px">
                Type the correct answer (or the letter A/B/C/D):<br>
                ${q.options.map((o,i)=>`<strong style="color:#ef9a9a">${'ABCD'[i]}.</strong> ${o}`).join('  &nbsp;&nbsp;  ')}
              </div>
              <input id="raceCodeInput" type="text" placeholder="Your answer…" autocomplete="off" />
            </div>
            <div class="race-footer">
              <button id="raceSubmitBtn">SUBMIT ▶</button>
              <span class="race-feedback" id="raceFeedback"></span>
            </div>
          </div>
        `);

        document.getElementById('raceClose').onclick = closeOverlay;

        const input  = document.getElementById('raceCodeInput');
        const subBtn = document.getElementById('raceSubmitBtn');
        const fb     = document.getElementById('raceFeedback');
        input.focus();

        function submit() {
            const val = input.value.trim();
            if (!val) return;

            const letter = val.toUpperCase();
            const letterIdx = 'ABCD'.indexOf(letter);
            const chosen = letterIdx >= 0 ? q.options[letterIdx] : val;
            const correct = chosen === q.answer || val.toLowerCase() === q.answer.toLowerCase();

            if (correct) {
                playCorrect();
                addXP(15, 'race correct');
                myPos = Math.min(MAX_POS, myPos + 12 + Math.random() * 5);
                fb.style.color = '#39ff14';
                fb.innerText = '✅ Correct! +12% speed boost!';
            } else {
                playWrong();
                myPos = Math.min(MAX_POS, myPos + 2);
                fb.style.color = '#ff4444';
                fb.innerText = `❌ Answer: ${q.answer}`;
            }

            // Enemy moves
            enemyPos = Math.min(MAX_POS, enemyPos + 8 + Math.random() * 8);

            updateCars();

            // Check if race over
            if (myPos >= MAX_POS || enemyPos >= MAX_POS || qIndex + 1 >= questions.length) {
                setTimeout(showRaceResult, 1200);
                return;
            }

            qIndex++;
            setTimeout(() => {
                if (!raceOver) render();
            }, 1300);
        }

        subBtn.onclick = submit;
        input.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });
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
        if (won) { playLevelUp(); addXP(100, 'race win'); }
        submitScore('race', username, Math.round(myPos), 100);
        openOverlay(`
          <div id="raceGame">
            <div class="race-header"><span class="race-title">🏁 RACE OVER</span></div>
            <div class="result-screen">
              <span class="result-emoji">${won ? '🏆' : '🥈'}</span>
              <div class="result-title" style="color:${won?'#ff6b35':'#ef9a9a'}">
                ${won ? 'YOU WIN!' : 'SO CLOSE!'}
              </div>
              <div class="result-sub">
                🚗 ${username}: ${Math.round(myPos)}%<br>
                🚕 ${enemyName}: ${Math.round(enemyPos)}%<br>
                ${won ? '+100 XP Race Champion!' : 'Keep practicing — you\'ll win next time!'}
              </div>
              <div style="display:flex;gap:12px;justify-content:center">
                <button class="result-btn" style="border:1px solid #f44336;color:#f44336" id="raceRematch">▶ RACE AGAIN</button>
                <button class="result-btn" style="border:1px solid rgba(255,255,255,0.2);color:rgba(255,255,255,0.5)" id="raceLeave">← ISLAND</button>
              </div>
            </div>
          </div>
        `);
        document.getElementById('raceRematch').onclick = () => { raceOver = false; openRace(username); };
        document.getElementById('raceLeave').onclick   = closeOverlay;
    }

    render();
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🟡 MINI QUIZ — Timed solo challenge
// ═══════════════════════════════════════════════════════════════════════════════
export function openQuiz(username) {
    const questions = getQuestions(10);
    let qIndex = 0, score = 0, timeLeft = 20, timerInterval = null;

    function render() {
        const q   = questions[qIndex];
        const pct = ((qIndex) / questions.length * 100);

        openOverlay(`
          <div id="quizGame">
            <div class="quiz-header">
              <span class="quiz-title">⚡ MINI QUIZ</span>
              <span class="quiz-meta">Solo Challenge · ${username}</span>
              <button class="arena-close" id="quizClose">✕</button>
            </div>
            <div id="quizProgress"><div id="quizProgressFill" style="width:${pct}%"></div></div>
            <div class="quiz-body">
              <div class="quiz-q-num">QUESTION ${qIndex+1} OF ${questions.length} · ${q.topic.toUpperCase()}</div>
              <div class="quiz-question">${q.q}</div>
              <div class="quiz-options" id="quizOpts">
                ${q.options.map((opt,i) => `<button class="quiz-opt" data-i="${i}">${opt}</button>`).join('')}
              </div>
            </div>
            <div class="quiz-footer">
              <span>Score: <span class="quiz-score">${score}/${qIndex}</span></span>
              <span id="quizTimer">${timeLeft}s</span>
            </div>
          </div>
        `);

        document.getElementById('quizClose').onclick = () => { clearInterval(timerInterval); closeOverlay(); };

        document.querySelectorAll('.quiz-opt').forEach(btn => {
            btn.addEventListener('click', () => {
                clearInterval(timerInterval);
                const chosen  = q.options[+btn.dataset.i];
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

                // Show explanation
                const exp = document.createElement('div');
                exp.style.cssText = 'margin-top:10px;font-size:11px;color:rgba(224,250,255,0.55);line-height:1.6;padding:8px 12px;background:rgba(0,0,0,0.3);border-left:3px solid #ffc107';
                exp.innerText = '💡 ' + q.explanation;
                document.querySelector('.quiz-body').appendChild(exp);

                setTimeout(() => {
                    qIndex++;
                    if (qIndex >= questions.length) showQuizResult();
                    else { timeLeft = 20; render(); }
                }, 1800);
            });
        });

        // Timer
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
                    else { timeLeft = 20; render(); }
                }, 1500);
            }
        }, 1000);
    }

    function showQuizResult() {
        const pct  = Math.round(score / questions.length * 100);
        const grade = pct >= 80 ? '🏆 Excellent!' : pct >= 60 ? '👍 Good Job!' : '📚 Keep Studying!';
        const bonus = score * 20;
        addXP(bonus, 'quiz finished');
        submitScore('quiz', username, score, questions.length);
        if (pct === 100) playLevelUp();

        openOverlay(`
          <div id="quizGame">
            <div class="quiz-header"><span class="quiz-title">⚡ QUIZ COMPLETE</span></div>
            <div class="result-screen">
              <span class="result-emoji">${pct >= 80 ? '🏆' : pct >= 60 ? '⭐' : '📖'}</span>
              <div class="result-title" style="color:#ffc107">${grade}</div>
              <div class="result-sub">
                Score: ${score} / ${questions.length} (${pct}%)<br>
                +${bonus} XP earned!<br>
                ${pct >= 80 ? 'You\'re a Python pro!' : 'Visit the island NPCs to practice more!'}
              </div>
              <div style="display:flex;gap:12px;justify-content:center">
                <button class="result-btn" style="border:1px solid #ffc107;color:#ffc107" id="quizRetry">▶ TRY AGAIN</button>
                <button class="result-btn" style="border:1px solid rgba(255,255,255,0.2);color:rgba(255,255,255,0.5)" id="quizLeave">← ISLAND</button>
              </div>
            </div>
          </div>
        `);
        document.getElementById('quizRetry').onclick = () => openQuiz(username);
        document.getElementById('quizLeave').onclick  = closeOverlay;
    }

    render();
}

// ── HELPERS ───────────────────────────────────────────────────────────────────
const ENEMY_NAMES = ['Byte', 'Nano', 'Pixel', 'Zara', 'Hex', 'Luna', 'Chip', 'Vera', 'Rex'];
function pickEnemyName() {
    return ENEMY_NAMES[Math.floor(Math.random() * ENEMY_NAMES.length)] + '_Bot';
}

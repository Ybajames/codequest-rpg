import { getAllStudents } from '../js/supabase.js';

const TEACHER_PASSWORD = 'admin';

window.checkLogin = function() {
    const pass = document.getElementById('teacher-pass').value;
    if (pass === TEACHER_PASSWORD) {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('dashboard').style.display    = 'block';
        loadDashboard();
    } else {
        document.getElementById('login-error').innerText = 'Wrong password. Try again.';
    }
};

document.getElementById('teacher-pass').addEventListener('keydown', e => {
    if (e.key === 'Enter') window.checkLogin();
});

window.loadDashboard = async function() {
    document.getElementById('loading').style.display       = 'block';
    document.getElementById('student-table').style.display = 'none';
    document.getElementById('no-students').style.display   = 'none';

    const students = await getAllStudents();

    document.getElementById('loading').style.display = 'none';

    if (!students || students.length === 0) {
        document.getElementById('no-students').style.display = 'block';
        return;
    }

    // stats
    const onMountain   = students.filter(s => s.islandCrossed).length;
    const bossDefeated = students.filter(s => s.bossDefeated).length;
    const avgXP        = Math.round(students.reduce((a,s) => a + s.xp, 0) / students.length);
    document.getElementById('stat-total').innerText   = students.length;
    document.getElementById('stat-island2').innerText = onMountain;
    document.getElementById('stat-boss').innerText    = bossDefeated;
    document.getElementById('stat-xp').innerText      = avgXP;

    // table
    const tbody = document.getElementById('table-body');
    tbody.innerHTML = '';
    students.forEach(s => {
        const milestones = [
            s.bugDefeated   ? `<span class="badge badge-done">🐛 Bug</span>`      : '',
            s.islandCrossed ? `<span class="badge badge-island">🌉 Bridge</span>` : '',
            s.bossDefeated  ? `<span class="badge badge-boss">💀 Boss</span>`     : '',
        ].filter(Boolean).join('') || `<span class="badge badge-none">none yet</span>`;

        const tr = document.createElement('tr');
        tr.dataset.username = s.username.toLowerCase();
        tr.innerHTML = `
            <td class="username-cell">${s.username}</td>
            <td><span class="level-pill">LVL ${s.level}</span> <span style="font-size:10px;color:rgba(0,245,255,0.5)">${s.xp} XP</span></td>
            <td><span class="skills-count">${s.inventory.length} / 11</span><br><span style="font-size:9px;color:rgba(57,255,20,0.5)">${s.inventory.join(', ') || '—'}</span></td>
            <td>${milestones}</td>
            <td class="last-seen">${getTimeAgo(new Date(s.lastSeen))}</td>
        `;
        tbody.appendChild(tr);
    });

    document.getElementById('student-table').style.display = 'table';
};

window.filterTable = function() {
    const q = document.getElementById('search').value.toLowerCase();
    document.querySelectorAll('#table-body tr').forEach(tr => {
        tr.style.display = tr.dataset.username.includes(q) ? '' : 'none';
    });
};

function getTimeAgo(date) {
    const secs = Math.floor((Date.now() - date) / 1000);
    if (secs < 60)    return 'just now';
    if (secs < 3600)  return Math.floor(secs/60) + 'm ago';
    if (secs < 86400) return Math.floor(secs/3600) + 'h ago';
    return Math.floor(secs/86400) + 'd ago';
}

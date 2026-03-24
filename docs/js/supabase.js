// supabase.js — database connection + save/load
// To hand over to university: just change the two lines below

const SUPABASE_URL = 'https://ajpbbbikwitldkvyzstf.supabase.co';
const SUPABASE_KEY = 'sb_publishable_sfpRPVM5uNbm2QbQLBq4sQ_UQvA41OV';

const HEADERS = {
    'Content-Type':  'application/json',
    'apikey':        SUPABASE_KEY,
    'Authorization': 'Bearer ' + SUPABASE_KEY,
    'Prefer':        'return=representation',
};

// ── ENSURE STUDENT EXISTS ─────────────────────────────────────────────────────
export async function ensureStudent(username) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/students?username=eq.${username}`, {
        headers: HEADERS
    });
    const rows = await res.json();
    if (rows.length === 0) {
        // new student — create record
        await fetch(`${SUPABASE_URL}/rest/v1/students`, {
            method: 'POST',
            headers: HEADERS,
            body: JSON.stringify({ username })
        });
        // create empty progress row
        await fetch(`${SUPABASE_URL}/rest/v1/progress`, {
            method: 'POST',
            headers: HEADERS,
            body: JSON.stringify({ username })
        });
    } else {
        // update last_seen
        await fetch(`${SUPABASE_URL}/rest/v1/students?username=eq.${username}`, {
            method: 'PATCH',
            headers: HEADERS,
            body: JSON.stringify({ last_seen: new Date().toISOString() })
        });
    }
}

// ── SAVE PROGRESS ─────────────────────────────────────────────────────────────
export async function saveToCloud(username, data) {
    try {
        await fetch(`${SUPABASE_URL}/rest/v1/progress?username=eq.${username}`, {
            method: 'PATCH',
            headers: HEADERS,
            body: JSON.stringify({
                inventory:      data.inventory,
                bug_defeated:   data.bugDefeated,
                island_crossed: data.islandCrossed,
                boss_defeated:  data.bossDefeated,
                xp:             data.xp,
                level:          data.level,
                updated_at:     new Date().toISOString(),
            })
        });
    } catch(e) {
        console.warn('Cloud save failed, using localStorage fallback', e);
    }
}

// ── LOAD PROGRESS ─────────────────────────────────────────────────────────────
export async function loadFromCloud(username) {
    try {
        const res  = await fetch(`${SUPABASE_URL}/rest/v1/progress?username=eq.${username}`, {
            headers: HEADERS
        });
        const rows = await res.json();
        if (rows.length === 0) return null;
        const r = rows[0];
        return {
            inventory:      r.inventory      || [],
            bugDefeated:    r.bug_defeated   || false,
            islandCrossed:  r.island_crossed || false,
            bossDefeated:   r.boss_defeated  || false,
            xp:             r.xp             || 0,
            level:          r.level          || 1,
        };
    } catch(e) {
        console.warn('Cloud load failed, using localStorage fallback', e);
        return null;
    }
}

// ── TEACHER — GET ALL STUDENTS ────────────────────────────────────────────────
export async function getAllStudents() {
    const [sRes, pRes] = await Promise.all([
        fetch(`${SUPABASE_URL}/rest/v1/students?order=last_seen.desc`, { headers: HEADERS }),
        fetch(`${SUPABASE_URL}/rest/v1/progress`, { headers: HEADERS }),
    ]);
    const students = await sRes.json();
    const progress = await pRes.json();

    return students.map(s => {
        const p = progress.find(p => p.username === s.username) || {};
        return {
            username:      s.username,
            lastSeen:      s.last_seen,
            createdAt:     s.created_at,
            inventory:     p.inventory      || [],
            xp:            p.xp             || 0,
            level:         p.level          || 1,
            bugDefeated:   p.bug_defeated   || false,
            islandCrossed: p.island_crossed || false,
            bossDefeated:  p.boss_defeated  || false,
        };
    });
}

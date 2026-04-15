// mobile.js — virtual joystick + interact button for touch devices
// Only activates on touch screens

const isTouchDevice = () => ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

export let mobileMove   = { x: 0, y: 0 }; // normalised -1…1
export let mobileLook   = { x: 0, y: 0 };
export let mobileInteract = false;

if (isTouchDevice()) {
    buildMobileUI();
}

function buildMobileUI() {
    // ── Styles ────────────────────────────────────────────────────────────────
    const style = document.createElement('style');
    style.textContent = `
        #mobileUI { position:fixed; inset:0; pointer-events:none; z-index:400; }

        /* Left joystick */
        #joyZone {
            position:absolute; left:24px; bottom:100px;
            width:110px; height:110px;
            pointer-events:all;
        }
        #joyBase {
            position:absolute; inset:0;
            border-radius:50%;
            background:rgba(0,245,255,0.06);
            border:1.5px solid rgba(0,245,255,0.2);
        }
        #joyStick {
            position:absolute;
            width:44px; height:44px;
            border-radius:50%;
            background:rgba(0,245,255,0.25);
            border:1.5px solid rgba(0,245,255,0.6);
            left:33px; top:33px;
            transition: none;
            pointer-events:none;
        }

        /* Right look zone */
        #lookZone {
            position:absolute; right:0; bottom:0;
            width:50%; height:60%;
            pointer-events:all;
            /* debug: background:rgba(255,0,0,0.05); */
        }

        /* Interact button */
        #mobileInteractBtn {
            position:absolute; right:24px; bottom:100px;
            width:64px; height:64px;
            border-radius:50%;
            background:rgba(0,245,255,0.1);
            border:1.5px solid rgba(0,245,255,0.4);
            color:#00f5ff; font-size:20px;
            display:flex; align-items:center; justify-content:center;
            pointer-events:all; user-select:none;
            -webkit-tap-highlight-color:transparent;
            letter-spacing:0;
        }
        #mobileInteractBtn:active {
            background:rgba(0,245,255,0.25);
        }

        /* Jump button */
        #mobileJumpBtn {
            position:absolute; right:100px; bottom:100px;
            width:52px; height:52px;
            border-radius:50%;
            background:rgba(255,213,79,0.08);
            border:1.5px solid rgba(255,213,79,0.3);
            color:#ffd54f; font-size:18px;
            display:flex; align-items:center; justify-content:center;
            pointer-events:all; user-select:none;
            -webkit-tap-highlight-color:transparent;
        }
        #mobileJumpBtn:active { background:rgba(255,213,79,0.2); }
    `;
    document.head.appendChild(style);

    // ── DOM ───────────────────────────────────────────────────────────────────
    const ui = document.createElement('div');
    ui.id = 'mobileUI';
    ui.innerHTML = `
        <div id="joyZone"><div id="joyBase"></div><div id="joyStick"></div></div>
        <div id="lookZone"></div>
        <div id="mobileInteractBtn">E</div>
        <div id="mobileJumpBtn">↑</div>
    `;
    document.body.appendChild(ui);

    // ── Joystick (left thumb) ─────────────────────────────────────────────────
    const joyZone  = document.getElementById('joyZone');
    const joyStick = document.getElementById('joyStick');
    const JOY_R = 33; // max stick travel radius
    let joyId = null, joyOrigin = { x: 0, y: 0 };

    joyZone.addEventListener('touchstart', e => {
        e.preventDefault();
        const t = e.changedTouches[0];
        joyId = t.identifier;
        const rect = joyZone.getBoundingClientRect();
        joyOrigin = { x: t.clientX - rect.left, y: t.clientY - rect.top };
        setStick(0, 0);
    }, { passive: false });

    joyZone.addEventListener('touchmove', e => {
        e.preventDefault();
        for (const t of e.changedTouches) {
            if (t.identifier !== joyId) continue;
            const rect = joyZone.getBoundingClientRect();
            let dx = t.clientX - rect.left - joyOrigin.x;
            let dy = t.clientY - rect.top  - joyOrigin.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist > JOY_R) { dx = dx/dist*JOY_R; dy = dy/dist*JOY_R; }
            setStick(dx / JOY_R, dy / JOY_R);
        }
    }, { passive: false });

    joyZone.addEventListener('touchend', e => {
        for (const t of e.changedTouches) {
            if (t.identifier === joyId) { joyId = null; setStick(0, 0); }
        }
    });

    function setStick(nx, ny) {
        mobileMove.x = nx;
        mobileMove.y = ny;
        joyStick.style.transform = `translate(${nx*JOY_R}px, ${ny*JOY_R}px)`;
    }

    // ── Look zone (right thumb) ───────────────────────────────────────────────
    const lookZone = document.getElementById('lookZone');
    let lookId = null, lookLast = { x: 0, y: 0 };
    const LOOK_SENS = 0.004;

    lookZone.addEventListener('touchstart', e => {
        e.preventDefault();
        const t = e.changedTouches[0];
        lookId = t.identifier;
        lookLast = { x: t.clientX, y: t.clientY };
    }, { passive: false });

    lookZone.addEventListener('touchmove', e => {
        e.preventDefault();
        for (const t of e.changedTouches) {
            if (t.identifier !== lookId) continue;
            mobileLook.x = (t.clientX - lookLast.x) * LOOK_SENS;
            mobileLook.y = (t.clientY - lookLast.y) * LOOK_SENS;
            lookLast = { x: t.clientX, y: t.clientY };
        }
    }, { passive: false });

    lookZone.addEventListener('touchend', e => {
        for (const t of e.changedTouches) {
            if (t.identifier === lookId) { lookId = null; mobileLook.x = 0; mobileLook.y = 0; }
        }
    });

    // ── Interact button ───────────────────────────────────────────────────────
    const interactBtn = document.getElementById('mobileInteractBtn');
    interactBtn.addEventListener('touchstart', e => {
        e.preventDefault();
        mobileInteract = true;
    }, { passive: false });
    interactBtn.addEventListener('touchend', () => { mobileInteract = false; });

    // ── Jump button ───────────────────────────────────────────────────────────
    const jumpBtn = document.getElementById('mobileJumpBtn');
    jumpBtn.addEventListener('touchstart', e => {
        e.preventDefault();
        // Dispatch a synthetic space key
        document.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', bubbles: true }));
    }, { passive: false });

    // Hide crosshair and lessonHUD adjustments on mobile
    const cross = document.getElementById('crosshair');
    if (cross) cross.style.display = 'none';
}

// ─────────────────────────────────────────────────────────────────────────────
//  audio.js
//  All game audio synthesized with the Web Audio API — zero external files.
//
//  Sound effects:
//    playCorrect()   — pleasant chime when student gets an answer right
//    playWrong()     — buzz when answer is wrong
//    playUnlock()    — epic sweep when an ability is unlocked
//    playLevelUp()   — 4-note fanfare on level up
//
//  Ambient:
//    startAmbience()         — kicks off ocean + bird loops
//    setOceanVolume(0–1)     — called each frame by main.js based on
//                              player distance to beach
// ─────────────────────────────────────────────────────────────────────────────

// ── AUDIO CONTEXT ─────────────────────────────────────────────────────────────
// We lazy-create the AudioContext on first user interaction to comply with
// browser autoplay policies. Call initAudio() once on the first click/keypress.
let ctx = null;

export function initAudio() {
    if (ctx) return; // already initialised
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    startAmbience();
}

// ── MASTER VOLUME ─────────────────────────────────────────────────────────────
// All sounds route through this so we can add a settings slider later
function getMaster() {
    const master = ctx.createGain();
    master.gain.value = 0.7;
    master.connect(ctx.destination);
    return master;
}

// ── HELPERS ───────────────────────────────────────────────────────────────────
// Play a single sine/square/sawtooth tone
function playTone(freq, type, startTime, duration, gainVal, destination) {
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);
    gain.gain.setValueAtTime(gainVal, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    osc.connect(gain);
    gain.connect(destination);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.05);
}

// ── ✅ CORRECT CHIME ──────────────────────────────────────────────────────────
// C-E-G arpeggio — bright and rewarding
export function playCorrect() {
    if (!ctx) return;
    const master = getMaster();
    const now = ctx.currentTime;
    // C5 - E5 - G5 — quick arpeggio
    playTone(523.25, 'sine', now,        0.25, 0.4, master); // C5
    playTone(659.25, 'sine', now + 0.08, 0.25, 0.4, master); // E5
    playTone(783.99, 'sine', now + 0.16, 0.35, 0.5, master); // G5
    // Little shimmer on top
    playTone(1046.5, 'sine', now + 0.20, 0.4,  0.2, master); // C6
}

// ── ❌ WRONG BUZZ ─────────────────────────────────────────────────────────────
// Low sawtooth with a quick pitch drop — feels like a wrong-answer buzzer
export function playWrong() {
    if (!ctx) return;
    const master = getMaster();
    const now = ctx.currentTime;

    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.3);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(master);
    osc.start(now);
    osc.stop(now + 0.4);
}

// ── ⚡ ABILITY UNLOCK ─────────────────────────────────────────────────────────
// Epic ascending frequency sweep + bright harmonic on top
// Plays right before the big ability flash overlay
export function playUnlock() {
    if (!ctx) return;
    const master = getMaster();
    const now = ctx.currentTime;

    // Rising sweep
    const sweep = ctx.createOscillator();
    const sweepGain = ctx.createGain();
    sweep.type = 'sine';
    sweep.frequency.setValueAtTime(220, now);
    sweep.frequency.exponentialRampToValueAtTime(1320, now + 0.6);
    sweepGain.gain.setValueAtTime(0.5, now);
    sweepGain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
    sweep.connect(sweepGain);
    sweepGain.connect(master);
    sweep.start(now);
    sweep.stop(now + 0.85);

    // Triumphant chord after the sweep — E major
    const chord = [659.25, 830.61, 987.77]; // E5, G#5, B5
    chord.forEach((freq, i) => {
        playTone(freq, 'sine', now + 0.5 + i * 0.06, 0.8, 0.3, master);
    });

    // Sparkle on top
    playTone(1318.5, 'sine', now + 0.65, 0.6, 0.2, master); // E6
    playTone(1567.98,'sine', now + 0.75, 0.5, 0.15, master); // G6
}

// ── ⬆ LEVEL UP FANFARE ───────────────────────────────────────────────────────
// Classic 4-note ascending video game fanfare
// C - E - G - C (one octave up) — instantly recognisable
export function playLevelUp() {
    if (!ctx) return;
    const master = getMaster();
    const now = ctx.currentTime;

    const notes = [
        { freq: 523.25, t: 0.00 },  // C5
        { freq: 659.25, t: 0.12 },  // E5
        { freq: 783.99, t: 0.24 },  // G5
        { freq: 1046.5, t: 0.36 },  // C6 — big finish
    ];

    notes.forEach(n => {
        // Each note: square wave for that retro game feel
        playTone(n.freq, 'square', now + n.t, 0.22, 0.25, master);
        // Layer a softer sine underneath for warmth
        playTone(n.freq, 'sine',   now + n.t, 0.22, 0.15, master);
    });

    // Hold the final C6 a bit longer
    playTone(1046.5, 'sine', now + 0.58, 0.5, 0.2, master);
}

// ── 🌊 OCEAN WAVES ────────────────────────────────────────────────────────────
// White noise through a low-pass filter with a slow LFO on volume
// Simulates the rhythmic wash of waves
let oceanGain = null;

function createOceanAmbience() {
    // White noise source — we fill a buffer with random samples
    const bufferSize = ctx.sampleRate * 4; // 4 seconds of noise
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data   = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop   = true;

    // Low-pass filter — cuts out high frequencies, leaves that deep wave rumble
    const filter = ctx.createBiquadFilter();
    filter.type            = 'lowpass';
    filter.frequency.value = 400;
    filter.Q.value         = 0.8;

    // LFO — slowly modulates volume to simulate wave rhythm
    const lfo     = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value  = 0.18; // ~one wave every 5-6 seconds
    lfoGain.gain.value   = 0.3;
    lfo.connect(lfoGain);

    // Master gain for this ambience — controlled externally via setOceanVolume()
    oceanGain = ctx.createGain();
    oceanGain.gain.value = 0; // starts silent — main.js fades it in near beach

    lfoGain.connect(oceanGain.gain); // LFO modulates the gain
    noise.connect(filter);
    filter.connect(oceanGain);
    oceanGain.connect(ctx.destination);

    noise.start();
    lfo.start();
}

// setOceanVolume — called every frame from main.js
// volume = 0 (far from beach) to 1 (standing on the sand)
export function setOceanVolume(volume) {
    if (!oceanGain) return;
    // Smooth transition — avoid clicks
    oceanGain.gain.setTargetAtTime(volume * 0.55, ctx.currentTime, 0.5);
}

// ── 🐦 BIRD CHIRPS ────────────────────────────────────────────────────────────
// Random short chirp bursts at irregular intervals
// Each chirp = a quick frequency sweep on a sine oscillator
function scheduleBirdChirp() {
    if (!ctx) return;

    const master = getMaster();

    // Random chirp: frequency between 1800–3200 Hz, short duration
    const baseFreq = 1800 + Math.random() * 1400;
    const duration = 0.04 + Math.random() * 0.08;
    const now      = ctx.currentTime;

    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq, now);
    // Chirp = quick pitch up then down
    osc.frequency.linearRampToValueAtTime(baseFreq * 1.3, now + duration * 0.4);
    osc.frequency.linearRampToValueAtTime(baseFreq * 0.9, now + duration);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.12, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration + 0.02);

    osc.connect(gain);
    gain.connect(master);
    osc.start(now);
    osc.stop(now + duration + 0.05);

    // Sometimes do a quick double chirp
    if (Math.random() < 0.4) {
        const osc2  = ctx.createOscillator();
        const gain2 = ctx.createGain();
        const t2    = now + duration + 0.07;
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(baseFreq * 1.1, t2);
        osc2.frequency.linearRampToValueAtTime(baseFreq * 1.4, t2 + duration * 0.4);
        osc2.frequency.linearRampToValueAtTime(baseFreq, t2 + duration);
        gain2.gain.setValueAtTime(0, t2);
        gain2.gain.linearRampToValueAtTime(0.1, t2 + 0.01);
        gain2.gain.exponentialRampToValueAtTime(0.001, t2 + duration + 0.02);
        osc2.connect(gain2);
        gain2.connect(master);
        osc2.start(t2);
        osc2.stop(t2 + duration + 0.05);
    }

    // Schedule the next chirp — random interval between 2 and 8 seconds
    const nextChirp = 2000 + Math.random() * 6000;
    setTimeout(scheduleBirdChirp, nextChirp);
}

// ── START ALL AMBIENCE ────────────────────────────────────────────────────────
// Called once by initAudio() after the AudioContext is created
export function startAmbience() {
    createOceanAmbience();
    // First bird chirp after a short random delay
    setTimeout(scheduleBirdChirp, 1500 + Math.random() * 2000);
}

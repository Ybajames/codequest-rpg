// multiplayer.js — shared Partykit WebSocket manager
// Replace PARTYKIT_HOST with your deployed host after running: npx partykit deploy

const PARTYKIT_HOST = 'codequest.ybajames.partykit.dev';
export function createRoom(roomId, username, mode, callbacks) {
    const url = `wss://${PARTYKIT_HOST}/parties/main/${roomId}`;
    const ws  = new WebSocket(url);
    let   connected = false;

    ws.addEventListener('open', () => {
        connected = true;
        ws.send(JSON.stringify({ type: 'join', username, mode }));
    });

    ws.addEventListener('message', e => {
        try {
            const data = JSON.parse(e.data);
            callbacks.onMessage?.(data);
        } catch {}
    });

    ws.addEventListener('close', () => {
        connected = false;
        callbacks.onDisconnect?.();
    });

    ws.addEventListener('error', () => {
        callbacks.onError?.();
    });

    return {
        send: (data) => {
            if (connected && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify(data));
            }
        },
        close: () => ws.close(),
        isOpen: () => connected,
    };
}

// Generate a short shareable room code
export function makeRoomCode() {
    return Math.random().toString(36).slice(2, 7).toUpperCase();
}

// Seeded random — both players get same questions from same seed
export function seededShuffle(arr, seed) {
    const a   = [...arr];
    let   s   = seed;
    const rng = () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff; };
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

// minimap.js — canvas-based overhead minimap
// Shows player position, NPCs, portals, and island boundary

const SIZE    = 140;
const SCALE   = SIZE / 120; // 120 world units across the island diameter
const HALF    = SIZE / 2;

// ── CREATE CANVAS ─────────────────────────────────────────────────────────────
const canvas  = document.createElement('canvas');
canvas.width  = SIZE;
canvas.height = SIZE;
canvas.id     = 'minimap';
canvas.style.cssText = `
    position: fixed;
    top: 96px; right: 16px;
    width: ${SIZE}px; height: ${SIZE}px;
    border-radius: 50%;
    border: 1px solid rgba(0,245,255,0.25);
    background: rgba(6,10,20,0.82);
    pointer-events: none;
    z-index: 250;
    box-shadow: 0 0 12px rgba(0,245,255,0.08);
`;
document.body.appendChild(canvas);
const ctx = canvas.getContext('2d');

// Static elements to draw (NPCs + portals)
const STATIC = [
    // NPCs
    { x: -18, z: -12, color: '#42a5f5', r: 3, label: 'Var' },
    { x:  20, z: -14, color: '#66bb6a', r: 3, label: 'Prt' },
    { x: -20, z:  16, color: '#ffa726', r: 3, label: 'Log' },
    { x:  22, z:  18, color: '#ef5350', r: 3, label: 'Lp'  },
    { x: -22, z: -20, color: '#ab47bc', r: 3, label: 'Fn'  },
    { x:  16, z: -22, color: '#26c6da', r: 3, label: 'Inp' },
    // Portals
    { x:   0, z: -32, color: '#2196f3', r: 4, label: '⚔' },
    { x:  30, z:   8, color: '#f44336', r: 4, label: '🏎' },
    { x: -30, z:   8, color: '#ffc107', r: 4, label: '⚡' },
    // Guide
    { x:   0, z:  10, color: '#00f5ff', r: 3, label: '🤖' },
];

function worldToMap(wx, wz) {
    return {
        mx: HALF + wx * SCALE,
        my: HALF + wz * SCALE,
    };
}

export function drawMinimap(playerX, playerZ, playerYaw) {
    ctx.clearRect(0, 0, SIZE, SIZE);

    // Clip to circle
    ctx.save();
    ctx.beginPath();
    ctx.arc(HALF, HALF, HALF - 1, 0, Math.PI * 2);
    ctx.clip();

    // Ocean background
    ctx.fillStyle = '#0a1628';
    ctx.fillRect(0, 0, SIZE, SIZE);

    // Island circle
    ctx.beginPath();
    ctx.arc(HALF, HALF, 55 * SCALE, 0, Math.PI * 2);
    ctx.fillStyle = '#2d4a1e';
    ctx.fill();

    // Beach ring
    ctx.beginPath();
    ctx.arc(HALF, HALF, 55 * SCALE, 0, Math.PI * 2);
    ctx.arc(HALF, HALF, (55 - 8) * SCALE, 0, Math.PI * 2, true);
    ctx.fillStyle = '#c8a96e';
    ctx.fill();

    // Plaza
    ctx.fillStyle = '#7a8a8a';
    ctx.fillRect(HALF - 8*SCALE, HALF - 8*SCALE, 16*SCALE, 16*SCALE);

    // Static dots (NPCs + portals)
    STATIC.forEach(s => {
        const { mx, my } = worldToMap(s.x, s.z);
        ctx.beginPath();
        ctx.arc(mx, my, s.r, 0, Math.PI * 2);
        ctx.fillStyle = s.color;
        ctx.fill();
        // Glow
        ctx.beginPath();
        ctx.arc(mx, my, s.r + 1.5, 0, Math.PI * 2);
        ctx.fillStyle = s.color + '44';
        ctx.fill();
    });

    // Player dot
    const { mx: px, my: pz } = worldToMap(playerX, playerZ);

    // Direction indicator
    ctx.save();
    ctx.translate(px, pz);
    ctx.rotate(-playerYaw);
    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.lineTo(4, 4);
    ctx.lineTo(-4, 4);
    ctx.closePath();
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#00f5ff';
    ctx.shadowBlur  = 8;
    ctx.fill();
    ctx.restore();

    // Player circle
    ctx.beginPath();
    ctx.arc(px, pz, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#00f5ff';
    ctx.shadowColor = '#00f5ff';
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.restore();

    // Compass labels
    ctx.fillStyle = 'rgba(224,250,255,0.35)';
    ctx.font = '8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('N', HALF, 10);
    ctx.fillText('S', HALF, SIZE - 3);
    ctx.textAlign = 'left';
    ctx.fillText('W', 3, HALF + 3);
    ctx.textAlign = 'right';
    ctx.fillText('E', SIZE - 3, HALF + 3);
}

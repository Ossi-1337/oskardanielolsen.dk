const canvas = document.getElementById('sky');
const ctx = canvas.getContext('2d', { alpha: false });

/**
 * Star model
 * - (homeX, homeY) is the "true" position
 * - (x, y, vx, vy) is the displaced position
 */
let stars = [];

const mouse = {
    x: 0,
    y: 0,
    active: false,
};

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function rand(min, max) {
    return min + Math.random() * (max - min);
}

function resize() {
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    buildStars();
}

function buildStars() {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    // Density tuned to look good on typical screens.
    const targetCount = Math.floor(clamp((width * height) / 2500, 350, 1400));
    const next = new Array(targetCount);

    for (let i = 0; i < targetCount; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;

        // Slight bias towards smaller stars, with a few brighter ones.
        const radius = Math.pow(Math.random(), 2.2) * 1.8 + 0.2;
        const baseAlpha = clamp(0.35 + Math.random() * 0.55, 0.2, 0.95);
        const twinkleSpeed = rand(0.6, 1.8);
        const twinkleOffset = Math.random() * Math.PI * 2;
        const hueShift = rand(-12, 12);

        next[i] = {
            homeX: x,
            homeY: y,
            x,
            y,
            vx: 0,
            vy: 0,
            radius,
            baseAlpha,
            twinkleSpeed,
            twinkleOffset,
            hueShift,
        };
    }

    stars = next;
}

function drawBackground(width, height) {
    // Deep night gradient
    const g = ctx.createLinearGradient(0, 0, 0, height);
    g.addColorStop(0, '#02030a');
    g.addColorStop(0.55, '#050612');
    g.addColorStop(1, '#07081a');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, height);

    // Subtle vignette
    const vg = ctx.createRadialGradient(
        width * 0.5,
        height * 0.55,
        Math.min(width, height) * 0.2,
        width * 0.5,
        height * 0.55,
        Math.max(width, height) * 0.75
    );
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, width, height);
}

function drawStars(timeSeconds) {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    // Interaction + gentle spring-back
    const influenceRadius = 140;
    const influenceRadiusSq = influenceRadius * influenceRadius;
    const repelStrength = 38;
    const spring = 0.015;
    const friction = 0.90;

    for (const s of stars) {
        // Spring back to home
        const dxHome = s.homeX - s.x;
        const dyHome = s.homeY - s.y;
        s.vx += dxHome * spring;
        s.vy += dyHome * spring;

        if (mouse.active) {
            const dx = s.x - mouse.x;
            const dy = s.y - mouse.y;
            const distSq = dx * dx + dy * dy;
            if (distSq > 1 && distSq < influenceRadiusSq) {
                // Repel stronger near the cursor to create a "cleared" path
                const dist = Math.sqrt(distSq);
                const nx = dx / dist;
                const ny = dy / dist;
                const t = 1 - dist / influenceRadius;
                const push = repelStrength * t * t;
                s.vx += nx * push * 0.06;
                s.vy += ny * push * 0.06;
            }
        }

        s.vx *= friction;
        s.vy *= friction;
        s.x += s.vx;
        s.y += s.vy;

        // Keep displaced stars within bounds a bit (so they don't get lost)
        s.x = clamp(s.x, -50, width + 50);
        s.y = clamp(s.y, -50, height + 50);

        // Twinkle
        const tw = (Math.sin(timeSeconds * s.twinkleSpeed + s.twinkleOffset) + 1) * 0.5;
        const alpha = clamp(s.baseAlpha * (0.75 + tw * 0.6), 0.08, 1);

        // Slight cool-to-warm variation without feeling colorful
        const hue = 210 + s.hueShift;
        ctx.fillStyle = `hsla(${hue}, 35%, 88%, ${alpha})`;

        ctx.beginPath();
        ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
        ctx.fill();

        // A few stars get a tiny glow
        if (s.radius > 1.6 && tw > 0.75) {
            ctx.fillStyle = `hsla(${hue}, 45%, 92%, ${alpha * 0.35})`;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.radius * 2.2, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

// Shooting star
let shootingStar = null;
let nextShootingStarAt = 0;

function scheduleNextShootingStar(nowMs) {
    // Rare: random between 5–10 minutes
    const min = 5 * 60 * 1000;
    const max = 10 * 60 * 1000;
    nextShootingStarAt = nowMs + rand(min, max);
}

function maybeSpawnShootingStar(nowMs) {
    if (shootingStar || nowMs < nextShootingStarAt) return;

    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    // Start slightly off-screen, mostly from upper part of the sky
    const startX = rand(-width * 0.2, width * 0.6);
    const startY = rand(-height * 0.15, height * 0.35);
    const angle = rand(Math.PI * 0.15, Math.PI * 0.28); // down-right
    const speed = rand(900, 1400); // px/sec
    const length = rand(180, 320);
    const life = rand(0.7, 1.1);

    shootingStar = {
        x: startX,
        y: startY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        length,
        age: 0,
        life,
    };

    scheduleNextShootingStar(nowMs);
}

function drawShootingStar(dt) {
    if (!shootingStar) return;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    shootingStar.age += dt;
    shootingStar.x += shootingStar.vx * dt;
    shootingStar.y += shootingStar.vy * dt;

    const t = clamp(shootingStar.age / shootingStar.life, 0, 1);
    const fade = 1 - Math.pow(t, 1.6);

    const dx = shootingStar.vx;
    const dy = shootingStar.vy;
    const vLen = Math.max(1, Math.hypot(dx, dy));
    const nx = dx / vLen;
    const ny = dy / vLen;

    const tailX = shootingStar.x - nx * shootingStar.length;
    const tailY = shootingStar.y - ny * shootingStar.length;

    const grad = ctx.createLinearGradient(shootingStar.x, shootingStar.y, tailX, tailY);
    grad.addColorStop(0, `rgba(255,255,255,${0.95 * fade})`);
    grad.addColorStop(0.35, `rgba(210,225,255,${0.45 * fade})`);
    grad.addColorStop(1, 'rgba(160,190,255,0)');

    ctx.strokeStyle = grad;
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(shootingStar.x, shootingStar.y);
    ctx.lineTo(tailX, tailY);
    ctx.stroke();

    // Head glow
    ctx.fillStyle = `rgba(255,255,255,${0.35 * fade})`;
    ctx.beginPath();
    ctx.arc(shootingStar.x, shootingStar.y, 6, 0, Math.PI * 2);
    ctx.fill();

    const outOfBounds =
        shootingStar.x > width + 400 ||
        shootingStar.y > height + 400 ||
        shootingStar.age > shootingStar.life;
    if (outOfBounds) {
        shootingStar = null;
    }
}

let lastMs = performance.now();
scheduleNextShootingStar(lastMs);

function frame(nowMs) {
    const dt = Math.min(0.05, (nowMs - lastMs) / 1000);
    lastMs = nowMs;

    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    drawBackground(width, height);
    drawStars(nowMs / 1000);
    maybeSpawnShootingStar(nowMs);
    drawShootingStar(dt);

    requestAnimationFrame(frame);
}

window.addEventListener('resize', resize);

window.addEventListener('pointermove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
    mouse.active = true;
});

window.addEventListener('pointerleave', () => {
    mouse.active = false;
});

resize();
requestAnimationFrame(frame);

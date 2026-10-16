// js/bg-network.js
// Site-wide background: a realistic 3D night sky (sky only, no ground).
//
// Every star lives on a real celestial sphere and is drawn through a perspective
// camera. The whole sky turns slowly around a pole (like a long-exposure photo),
// the mouse lets you look around, and scrolling tilts the camera toward the zenith.
// Star brightness follows a realistic magnitude distribution (thousands of faint
// stars, a handful of bright ones), colours follow stellar temperatures, faint
// stars twinkle more than bright ones, and a grainy Milky Way band with a warm
// core and dark dust lanes arcs across the sky. Shooting stars fly across the
// sphere. Follows the theme; still for "reduce motion".

export function initNetworkBackground() {
  if (document.getElementById('bg-network')) return;

  const canvas = document.createElement('canvas');
  canvas.id = 'bg-network';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.prepend(canvas);
  const ctx = canvas.getContext('2d');

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- settings -----------------------------------------------------------
  const SKY_SPIN = 0.004;        // radians per second the sky turns around the pole
  const STAR_DENSITY = 2000;     // lower number = more stars
  const FOV_SCALE = 0.62;        // focal length relative to the screen's longer side
  const LATITUDE = 0.55;         // pole height (radians) - tilt of the rotation axis
  const BASE_PITCH = 0.30;       // camera look-up at the top of the page
  const SCROLL_PITCH = 0.00035;  // extra look-up per px of page scroll
  const SCROLL_SPIN = 0.00025;   // extra sky rotation per px of page scroll
  const MAX_PITCH = 1.25;        // never look further up than this
  const LOOK_YAW = 0.5;          // mouse look-around, left/right
  const LOOK_PITCH = 0.25;       // mouse look-around, up/down
  const SCROLL_SMOOTH = 5;       // higher = background follows scroll more tightly
  const CONSTELLATION_LINES = true; // faint lines between stars near the cursor (set false for a purely natural sky)
  const LINK_R = 140;            // constellation radius around the cursor
  const LINK_D = 95;             // longest line between two stars
  // stellar colours: blue-white, white, yellow-white, orange, red-orange (kept subtle, like real stars)
  const TEMPS = [[185, 205, 255], [248, 248, 255], [255, 247, 232], [255, 224, 185], [255, 190, 150]];
  const LIGHT_STAR = 'rgb(40,55,110)';
  const TAU = Math.PI * 2;

  // ---- state --------------------------------------------------------------
  const mouse = { x: -9999, y: -9999 };
  let w, h, dpr, f, CX, CY;
  let stars = [], clouds = [], meteors = [];
  let glow, sprites, skyGrad;
  let rot = 0, px = 0, py = 0, nextMeteor = 2.5, last = 0;
  let sy = window.scrollY, scrollTarget = sy;
  let rgb = [251, 146, 60], isDark = true;
  let yaw = 0, pitch = BASE_PITCH, cosY = 1, sinY = 0, cosP = 1, sinP = 0;
  let milkyU, milkyV, milkyN, bulge = 0;
  const Rm = new Float64Array(9);          // sky rotation (around the pole)
  const out = { x: 0, y: 0, z: 0 };

  // ---- small helpers ------------------------------------------------------
  const rand = (a, b) => a + Math.random() * (b - a);
  const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const norm = v => { const l = Math.hypot(v[0], v[1], v[2]); return [v[0] / l, v[1] / l, v[2] / l]; };
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

  function randomDir() {
    const y = rand(-1, 1), a = rand(0, TAU), s = Math.sqrt(1 - y * y);
    return [s * Math.cos(a), y, s * Math.sin(a)];
  }

  // Bright stars show their colour; faint ones look nearly white (as to the real eye)
  function starColor(m, pale) {
    const r = Math.random();
    const t = r < 0.10 ? TEMPS[0] : r < 0.42 ? TEMPS[1] : r < 0.72 ? TEMPS[2] : r < 0.92 ? TEMPS[3] : TEMPS[4];
    const k = clamp((pale ? 0.45 : 0.2) + (1 - m) * 0.45, 0, 0.9);   // pull toward white
    return `rgb(${t[0] + (255 - t[0]) * k | 0},${t[1] + (255 - t[1]) * k | 0},${t[2] + (255 - t[2]) * k | 0})`;
  }

  function readTheme() {
    isDark = document.documentElement.getAttribute('data-theme') !== 'light';
    const hex = getComputedStyle(document.documentElement)
      .getPropertyValue('--accent-primary').trim().replace('#', '');
    if (hex.length === 6) rgb = [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16));
  }

  // ---- pre-rendered sprites -----------------------------------------------
  function makeGlow() {
    glow = document.createElement('canvas');
    glow.width = glow.height = 32;
    const g = glow.getContext('2d');
    const grad = g.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, 'rgba(255,255,255,0.8)');
    grad.addColorStop(0.2, 'rgba(210,222,255,0.28)');
    grad.addColorStop(1, 'rgba(210,222,255,0)');
    g.fillStyle = grad; g.fillRect(0, 0, 32, 32);
  }

  function makeSprite(r, g, b, peak) {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const x = c.getContext('2d');
    const grad = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, `rgba(${r},${g},${b},${peak})`);
    grad.addColorStop(0.5, `rgba(${r},${g},${b},${peak * 0.4})`);
    grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
    x.fillStyle = grad; x.fillRect(0, 0, 64, 64);
    return c;
  }

  // Deep night sky: darker at the top, a very faint lift toward the bottom (airglow)
  function makeSkyGradient() {
    skyGrad = ctx.createLinearGradient(0, 0, 0, h);
    skyGrad.addColorStop(0, 'rgba(3,6,22,0.65)');
    skyGrad.addColorStop(0.6, 'rgba(10,14,42,0.35)');
    skyGrad.addColorStop(1, 'rgba(18,24,60,0.22)');
  }

  // ---- the sky itself -----------------------------------------------------
  function setupMilkyWay() {
    // a great circle that passes near the pole, so it stays in view while the sky turns
    const P = norm([0.25, 0.55, 0.8]);
    milkyN = norm(cross(P, [1, 0.35, 0]));
    milkyU = norm(cross(milkyN, [0, 0, 1]));
    milkyV = cross(milkyN, milkyU);
    bulge = Math.atan2(dot(P, milkyV), dot(P, milkyU));     // the thick, bright core of the band
  }

  function bandDir(phi, b) {
    const cb = Math.cos(b), sb = Math.sin(b), c = Math.cos(phi), s = Math.sin(phi);
    return [
      (c * milkyU[0] + s * milkyV[0]) * cb + milkyN[0] * sb,
      (c * milkyU[1] + s * milkyV[1]) * cb + milkyN[1] * sb,
      (c * milkyU[2] + s * milkyV[2]) * cb + milkyN[2] * sb
    ];
  }

  function bandPhi() {                                      // denser toward the core
    for (;;) {
      const phi = rand(-Math.PI, Math.PI);
      let d = Math.abs(phi - bulge); if (d > Math.PI) d = TAU - d;
      const wt = 0.25 + 0.75 * Math.exp(-d * d / 0.5);
      if (Math.random() < wt) return { phi, wt };
    }
  }

  function buildStars() {
    f = Math.max(w, h) * FOV_SCALE; CX = w / 2; CY = h / 2;
    const base = Math.floor(4 * Math.PI * f * f / STAR_DENSITY);   // stars on the whole sphere

    stars = [];
    for (let i = 0; i < base; i++) {                        // field stars: very many faint, very few bright
      const d = randomDir(), m = Math.pow(Math.random(), 4.5);
      stars.push({
        dx: d[0], dy: d[1], dz: d[2],
        r: 0.3 + m * 1.5, a: 0.18 + 0.82 * Math.pow(m, 0.6),
        sp: rand(0.8, 3.2), ph: rand(0, TAU),
        amp: 0.06 + 0.3 * (1 - m),                          // faint stars twinkle more
        col: starColor(m, false), glow: m > 0.8, dust: false
      });
    }
    const dust = Math.floor(base * 1.3);
    for (let i = 0; i < dust; i++) {                        // Milky Way: lots of unresolved faint stars
      const { phi, wt } = bandPhi();
      const d = bandDir(phi, gauss() * (0.16 + 0.22 * wt));
      const m = Math.pow(Math.random(), 2.6) * 0.4;
      stars.push({
        dx: d[0], dy: d[1], dz: d[2],
        r: 0.3 + m * 1.2, a: 0.12 + 0.75 * m,
        sp: rand(0.8, 3.2), ph: rand(0, TAU),
        amp: 0.15,
        col: starColor(m, true), glow: false, dust: true
      });
    }

    clouds = [];
    for (let i = 0; i < 190; i++) {                         // soft glow along the band; warm near the core
      const { phi, wt } = bandPhi();
      clouds.push({
        d: bandDir(phi, gauss() * 0.11 * (0.6 + wt)),
        rad: rand(0.05, 0.12) * (0.7 + wt * 0.8),
        a: rand(0.4, 0.9) * (0.45 + wt * 0.5),
        k: wt > 0.8 ? 2 : i % 2                             // 2 = warm core, 0/1 = blue/violet arms
      });
    }
    for (let i = 0; i < 48; i++) {                          // dark dust lanes
      const { phi } = bandPhi();
      clouds.push({ d: bandDir(phi, gauss() * 0.06), rad: rand(0.025, 0.065), a: rand(0.4, 0.9), k: 3 });
    }
  }

  // ---- camera -------------------------------------------------------------
  function updateCamera() {
    yaw = px * LOOK_YAW;
    pitch = clamp(BASE_PITCH + sy * SCROLL_PITCH - py * LOOK_PITCH, 0, MAX_PITCH);
    cosY = Math.cos(yaw); sinY = Math.sin(yaw);
    cosP = Math.cos(pitch); sinP = Math.sin(pitch);

    // rotation of the sky around the pole axis (0, sin lat, cos lat)
    const th = rot + sy * SCROLL_SPIN;
    const c = Math.cos(th), s = Math.sin(th), k = 1 - c;
    const sl = Math.sin(LATITUDE), cl = Math.cos(LATITUDE);
    Rm[0] = c;        Rm[1] = -s * cl;      Rm[2] = s * sl;
    Rm[3] = s * cl;   Rm[4] = c + k * sl * sl; Rm[5] = k * sl * cl;
    Rm[6] = -s * sl;  Rm[7] = k * sl * cl;  Rm[8] = c + k * cl * cl;
  }

  // world direction -> screen (camera only, no sky rotation)
  function camProject(x, y, z) {
    const x1 = x * cosY - z * sinY, z1 = x * sinY + z * cosY;
    const y2 = y * cosP - z1 * sinP, z2 = y * sinP + z1 * cosP;
    if (z2 < 0.05) return false;
    out.x = CX + f * x1 / z2; out.y = CY - f * y2 / z2; out.z = z2;
    return true;
  }

  // star direction -> rotate with the sky -> screen (no horizon: the whole sphere is sky)
  function skyProject(dx, dy, dz) {
    const vx = Rm[0] * dx + Rm[1] * dy + Rm[2] * dz;
    const vy = Rm[3] * dx + Rm[4] * dy + Rm[5] * dz;
    const vz = Rm[6] * dx + Rm[7] * dy + Rm[8] * dz;
    return camProject(vx, vy, vz);
  }

  // screen point -> world direction
  function unproject(x, y) {
    const a = (x - CX) / f, b = (CY - y) / f, l = Math.hypot(a, b, 1);
    const xc = a / l, yc = b / l, zc = 1 / l;
    const y1 = yc * cosP + zc * sinP, z1 = -yc * sinP + zc * cosP;
    return [xc * cosY + z1 * sinY, y1, -xc * sinY + z1 * cosY];
  }

  // ---- shooting stars (travel along great circles) ------------------------
  function spawnMeteor() {
    const sx = rand(w * 0.25, w), sy0 = rand(h * 0.02, h * 0.6);
    const p = unproject(sx, sy0);
    const A = rand(0.35, 0.7);                              // heading down-left
    const q = unproject(sx - Math.cos(A) * 120, sy0 + Math.sin(A) * 120);
    const d = dot(p, q);
    const t = norm([q[0] - p[0] * d, q[1] - p[1] * d, q[2] - p[2] * d]);
    meteors.push({ p, t, ang: rand(0.45, 0.75), len: rand(0.1, 0.16), age: 0, life: rand(0.9, 1.3) });
  }

  function projArc(m, s) {
    const c = Math.cos(s), n = Math.sin(s);
    return camProject(m.p[0] * c + m.t[0] * n, m.p[1] * c + m.t[1] * n, m.p[2] * c + m.t[2] * n);
  }

  // ---- drawing ------------------------------------------------------------
  function drawCloud(c) {
    if (!skyProject(c.d[0], c.d[1], c.d[2])) return;
    const r = f * c.rad / out.z, x = out.x, y = out.y;
    if (x < -r || x > w + r || y < -r || y > h + r) return;
    ctx.globalAlpha = c.a;
    ctx.drawImage(sprites[c.k], x - r, y - r, r * 2, r * 2);
  }

  function drawMilkyWay() {
    ctx.globalCompositeOperation = 'lighter';
    for (const c of clouds) if (c.k < 3) drawCloud(c);
    ctx.globalCompositeOperation = 'source-over';
    for (const c of clouds) if (c.k === 3) drawCloud(c);
    ctx.globalAlpha = 1;
  }

  function draw(t) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    updateCamera();

    if (isDark) {
      ctx.fillStyle = skyGrad; ctx.fillRect(0, 0, w, h);
      drawMilkyWay();
    }

    // stars
    const near = [];
    const mouseOn = CONSTELLATION_LINES && mouse.x > -9000;
    for (const s of stars) {
      if (!skyProject(s.dx, s.dy, s.dz)) continue;
      const x = out.x, y = out.y;
      if (x < -10 || x > w + 10 || y < -10 || y > h + 10) continue;

      const tw = reduceMotion ? 1 : 1 - s.amp * (0.5 + 0.5 * Math.sin(t * s.sp + s.ph) * Math.sin(t * s.sp * 0.37 + s.ph * 2));
      const a = s.a * tw * (isDark ? 1 : 0.55);

      if (isDark && s.glow) {
        const gs = 12 + s.r * 12;
        ctx.globalAlpha = a * 0.7;
        ctx.drawImage(glow, x - gs / 2, y - gs / 2, gs, gs);
      }
      ctx.globalAlpha = a;
      ctx.fillStyle = isDark ? s.col : LIGHT_STAR;
      if (s.r < 0.9) {
        const q = Math.max(s.r, 0.5);                      // faint stars: crisp sub-pixel specks
        ctx.fillRect(x - q, y - q, q * 2, q * 2);
      } else {
        ctx.beginPath(); ctx.arc(x, y, s.r, 0, TAU); ctx.fill();
      }

      if (mouseOn && !s.dust && near.length < 30) {
        const md = Math.hypot(x - mouse.x, y - mouse.y);
        if (md < LINK_R) near.push({ x, y, md });
      }
    }
    ctx.globalAlpha = 1;

    // constellation around the cursor
    if (CONSTELLATION_LINES) {
      ctx.lineWidth = 1;
      for (let i = 0; i < near.length; i++) {
        for (let j = i + 1; j < near.length; j++) {
          const d = Math.hypot(near[i].x - near[j].x, near[i].y - near[j].y);
          if (d > LINK_D) continue;
          const k = 1 - (near[i].md + near[j].md) / (2 * LINK_R);
          ctx.strokeStyle = isDark ? `rgba(170,190,255,${k * 0.3})` : `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${k * 0.5})`;
          ctx.beginPath(); ctx.moveTo(near[i].x, near[i].y); ctx.lineTo(near[j].x, near[j].y); ctx.stroke();
        }
      }
      for (const p of near) {
        ctx.fillStyle = isDark ? `rgba(220,230,255,${(1 - p.md / LINK_R) * 0.8})` : `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${(1 - p.md / LINK_R)})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, 1.6, 0, TAU); ctx.fill();
      }
    }

    // shooting stars
    ctx.lineCap = 'round';
    for (const m of meteors) {
      const sh = m.ang * m.age, st = Math.max(0, sh - m.len);
      if (!projArc(m, sh)) continue;
      const hx = out.x, hy = out.y;
      if (!projArc(m, st)) continue;
      const tx = out.x, ty = out.y;
      const env = Math.min(m.age / 0.1, 1) * Math.min((m.life - m.age) / 0.3, 1);
      const col = isDark ? '255,255,255' : `${rgb[0]},${rgb[1]},${rgb[2]}`;
      const g = ctx.createLinearGradient(hx, hy, tx, ty);
      g.addColorStop(0, `rgba(${col},${env})`);
      g.addColorStop(1, `rgba(${col},0)`);
      ctx.strokeStyle = g; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(tx, ty); ctx.stroke();
      ctx.fillStyle = `rgba(${col},${env})`;
      ctx.shadowColor = `rgba(${col},0.9)`; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.arc(hx, hy, 1.6, 0, TAU); ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.05); last = now;
    rot += SKY_SPIN * dt;

    const tx = mouse.x > -9000 ? (mouse.x - w / 2) / w : 0;
    const ty = mouse.y > -9000 ? (mouse.y - h / 2) / h : 0;
    const k = 1 - Math.exp(-dt * 3);
    px += (tx - px) * k; py += (ty - py) * k;
    sy += (scrollTarget - sy) * (1 - Math.exp(-dt * SCROLL_SMOOTH));

    nextMeteor -= dt;
    if (nextMeteor <= 0 && meteors.length < 2) { spawnMeteor(); nextMeteor = rand(5, 12); }
    for (const m of meteors) m.age += dt;
    meteors = meteors.filter(m => m.age < m.life);

    draw(now / 1000);
    requestAnimationFrame(frame);
  }

  function resize() {
    if (w && window.innerWidth === w && window.innerHeight <= h && h - window.innerHeight < 200) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth; h = window.innerHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
    buildStars(); makeSkyGradient();
    meteors = [];
    if (reduceMotion) draw(0);
  }

  readTheme();
  makeGlow();
  sprites = [
    makeSprite(110, 130, 255, 0.08),   // blue arms
    makeSprite(160, 125, 255, 0.06),   // violet arms
    makeSprite(255, 205, 160, 0.09),   // warm galactic core
    makeSprite(2, 4, 14, 0.35)         // dark dust lane
  ];
  setupMilkyWay();
  resize();
  if (!reduceMotion) requestAnimationFrame(t => { last = t; frame(t); });

  let resizeTimer;
  window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(resize, 150); });
  window.addEventListener('scroll', () => { scrollTarget = window.scrollY; }, { passive: true });
  window.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; }, { passive: true });
  window.addEventListener('mouseout', () => { mouse.x = mouse.y = -9999; });
  window.addEventListener('touchmove', e => {
    const t = e.touches[0]; mouse.x = t.clientX; mouse.y = t.clientY;
  }, { passive: true });
  window.addEventListener('touchend', () => { mouse.x = mouse.y = -9999; });

  new MutationObserver(() => { readTheme(); makeSkyGradient(); if (reduceMotion) draw(0); })
    .observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
}
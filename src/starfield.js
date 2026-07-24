// ============================================================
// SpiderZ — Canvas-Starfield Engine (Holo, krass + scroll-reaktiv)
// ~8000 Sterne in 3 Parallax-Ebenen (weiss/neon/gold), Wrap-around,
// Maus-Drift, Held-Sterne mit Glow. Canvas 2D, 60fps, DPR-aware.
// ============================================================

const PALETTES = {
  white: [
    [234, 246, 255],
    [180, 230, 255],
    [255, 255, 255],
  ],
  neon: [
    [34, 211, 238],  // cyan
    [255, 53, 208],  // magenta
    [182, 255, 59],  // lime
  ],
  gold: [
    [255, 215, 106],
    [255, 190, 80],
  ],
};

// Parallax-Tiefe je Ebene (kleiner = weiter weg = bewegt sich langsamer)
const LAYER = {
  white: { weight: 0.5,  parallax: 0.12 },
  neon:  { weight: 0.35, parallax: 0.30 },
  gold:  { weight: 0.15, parallax: 0.55 },
};

function pick(arr) {
  return arr[(Math.random() * arr.length) | 0];
}

function buildStars(count, w, h) {
  const stars = [];
  const order = [];
  for (const key of Object.keys(LAYER)) {
    const n = Math.round(count * LAYER[key].weight);
    for (let i = 0; i < n; i++) order.push(key);
  }
  while (order.length < count) order.push('white');

  for (let i = 0; i < order.length; i++) {
    const layer = order[i];
    const color = pick(PALETTES[layer]);
    const baseR =
      layer === 'gold' ? 0.9 + Math.random() * 1.6 :
      layer === 'neon' ? 0.7 + Math.random() * 1.2 :
      0.5 + Math.random() * 1.1;
    const bright = Math.random() < 0.012; // ~1% Held-Sterne mit Glow
    stars.push({
      x: Math.random() * w,
      y: Math.random() * h,
      r: bright ? baseR * 1.4 : baseR,
      layer,
      p: LAYER[layer].parallax,
      color,
      bright,
      twPhase: Math.random() * Math.PI * 2,
      twSpeed: 0.8 + Math.random() * 3.0,
      depth: 0.35 + Math.random() * 0.65,
    });
  }
  return stars;
}

const mod = (v, m) => ((v % m) + m) % m;

export function initStarfield(canvas, count = 8000) {
  const ctx = canvas.getContext('2d');
  let w = 0, h = 0, dpr = 1;
  let stars = [];
  let raf = 0;
  let running = true;
  let scrollY = 0;
  let mouseX = 0, mouseY = 0; // normalisiert -0.5..0.5
  const reduceMotion =
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    stars = buildStars(count, w, h);
  }

  function onScroll() {
    scrollY = window.scrollY || window.pageYOffset || 0;
  }
  function onMouse(e) {
    mouseX = e.clientX / w - 0.5;
    mouseY = e.clientY / h - 0.5;
  }

  function drawStatic() {
    ctx.clearRect(0, 0, w, h);
    for (const s of stars) {
      const a = 0.75 * s.depth;
      ctx.fillStyle = `rgba(${s.color[0]},${s.color[1]},${s.color[2]},${a})`;
      ctx.fillRect(s.x, s.y, s.r, s.r);
      if (s.bright) {
        ctx.fillStyle = `rgba(${s.color[0]},${s.color[1]},${s.color[2]},${a * 0.3})`;
        ctx.fillRect(s.x - s.r, s.y - s.r, s.r * 3, s.r * 3);
      }
    }
  }

  let t = 0;
  function frame() {
    if (!running) return;
    t += 0.016;
    const sy = scrollY;
    ctx.clearRect(0, 0, w, h);
    for (const s of stars) {
      // Parallax: Scroll verschiebt Ebenen unterschiedlich + Maus-Drift
      const offY = sy * s.p - mouseY * s.p * 40;
      const offX = -mouseX * s.p * 40;
      const rx = mod(s.x + offX, w);
      const ry = mod(s.y - offY, h);

      const tw = 0.2 + 0.8 * (0.5 + 0.5 * Math.sin(t * s.twSpeed + s.twPhase));
      const a = tw * s.depth;
      ctx.fillStyle = `rgba(${s.color[0]},${s.color[1]},${s.color[2]},${a})`;
      ctx.fillRect(rx, ry, s.r, s.r);
      if (s.bright && tw > 0.55) {
        // Glow-Halo nur in heller Phase (spart Fill-Aufrufe)
        ctx.fillStyle = `rgba(${s.color[0]},${s.color[1]},${s.color[2]},${a * 0.25})`;
        ctx.fillRect(rx - s.r, ry - s.r, s.r * 3, s.r * 3);
      }
    }
    raf = requestAnimationFrame(frame);
  }

  function start() {
    if (reduceMotion) {
      drawStatic();
      running = false;
      return;
    }
    running = true;
    raf = requestAnimationFrame(frame);
  }
  function stop() {
    running = false;
    cancelAnimationFrame(raf);
  }

  resize();
  start();
  window.addEventListener('resize', resize);
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('mousemove', onMouse, { passive: true });

  return {
    stop,
    setCount(n) {
      count = n;
      stars = buildStars(count, w, h);
    },
    destroy() {
      stop();
      window.removeEventListener('resize', resize);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('mousemove', onMouse);
      canvas.width = canvas.height = 0;
    },
  };
}

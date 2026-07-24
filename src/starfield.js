// ============================================================
// SpiderZ — Canvas-Starfield Engine
// Holo-Effekt aus tausenden winzigen Sternen (weiss/cyan/neon/gold).
// Rendert per Canvas 2D, 60fps, respektiert prefers-reduced-motion.
// ============================================================

const PALETTES = {
  white: [
    [234, 246, 255], // eisig weiss/cyan
    [180, 230, 255], // helles cyan
    [255, 255, 255], // rein weiss
  ],
  neon: [
    [34, 211, 238],  // cyan
    [255, 53, 208],  // magenta
    [182, 255, 59],  // lime
  ],
  gold: [
    [255, 215, 106], // gold
    [255, 190, 80],  // warm gold
  ],
};

// Mischungsgewicht der Ebenen (relativer Anteil)
const LAYER_WEIGHTS = { white: 0.5, neon: 0.35, gold: 0.15 };

function pick(arr) {
  return arr[(Math.random() * arr.length) | 0];
}

function buildStars(count) {
  const stars = [];
  const w = window.innerWidth;
  const h = window.innerHeight;
  // verteile nach Gewicht
  const order = [];
  for (const key of Object.keys(LAYER_WEIGHTS)) {
    const n = Math.round(count * LAYER_WEIGHTS[key]);
    for (let i = 0; i < n; i++) order.push(key);
  }
  // falls Rundung < count, auffuellen
  while (order.length < count) order.push('white');

  for (let i = 0; i < order.length; i++) {
    const layer = order[i];
    const color = pick(PALETTES[layer]);
    const baseR =
      layer === 'gold' ? 0.8 + Math.random() * 1.4 :
      layer === 'neon' ? 0.6 + Math.random() * 1.0 :
      0.4 + Math.random() * 0.9;
    stars.push({
      x: Math.random() * w,
      y: Math.random() * h,
      r: baseR,
      layer,
      color,
      // Twinkle-Parameter
      twPhase: Math.random() * Math.PI * 2,
      twSpeed: 0.6 + Math.random() * 2.2,
      depth: 0.3 + Math.random() * 0.7, // fuer dezenten Holo-Shimmer (Helligkeit)
    });
  }
  return stars;
}

export function initStarfield(canvas, count = 2500) {
  const ctx = canvas.getContext('2d');
  let w = 0, h = 0, dpr = 1;
  let stars = [];
  let raf = 0;
  let running = true;
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
    stars = buildStars(count);
  }

  function drawStatic() {
    ctx.clearRect(0, 0, w, h);
    for (const s of stars) {
      const a = 0.7 * s.depth;
      ctx.fillStyle = `rgba(${s.color[0]},${s.color[1]},${s.color[2]},${a})`;
      ctx.fillRect(s.x, s.y, s.r, s.r);
    }
  }

  let t = 0;
  function frame() {
    if (!running) return;
    t += 0.016;
    ctx.clearRect(0, 0, w, h);
    for (const s of stars) {
      // Holo-Twinkle: sinusfoermige Helligkeit, leicht phasenverschoben
      const tw = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * s.twSpeed + s.twPhase));
      const a = tw * s.depth;
      // helle Sterne bekommen leichten Glanz (groesseres, weicheres Rechteck)
      ctx.fillStyle = `rgba(${s.color[0]},${s.color[1]},${s.color[2]},${a})`;
      ctx.fillRect(s.x, s.y, s.r, s.r);
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

  return {
    stop,
    // erlaubt spaeter: mehr/weniger Sterne zur Laufzeit
    setCount(n) {
      count = n;
      stars = buildStars(count);
    },
    destroy() {
      stop();
      window.removeEventListener('resize', resize);
      canvas.width = canvas.height = 0;
    },
  };
}

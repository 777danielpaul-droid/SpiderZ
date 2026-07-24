import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/**
 * Scroll-Scrubbing-Sektion (Canvas-Bildsequenz):
 * - Laeuft im Hero (oben), sobald Frames geladen sind.
 * - Herunterscrollen = Sequenz vorwaerts, Hochscrollen = rueckwaerts,
 *   gekoppelt an die Scroll-Position (ScrollTrigger + scrub).
 * - Mobil-optimiert: Frames nur bei Aenderung auf Canvas gezeichnet,
 *   rAF-gedrosselt, JPEG-Sequence statt Video (kein Decoding-Jank).
 * - Framequelle: Spider-Animation (frame_000..frame_192 aus
 *   NasaMon/spider_full_body_16x9.mp4 extrahiert).
 */
const FRAME_COUNT = 193;            // Spider-Video: 193 Frames (24fps, 8.1s)
const FRAME_BASE = "/scrub/frame_";
const PAD = 3;
// Reine Vorwaerts-Scrub: Scroll 0..1 -> Frame 0..FRAME_COUNT-1 (kein Reverse).
const FIRST_FRAME = 0;
const LAST_FRAME = FRAME_COUNT - 1;

export default function ScrubSection({ children, hintHidden }) {
  const [loaded, setLoaded] = useState(0);
  const [ready, setReady] = useState(false);

  const sectionRef = useRef(null);
  const pinRef = useRef(null);
  const canvasRef = useRef(null);
  const framesRef = useRef([]);
  const targetRef = useRef(0);   // Ziel-Frame (0..FRAME_COUNT-1)
  const drawnRef = useRef(-1);   // zuletzt gezeichneter Frame
  const rafRef = useRef(0);

  // Frames vorab laden (nur einmal).
  useEffect(() => {
    let cancelled = false;
    const imgs = [];
    let done = 0;
    for (let i = 0; i < FRAME_COUNT; i++) {
      const img = new Image();
      img.decoding = "async";
      img.src = `${FRAME_BASE}${String(i).padStart(PAD, "0")}.jpg`;
      img.onload = () => {
        if (cancelled) return;
        done++;
        setLoaded(done);
        if (done === FRAME_COUNT) setReady(true);
      };
      img.onerror = () => {
        if (cancelled) return;
        done++;
        setLoaded(done);
        if (done === FRAME_COUNT) setReady(true);
      };
      imgs.push(img);
    }
    framesRef.current = imgs;
    return () => { cancelled = true; };
  }, []);

  // Frame zeichnen (nur bei Aenderung + gueltigem Bild).
  const draw = (idx) => {
    const canvas = canvasRef.current;
    const img = framesRef.current[idx];
    // Guard: komplett UND nicht "broken" (fehlgeschlagen -> naturalWidth 0).
    if (!canvas || !img || !img.complete || img.naturalWidth === 0) return;
    if (drawnRef.current === idx) return;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    drawnRef.current = idx;
  };

  // rAF-Schleife: zieht targetRef -> drawnRef butterweich.
  useEffect(() => {
    const loop = () => {
      try {
        const t = Math.round(targetRef.current);
        if (t !== drawnRef.current) draw(t);
      } catch (e) {
        console.log("RAF_ERR: " + (e && e.stack ? e.stack : String(e)));
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  // ScrollTrigger (sobald Frames ready).
  useLayoutEffect(() => {
    if (!ready) return;
    try {
      // Frame 0 zeigen, sobald aktiv.
      targetRef.current = 0;
      draw(0);

      const ctx = gsap.context(() => {
        ScrollTrigger.create({
          trigger: sectionRef.current,
          start: "top top",
          end: () => "+=" + window.innerHeight * 4, // Scrub-Strecke (langer, satter Scroll)
          pin: pinRef.current,
          scrub: true, // butterweich, folgt Scroll exakt
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            // Reine Vorwaerts-Scrub: progress 0..1 -> Frame FIRST..LAST
            const frame = Math.round(self.progress * (LAST_FRAME - FIRST_FRAME) + FIRST_FRAME);
            targetRef.current = frame;
          },
        });
      }, sectionRef);

      // Sektion wurde neu ans Ende gehaengt -> Distanzen neu vermessen,
      // sonst ist die scrub-Strecke falsch und onUpdate feuert nie.
      const id = requestAnimationFrame(() => ScrollTrigger.refresh());

      return () => {
        cancelAnimationFrame(id);
        ctx.revert();
      };
    } catch (e) {
      console.log("ST_ERR: " + (e && e.stack ? e.stack : String(e)));
    }
  }, [ready]);

  const pct = Math.round((loaded / FRAME_COUNT) * 100);

  return (
    <section ref={sectionRef} className="scrub-section" data-unlocked={true}>
      <div ref={pinRef} className="scrub-pin">
        <canvas
          ref={canvasRef}
          width={688}
          height={384}
          className="scrub-canvas"
        />
        <div className="scrub-overlay">
          <span className="holo-glass" aria-hidden="true"></span>
          {!ready ? (
            <div className="scrub-loading">
              <div className="scrub-load-bar">
                <div className="scrub-load-fill" style={{ width: `${pct}%` }} />
              </div>
              <p>Lade Sequenz … {pct}%</p>
            </div>
          ) : (
            <div className="scrub-hint">
              <span className="holo-glass" aria-hidden="true"></span>
              <span className={`scrub-hint-text${hintHidden ? " hidden" : ""}`}>
                <span className="scrub-hint-arrow" aria-hidden="true">↓</span>
                Scrollen spult vor
                <span className="scrub-hint-sep" aria-hidden="true">·</span>
                <span className="scrub-hint-arrow" aria-hidden="true">↑</span>
                zurück
              </span>
            </div>
          )}
          {children && <div className="scrub-overlay-children">{children}</div>}
        </div>
      </div>
    </section>
  );
}

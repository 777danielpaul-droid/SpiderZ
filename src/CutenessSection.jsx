import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/**
 * Cuteness-Overload-Sondersequenz (Sonnder-Event):
 * - Frame-per-frame Scroll-Scrubbing wie der Hero, aber als OUTRO nach dem
 *   Team-Reveal. Laeuft nur, wenn teamStrength < 1100 (Cuteness Overload).
 * - Sanftes Fade-in ueber das ganze Pin, bevor das Scrub beginnt.
 * - Vor + zurueck (hoch = rueckwaerts), gekoppelt an Scroll-Position.
 */
const FRAME_COUNT = 141;
const FRAME_BASE = "/cuteness/frame_";
const PAD = 3;

export default function CutenessSection() {
  const [loaded, setLoaded] = useState(0);
  const [ready, setReady] = useState(false);

  const sectionRef = useRef(null);
  const pinRef = useRef(null);
  const canvasRef = useRef(null);
  const framesRef = useRef([]);
  const targetRef = useRef(0);
  const drawnRef = useRef(-1);
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

  const draw = (idx) => {
    const canvas = canvasRef.current;
    const img = framesRef.current[idx];
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

  // ScrollTrigger (sobald Frames ready): Pin + scrub, vor + zurueck.
  useEffect(() => {
    if (!ready) return;
    try {
      targetRef.current = 0;
      draw(0);

      const ctx = gsap.context(() => {
        ScrollTrigger.create({
          trigger: sectionRef.current,
          start: "top top",
          end: () => "+=" + window.innerHeight * 3,
          pin: pinRef.current,
          scrub: true,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            // lineare Abbildung progress(0..1) -> Frame(0..FRAME_COUNT-1)
            targetRef.current = Math.round(self.progress * (FRAME_COUNT - 1));
          },
        });

        // Sanftes Fade-in des Pins, bevor das Scrub startet.
        gsap.fromTo(
          pinRef.current,
          { opacity: 0 },
          {
            opacity: 1,
            ease: "power2.out",
            scrollTrigger: {
              trigger: sectionRef.current,
              start: "top bottom",
              end: "top top",
              scrub: true,
            },
          }
        );
      }, sectionRef);

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
    <section ref={sectionRef} className="cuteness-section" data-unlocked={true}>
      <div ref={pinRef} className="cuteness-pin">
        <canvas ref={canvasRef} width={688} height={384} className="cuteness-canvas" />
        <div className="cuteness-overlay">
          {!ready ? (
            <div className="cuteness-loading">
              <div className="cuteness-load-bar">
                <div className="cuteness-load-fill" style={{ width: `${pct}%` }} />
              </div>
              <p>Lade Cuteness … {pct}%</p>
            </div>
          ) : (
            <div className="cuteness-badge">
              <span className="cuteness-badge-text">✨ CUTENESS OVERLOAD ✨</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

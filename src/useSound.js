import { useCallback, useRef, useEffect } from "react";

export const SFX = {
  ui: {
    click: `${import.meta.env.BASE_URL}sfx/ui/click.wav`,
    collect: `${import.meta.env.BASE_URL}sfx/ui/collect.wav`,
    tap: `${import.meta.env.BASE_URL}sfx/ui/tap.wav`,
  },
  arena: {
    start: `${import.meta.env.BASE_URL}sfx/arena/start.wav`,
    win: `${import.meta.env.BASE_URL}sfx/arena/win.wav`,
    lose: `${import.meta.env.BASE_URL}sfx/arena/lose.wav`,
    draw: `${import.meta.env.BASE_URL}sfx/arena/draw.wav`,
  },
};

export function useSound(volume = 0.18) {
  const ctxRef = useRef(null);
  const gestureUnlocked = useRef(false);

  // Global one-time gesture listener to unlock AudioContext
  useEffect(() => {
    if (gestureUnlocked.current) return;
    if (typeof window === "undefined") return;

    const unlock = () => {
      gestureUnlocked.current = true;
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = ctxRef.current || new AudioContext();
        ctxRef.current = ctx;
        if (ctx.state === "suspended") ctx.resume();
      } catch {
        // ignore
      }
    };

    window.addEventListener("click", unlock, { once: true });
    window.addEventListener("touchstart", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });

    return () => {
      window.removeEventListener("click", unlock);
      window.removeEventListener("touchstart", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  const play = useCallback(
    (path) => {
      try {
        if (typeof window === "undefined") return;
        
        // Ensure AudioContext exists and is unlocked
        let ctx = ctxRef.current;
        if (!ctx) {
          const AudioContext = window.AudioContext || window.webkitAudioContext;
          if (!AudioContext) return;
          ctx = new AudioContext();
          ctxRef.current = ctx;
        }
        if (ctx.state === "suspended") {
          // Only try to resume if user has interacted
          if (!gestureUnlocked.current) return;
          ctx.resume();
        }

        const audio = new Audio(path);
        audio.volume = volume;
        audio.play().catch(() => {});
      } catch {
        // ignore missing files / playback errors
      }
    },
    [volume]
  );

  return { play };
}

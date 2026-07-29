import { useCallback, useRef } from "react";

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

  const getCtx = useCallback(() => {
    if (typeof window === "undefined") return null;
    if (!ctxRef.current) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return null;
      ctxRef.current = new AudioContext();
    }
    const c = ctxRef.current;
    if (c.state === "suspended") c.resume();
    return c;
  }, []);

  const resumeFromGesture = useCallback(() => {
    try {
      const ctx = getCtx();
      if (!ctx) return;
      if (ctx.state === "suspended") ctx.resume();
    } catch {
      // ignore
    }
  }, [getCtx]);

  const play = useCallback(
    (path) => {
      try {
        const ctx = getCtx();
        if (!ctx) return;
        const audio = new Audio(path);
        audio.volume = volume;
        audio.play().catch(() => {});
      } catch {
        // ignore missing files / playback errors
      }
    },
    [getCtx, volume]
  );

  return { play, resumeFromGesture };
}

import { useCallback, useRef } from "react";

export const SFX = {
  ui: {
    click: "/sfx/ui/click.wav",
    collect: "/sfx/ui/collect.wav",
    tap: "/sfx/ui/tap.wav",
  },
  arena: {
    start: "/sfx/arena/start.wav",
    win: "/sfx/arena/win.wav",
    lose: "/sfx/arena/lose.wav",
    draw: "/sfx/arena/draw.wav",
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

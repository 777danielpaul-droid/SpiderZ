import { useCallback, useRef } from "react";

export const SFX = {
  ui: {
    click: "/sfx/ui/click.mp3",
    collect: "/sfx/ui/collect.mp3",
    tap: "/sfx/ui/tap.mp3",
  },
  arena: {
    start: "/sfx/arena/start.mp3",
    win: "/sfx/arena/win.mp3",
    lose: "/sfx/arena/lose.mp3",
    draw: "/sfx/arena/draw.mp3",
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

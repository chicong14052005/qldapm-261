"use client";
import { useEffect } from "react";

export function usePolling(
  enabled: boolean,
  intervalMs: number,
  callback: () => Promise<void>,
  onError?: (error: unknown) => void,
) {
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    let running = false;

    const tick = async () => {
      if (running || document.hidden) return;
      running = true;
      try {
        await callback();
      } catch (e) {
        if (active && onError) {
          onError(e);
        }
      } finally {
        running = false;
      }
    };

    tick();
    const timer = setInterval(tick, intervalMs);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [enabled, intervalMs, callback, onError]);
}


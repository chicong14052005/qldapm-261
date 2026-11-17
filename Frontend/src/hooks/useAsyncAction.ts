"use client";
import { useCallback, useState } from "react";

export function useAsyncAction(onAfterSuccess?: () => Promise<void>) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const run = useCallback(
    async (fn: () => Promise<void>) => {
      setBusy(true);
      setError("");
      try {
        await fn();
        if (onAfterSuccess) {
          await onAfterSuccess();
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Đã xảy ra lỗi.");
      } finally {
        setBusy(false);
      }
    },
    [onAfterSuccess],
  );

  return { busy, setBusy, error, setError, run };
}


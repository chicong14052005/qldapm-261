"use client";
import { useCallback, useState } from "react";
import { copyTableUrl } from "@/lib/copy-table-url";

export function useCopyToClipboard() {
  const [copyMessage, setCopyMessage] = useState("");

  const copy = useCallback(async (url: string, selectFallback: () => void) => {
    const result = await copyTableUrl(url, navigator.clipboard, selectFallback);
    setCopyMessage(
      result === "copied"
        ? "Đã sao chép đúng URL của bàn."
        : "Đã chọn toàn bộ URL. Nhấn Ctrl+C hoặc chọn Sao chép.",
    );
    return result;
  }, []);

  const resetCopyMessage = useCallback(() => setCopyMessage(""), []);

  return { copyMessage, copy, resetCopyMessage };
}


"use client";

import { useCallback, useState } from "react";

export function useSseStream() {
  const [streaming, setStreaming] = useState(false);

  const consume = useCallback(async (response: Response, onChunk: (chunk: string) => void) => {
    if (!response.body) throw new Error("Phản hồi không có luồng dữ liệu");
    setStreaming(true);
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        onChunk(decoder.decode(value, { stream: true }));
      }
    } finally {
      setStreaming(false);
      reader.releaseLock();
    }
  }, []);

  return { streaming, consume };
}

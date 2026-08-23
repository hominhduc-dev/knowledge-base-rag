export type SseEvent = { event: string; data: string };

export function parseSseChunk(chunk: string): SseEvent[] {
  return chunk.split("\n\n").flatMap((block) => {
    if (!block.trim()) return [];
    let event = "message";
    const data: string[] = [];
    for (const line of block.split("\n")) {
      if (line.startsWith("event:")) event = line.slice(6).trim();
      if (line.startsWith("data:")) data.push(line.slice(5).trimStart());
    }
    return [{ event, data: data.join("\n") }];
  });
}

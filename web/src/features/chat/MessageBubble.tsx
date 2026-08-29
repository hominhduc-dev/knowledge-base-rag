"use client";

import type { Source } from "@/lib/mock-data";
import { CitationChip } from "./CitationChip";

export type ChatMessage =
  | { id: string; role: "user"; text: string }
  | { id: string; role: "answer"; text: string; sources: Source[] }
  | { id: string; role: "notfound"; text: string }
  | { id: string; role: "error"; text: string };

type MessageBubbleProps = {
  message: ChatMessage;
  activeCitation: number | null;
  onCitation: (number: number) => void;
  onRetry: () => void;
};

function AnswerText({ text, sources, activeCitation, onCitation }: { text: string; sources: Source[]; activeCitation: number | null; onCitation: (number: number) => void }) {
  return text.split(/(\[\d+\])/g).map((part, index) => {
    const match = /^\[(\d+)\]$/.exec(part);
    if (!match) return <span key={`${part}-${index}`}>{part}</span>;
    const number = Number(match[1]);
    const source = sources.find((item) => item.n === number);
    return <CitationChip key={`${part}-${index}`} number={number} title={source?.doc ?? "Nguồn trích dẫn"} active={activeCitation === number} onSelect={onCitation} />;
  });
}

export function MessageBubble({ message, activeCitation, onCitation, onRetry }: MessageBubbleProps) {
  if (message.role === "user") {
    return (
      <div className="animate-message mb-9 flex justify-end">
        <div className="max-w-[80%] rounded-[12px] bg-sunken px-4 py-3 text-[15px] leading-[26px]">{message.text}</div>
      </div>
    );
  }

  if (message.role === "notfound") {
    return (
      <article className="animate-message mb-9">
        <div className="mb-2.5 font-mono text-[11px] uppercase tracking-[0.12em] text-muted">Trả lời</div>
        <div className="border-l-2 border-border-strong bg-sunken px-6 py-5">
          <p className="m-0 text-[17px] leading-8">{message.text}</p>
          <p className="mt-4 text-[17px] leading-8 text-secondary">Câu hỏi này có thể thuộc quy định chưa được số hóa. Anh/chị vui lòng liên hệ Giáo vụ khoa để được xác nhận chính thức.</p>
        </div>
        <button type="button" className="mt-4 min-h-11 rounded-[8px] border border-border-strong px-4 text-sm font-medium hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">Đề xuất bổ sung tài liệu</button>
      </article>
    );
  }

  if (message.role === "error") {
    return (
      <div className="animate-message mb-9 flex items-center gap-3.5 text-[15px] leading-[26px] text-secondary">
        <span>{message.text}</span>
        <button type="button" onClick={onRetry} className="min-h-11 rounded-[8px] border border-border-strong px-3 text-sm text-primary">Thử lại</button>
      </div>
    );
  }

  return (
    <article className="animate-message mb-9">
      <div className="mb-2.5 font-mono text-[11px] uppercase tracking-[0.12em] text-muted">Trả lời · {message.sources.length} nguồn</div>
      <div className="reading-width text-[17px] leading-8">
        <AnswerText text={message.text} sources={message.sources} activeCitation={activeCitation} onCitation={onCitation} />
      </div>
      <div className="mt-5 border-t border-border pt-3.5 xl:hidden">
        <div className="mb-2.5 font-mono text-[11px] uppercase tracking-[0.12em] text-muted">Nguồn</div>
        {message.sources.map((source) => (
          <button key={source.n} type="button" className="flex w-full min-h-11 gap-2.5 py-2 text-left" onClick={() => onCitation(source.n)}>
            <span className="font-mono text-[13px] leading-[22px] text-accent">[{source.n}]</span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold leading-[22px]">{source.doc}</span>
              <span className="block font-mono text-[13px] leading-5 text-secondary">{source.locator}</span>
            </span>
          </button>
        ))}
      </div>
    </article>
  );
}

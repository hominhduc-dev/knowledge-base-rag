"use client";

import { sampleQuestions } from "@/lib/mock-data";
import { MessageBubble, type ChatMessage } from "./MessageBubble";

type MessageListProps = {
  messages: ChatMessage[];
  loading: boolean;
  activeCitation: number | null;
  onCitation: (number: number) => void;
  onSample: (question: string) => void;
  onRetry: () => void;
};

export function MessageList({ messages, loading, activeCitation, onCitation, onSample, onRetry }: MessageListProps) {
  if (messages.length === 0) {
    return (
      <div className="pt-12">
        <h1 className="max-w-[15em] font-serif text-[30px] font-semibold leading-10">Hỏi bất cứ điều gì về quy chế học vụ</h1>
        <p className="mt-3.5 max-w-[34em] text-[15px] leading-[26px] text-secondary">Câu trả lời dựa trên tài liệu nội bộ của trường và luôn kèm trích dẫn đến đúng điều khoản trong văn bản gốc.</p>
        <div className="mt-8 flex flex-col items-start gap-2">
          {sampleQuestions.map((question) => (
            <button key={question} type="button" onClick={() => onSample(question)} className="min-h-11 rounded-[8px] border border-border-strong px-4 py-2.5 text-left text-[15px] leading-6 hover:border-muted hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
              {question}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      {messages.map((message) => <MessageBubble key={message.id} message={message} activeCitation={activeCitation} onCitation={onCitation} onRetry={onRetry} />)}
      {loading && <div role="status" className="pb-6 text-[13px] font-medium leading-5 text-muted">Đang tìm trong tài liệu…</div>}
    </>
  );
}

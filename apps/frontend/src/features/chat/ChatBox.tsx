"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Menu, Send } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Textarea } from "@/components/ui/textarea";
import { useCurrentUser } from "@/features/auth/useAuth";
import { mockAnswer } from "@/lib/mock-data";
import { CitationDrawer } from "./CitationDrawer";
import { MessageList } from "./MessageList";
import type { ChatMessage } from "./MessageBubble";

export function ChatBox() {
  const currentUser = useCurrentUser();
  // Mặc định theo đơn vị của người đăng nhập, không cứng hóa một khoa.
  const [scope, setScope] = useState(currentUser.scope);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [activeCitation, setActiveCitation] = useState<number | null>(null);
  const [lastQuestion, setLastQuestion] = useState("");
  const threadRef = useRef<HTMLDivElement>(null);
  const scopeLocked = currentUser.role === "Giảng viên";
  const effectiveScope = scopeLocked ? currentUser.scope : scope;

  const sources = useMemo(() => {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const message = messages[index];
      if (message.role === "answer") return message.sources;
    }
    return [];
  }, [messages]);

  useEffect(() => {
    const thread = threadRef.current;
    if (thread) thread.scrollTo({ top: thread.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function send(question = input) {
    const text = question.trim();
    if (!text || loading) return;
    setLastQuestion(text);
    setMessages((current) => [...current, { id: crypto.randomUUID(), role: "user", text }]);
    setInput("");
    setLoading(true);
    setActiveCitation(null);

    await new Promise((resolve) => window.setTimeout(resolve, 700));
    const result = mockAnswer(text);
    if (result) {
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: "answer", text: result.answer, sources: result.sources }]);
      setPanelOpen(true);
    } else {
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: "notfound", text: `Không tìm thấy thông tin này trong tài liệu hiện có của ${effectiveScope} và tài liệu toàn trường.` }]);
    }
    setLoading(false);
  }

  function selectCitation(number: number) {
    setActiveCitation(number);
    setPanelOpen(true);
    window.setTimeout(() => setActiveCitation((current) => current === number ? null : current), 1500);
  }

  function newChat() {
    setMessages([]);
    setPanelOpen(false);
    setActiveCitation(null);
    setSidebarOpen(false);
  }

  return (
    <main className="flex h-dvh overflow-hidden bg-base">
      <Sidebar open={sidebarOpen} scope={effectiveScope} scopeLocked={scopeLocked} onScope={setScope} onNewChat={newChat} onClose={() => setSidebarOpen(false)} />

      <section className="relative flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-2.5 border-b border-border bg-surface px-4 py-2.5 md:hidden">
          <button type="button" onClick={() => setSidebarOpen(true)} className="flex size-11 items-center justify-center rounded-[8px] border border-border" aria-label="Mở menu"><Menu className="size-5" /></button>
          <span className="rounded-[4px] bg-indigo-soft px-2 py-1 text-[13px] font-medium leading-5 text-indigo">{effectiveScope}</span>
        </div>

        <div ref={threadRef} className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[720px] px-6 pb-8 pt-10">
            <MessageList messages={messages} loading={loading} activeCitation={activeCitation} onCitation={selectCitation} onSample={send} onRetry={() => send(lastQuestion)} />
          </div>
        </div>

        <div className="border-t border-border bg-base">
          <div className="mx-auto max-w-[720px] px-4 pb-[22px] pt-4 sm:px-6">
            <div className="relative rounded-[12px] border border-border bg-surface py-3.5 pl-4 pr-14 focus-within:border-border-strong focus-within:ring-2 focus-within:ring-accent/10">
              <Textarea
                rows={1}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void send();
                  }
                }}
                placeholder="Hỏi về quy chế, thủ tục, đề cương môn học…"
                className="max-h-[130px]"
                aria-label="Câu hỏi"
              />
              <button type="button" onClick={() => void send()} disabled={loading || !input.trim()} className="absolute bottom-2.5 right-2.5 flex size-[34px] items-center justify-center rounded-[8px] bg-accent text-white hover:bg-accent-hover disabled:opacity-40" aria-label="Gửi câu hỏi"><Send className="size-4" /></button>
            </div>
            <p className="mt-2 text-[13px] leading-5 text-muted">Câu trả lời chỉ dựa trên tài liệu trong phạm vi {effectiveScope} và tài liệu toàn trường.</p>
          </div>
        </div>
      </section>

      <CitationDrawer sources={sources} activeCitation={activeCitation} open={panelOpen} onClose={() => setPanelOpen(false)} />
    </main>
  );
}

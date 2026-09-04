"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Menu, Send } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Textarea } from "@/components/ui/textarea";
import { useCurrentUser } from "@/features/auth/useAuth";
import { ApiError } from "@/lib/api-client";
import { streamChat, type ChatSource } from "@/lib/chat-stream";
import { CitationDrawer } from "./CitationDrawer";
import { MessageList } from "./MessageList";
import type { ChatMessage } from "./MessageBubble";

// Ghi chú: bản trước tự ghép câu trả lời từ các đoạn `/search` trả về
// (`buildSearchAnswer`). Nay `POST /chat` sinh câu trả lời thật kèm marker `[n]`
// nên phần ghép tay đó đã bỏ — giữ lại là hai nguồn sự thật cho cùng một thứ.

export function ChatBox() {
  const currentUser = useCurrentUser();
  // Mặc định theo đơn vị của người đăng nhập, không cứng hóa một khoa.
  // `AuthGuard` bảo đảm đã có người dùng trước khi trang này được kết xuất.
  const [scope, setScope] = useState(currentUser?.scope ?? "");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [activeCitation, setActiveCitation] = useState<number | null>(null);
  const [lastQuestion, setLastQuestion] = useState("");
  // `null` là hội thoại mới; máy chủ trả về id ở sự kiện `done` của lượt đầu.
  const [conversationId, setConversationId] = useState<string | null>(null);
  const threadRef = useRef<HTMLDivElement>(null);
  // Chỉ ADMIN được đổi phạm vi tra cứu; STUDENT bị khóa theo đơn vị của mình.
  //
  // Đây CHỈ là chuyện hiển thị. Phạm vi thật do máy chủ quyết định từ JWT và áp
  // trong mệnh đề WHERE của truy vấn (docs/phan-quyen.md mục 4) — sửa state này
  // trong trình duyệt không mở thêm được tài liệu nào.
  const scopeLocked = currentUser?.roleCode !== "ADMIN";
  const effectiveScope = (scopeLocked ? currentUser?.scope : scope) ?? "";

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

    // Một khung trả lời rỗng, dựng TRƯỚC khi token đầu tiên về. Các mảnh chữ sẽ
    // được nối dần vào đúng khung này.
    const answerId = crypto.randomUUID();
    let daCoToken = false;

    try {
      await streamChat(
        { question: text, conversationId },
        {
          // `sources` luôn tới TRƯỚC token đầu tiên, nên panel nguồn dựng xong
          // trước cả khi người dùng đọc được chữ nào — họ thấy hệ thống dựa vào
          // tài liệu nào trước khi thấy nó nói gì.
          onSources(items) {
            setMessages((current) => [
              ...current,
              { id: answerId, role: "answer", text: "", sources: items as ChatSource[] },
            ]);
            if (items.length > 0) setPanelOpen(true);
          },
          onToken(chunk) {
            daCoToken = true;
            setMessages((current) =>
              current.map((m) => (m.id === answerId ? { ...m, text: m.text + chunk } : m)),
            );
          },
          onDone(info) {
            // Giữ lại để lượt hỏi sau nối vào cùng một hội thoại.
            setConversationId(info.conversationId);

            // Thu panel nguồn về đúng những đoạn được trích.
            //
            // Trong lúc chữ đang chảy, panel cố ý hiện cả `topK` đoạn truy hồi
            // được — người dùng thấy hệ thống đang dựa vào đâu trước khi đọc nó
            // nói gì. Nhưng khi xong mà vẫn để nguyên thì câu trả lời trích [1]
            // [2] còn panel treo mười thẻ, và tải lại hội thoại lại chỉ còn hai
            // vì `message_citations` chỉ lưu bấy nhiêu. Ba con số cho cùng một
            // câu trả lời.
            //
            // Thay phần chữ bằng bản chung cuộc.
            //
            // Các sự kiện `token` là bản THÔ của mô hình. Ràng buộc trích dẫn
            // chỉ chạy được sau khi gom đủ, và nó sửa văn bản theo hai cách: gỡ
            // marker mô hình bịa ra, hoặc thay cả câu trả lời bằng câu từ chối
            // khi không có trích dẫn hợp lệ nào. Không thay ở đây thì màn hình
            // giữ bản thô còn CSDL giữ bản đã sửa — người dùng đọc một câu trả
            // lời tự tin trong khi lịch sử hội thoại ghi "không tìm thấy".
            //
            // Cả hai hiệu chỉnh gộp vào MỘT lần cập nhật: tách ra thành hai sẽ
            // vẽ lại hai lần và người dùng thấy chữ nháy.
            //
            // `null` là máy chủ không gửi trường đó — giữ nguyên còn hơn xóa.
            const { cited, text } = info;
            if (cited === null && text === null) return;
            setMessages((current) =>
              current.map((m) =>
                m.id === answerId && m.role === "answer"
                  ? {
                      ...m,
                      text: text ?? m.text,
                      sources: cited === null ? m.sources : m.sources.filter((s) => cited.includes(s.n)),
                    }
                  : m,
              ),
            );
          },
          onError(message) {
            setMessages((current) => [
              ...current.filter((m) => m.id !== answerId || daCoToken),
              { id: crypto.randomUUID(), role: "error", text: message },
            ]);
          },
        },
      );
    } catch (error) {
      setMessages((current) => [
        ...current.filter((m) => m.id !== answerId),
        {
          id: crypto.randomUUID(),
          role: "error",
          text: error instanceof ApiError ? error.message : "Không gửi được câu hỏi. Vui lòng thử lại.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function selectCitation(number: number) {
    setActiveCitation(number);
    setPanelOpen(true);
    window.setTimeout(() => setActiveCitation((current) => current === number ? null : current), 1500);
  }

  function newChat() {
    setMessages([]);
    setConversationId(null);
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

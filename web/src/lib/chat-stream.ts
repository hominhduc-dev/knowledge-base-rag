// ---------------------------------------------------------------------------
// Đọc luồng SSE của `POST /chat`.
//
// Không dùng `EventSource` của trình duyệt được: nó chỉ gửi GET và không đính
// kèm được header `Authorization`. Vì vậy tự đọc thân phản hồi của `fetch`.
// ---------------------------------------------------------------------------
import { ApiError, TOKEN_KEY } from "./api-client";
import { parseSseChunk } from "./sse";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

export type ChatSource = {
  n: number;
  doc: string;
  locator: string;
  excerpt: string;
  unit: string;
  documentId: string | null;
  chunkId: string | null;
  headingPath: string | null;
  page: number | null;
  score: number;
};

/**
 * Thân sự kiện `done`.
 *
 * `cited` là số hiệu các nguồn thực sự được trích. Sự kiện `sources` đi trước
 * lúc sinh chữ nên nó mang đủ `topK` đoạn truy hồi được; `cited` là thứ duy
 * nhất cho biết câu trả lời rốt cuộc dựa vào cái nào.
 *
 * `text` là câu trả lời chung cuộc, đúng chuỗi máy chủ ghi vào CSDL. Các sự
 * kiện `token` là bản THÔ của mô hình; ràng buộc trích dẫn chỉ chạy sau khi gom
 * đủ, và nó có thể gỡ marker bịa hoặc thay cả câu trả lời bằng câu từ chối.
 *
 * `null` ở cả hai trường nghĩa là máy chủ KHÔNG gửi — khác hẳn `[]` hay `""` là
 * "đã gửi, và rỗng". Gộp hai trường hợp lại sẽ khiến một máy chủ cũ xóa sạch
 * panel nguồn và câu trả lời.
 */
export type DoneInfo = {
  messageId: string;
  conversationId: string;
  latencyMs: number;
  cited: number[] | null;
  text: string | null;
};

export type ChatHandlers = {
  onSources: (items: ChatSource[]) => void;
  onToken: (text: string) => void;
  onDone: (info: DoneInfo) => void;
  onError: (message: string) => void;
};

export async function streamChat(
  body: { question: string; conversationId?: string | null },
  handlers: ChatHandlers,
  signal?: AbortSignal,
): Promise<void> {
  let token: string | null = null;
  try {
    token = window.localStorage.getItem(TOKEN_KEY);
  } catch {
    token = null;
  }

  const response = await fetch(`${apiUrl}/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
    signal: signal ?? null,
  });

  // Lỗi TRƯỚC khi luồng bắt đầu vẫn về dưới dạng JSON có lớp vỏ quen thuộc —
  // 401 hết phiên, 422 câu hỏi quá ngắn. Chỉ khi máy chủ đã bắt đầu phát mới
  // chuyển sang báo lỗi qua sự kiện `error`.
  if (!response.ok || !response.body) {
    let code = "UNKNOWN";
    let message = `Yêu cầu thất bại (HTTP ${response.status}).`;
    try {
      const loi = await response.json();
      code = loi?.error?.code ?? code;
      message = loi?.error?.message ?? message;
    } catch {
      /* phản hồi không phải JSON — giữ thông báo mặc định */
    }
    throw new ApiError(code, message, response.status);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  // Bộ đệm sống qua nhiều lần đọc: một sự kiện SSE có thể bị cắt làm đôi giữa
  // hai gói mạng. Đây đúng là bài toán framing của module netlab, gặp lại ở
  // phía client.
  let dem = "";

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;

      dem += decoder.decode(value, { stream: true });
      const khoi = dem.split("\n\n");
      dem = khoi.pop() ?? ""; // phần đuôi chưa trọn, chờ lần đọc sau

      for (const suKien of parseSseChunk(khoi.join("\n\n"))) {
        let duLieu: unknown;
        try {
          duLieu = JSON.parse(suKien.data);
        } catch {
          continue;
        }

        switch (suKien.event) {
          case "sources":
            handlers.onSources((duLieu as { items: ChatSource[] }).items ?? []);
            break;
          case "token":
            handlers.onToken((duLieu as { text: string }).text ?? "");
            break;
          case "done":
            {
              const thong = duLieu as Partial<DoneInfo>;
              handlers.onDone({
                messageId: thong.messageId ?? "",
                conversationId: thong.conversationId ?? "",
                latencyMs: thong.latencyMs ?? 0,
                cited: Array.isArray(thong.cited) ? thong.cited : null,
                text: typeof thong.text === "string" ? thong.text : null,
              });
            }
            break;
          case "error":
            handlers.onError((duLieu as { message: string }).message);
            break;
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

// ---------------------------------------------------------------------------
// Controller cho /chat và /conversations.
//
// ĐÂY LÀ NƠI DUY NHẤT BIẾT ĐỊNH DẠNG SSE. `chat.service.ts` chỉ sinh ra các đối
// tượng sự kiện; file này tuần tự hóa chúng lên dây. Nhờ ranh giới đó, bộ đánh
// giá ở Sprint 4 gọi thẳng service được mà không phải dựng máy chủ HTTP.
// ---------------------------------------------------------------------------
import type { Request, Response } from "express";
import { ok } from "../../lib/http.js";
import { currentUser } from "../../middleware/auth.middleware.js";
import { logger } from "../../lib/logger.js";
import { askSchema, conversationIdParam } from "./chat.schema.js";
import * as service from "./chat.service.js";

/** Một sự kiện SSE: `event:` có tên, rồi `data:` một dòng JSON, rồi dòng trống. */
function guiSuKien(res: Response, ten: string, duLieu: unknown): void {
  // JSON.stringify không bao giờ sinh ký tự xuống dòng thật bên trong chuỗi
  // (nó thoát thành \n), nên một dòng `data:` là đủ và không thể vỡ khung.
  res.write(`event: ${ten}\ndata: ${JSON.stringify(duLieu)}\n\n`);
}

/** POST /chat — Server-Sent Events */
export async function ask(req: Request, res: Response): Promise<void> {
  const input = askSchema.parse(req.body);
  const user = currentUser(req);

  // Phải đặt header TRƯỚC khi ghi mảnh đầu tiên. Sau đó không còn đổi được mã
  // trạng thái nữa — vì vậy lỗi phát sinh giữa chừng đi qua sự kiện `error`,
  // không qua HTTP status.
  res.status(200);
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  // Tắt đệm ở reverse proxy. Caddy đã có `flush_interval -1`, nhưng nginx và
  // một số proxy khác chỉ nghe header này — thiếu nó thì câu trả lời hiện ra
  // một cục ở cuối thay vì chảy dần.
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  // Người dùng đóng tab hoặc bấm dừng: hủy luôn lệnh gọi mô hình đang chạy,
  // không để nó tiêu tiền cho một câu trả lời không ai đọc.
  const boQua = new AbortController();
  res.on("close", () => boQua.abort());

  try {
    for await (const suKien of service.hoi(input, user, boQua.signal)) {
      if (res.writableEnded) break;

      switch (suKien.type) {
        case "sources":
          guiSuKien(res, "sources", { items: suKien.items });
          break;
        case "token":
          guiSuKien(res, "token", { text: suKien.text });
          break;
        case "done":
          guiSuKien(res, "done", {
            messageId: suKien.messageId,
            conversationId: suKien.conversationId,
            latencyMs: suKien.latencyMs,
            cited: suKien.cited,
          });
          break;
        case "error":
          guiSuKien(res, "error", { code: suKien.code, message: suKien.message });
          break;
      }
    }
  } catch (error) {
    // Lỗi ném ra trước khi service kịp phát sự kiện nào — ví dụ nhúng câu hỏi
    // thất bại. Header đã gửi rồi nên không trả HTTP 5xx được nữa.
    logger.error("Lỗi giữa luồng /chat", error);
    if (!res.writableEnded) {
      guiSuKien(res, "error", {
        code: "UPSTREAM_ERROR",
        message: "Không hoàn tất được câu trả lời. Vui lòng thử lại.",
      });
    }
  } finally {
    if (!res.writableEnded) res.end();
  }
}

/** GET /conversations */
export async function list(req: Request, res: Response): Promise<void> {
  ok(res, await service.danhSachHoiThoai(currentUser(req)));
}

/** GET /conversations/:id */
export async function get(req: Request, res: Response): Promise<void> {
  const { id } = conversationIdParam.parse(req.params);
  ok(res, await service.chiTietHoiThoai(id, currentUser(req)));
}

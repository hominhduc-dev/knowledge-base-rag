// ---------------------------------------------------------------------------
// Gọi mô hình sinh câu trả lời, trả về từng mảnh chữ theo luồng.
//
// Chỉ biết cách nói chuyện với nhà cung cấp; KHÔNG biết gì về SSE, HTTP hay cơ
// sở dữ liệu. Nhờ vậy đổi nhà cung cấp chỉ phải sửa file này.
// ---------------------------------------------------------------------------
import { env } from "../config/env.js";
import { upstreamError } from "../lib/errors.js";
import { logger } from "../lib/logger.js";

const GOC = "https://generativelanguage.googleapis.com/v1beta/models";

const SO_LAN_THU = 3;

const nghi = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Lùi theo cấp số nhân có nhiễu — cùng lý do đã ghi trong `embed.ts`. */
function lui(lan: number): Promise<unknown> {
  const co = 400 * 2 ** (lan - 1);
  return nghi(co + Math.random() * co);
}

export type GenerateOptions = {
  systemPrompt: string;
  userPrompt: string;
  signal?: AbortSignal;
};

/**
 * Tách luồng SSE của nhà cung cấp thành từng mảnh chữ.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * HAI CÁI BẪY, cả hai đều đã gặp thật khi dò API:
 *
 * 1. KHỐI SSE NGĂN BẰNG `\r\n\r\n`, KHÔNG PHẢI `\n\n`. Tách theo `\n\n` thì mọi
 *    khối từ thứ hai trở đi bắt đầu bằng một ký tự `\r` thừa, nên dòng không còn
 *    khớp `startsWith("data: ")` và bị bỏ qua — luồng "chạy" nhưng ra 0 mảnh.
 *
 * 2. MẢNH ĐẦU THƯỜNG CÓ `text` RỖNG. Model này có bước suy nghĩ nội bộ; những
 *    mảnh đó mang `thoughtSignature` và phần `text` trống. Không lọc thì client
 *    nhận một loạt sự kiện rỗng trước khi thấy chữ thật.
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Đây cũng chính là bài toán MESSAGE FRAMING của module `netlab`, gặp lại ở tầng
 * ứng dụng: một lần đọc từ socket không tương ứng một thông điệp, phải tích lũy
 * bộ đệm rồi mới cắt theo dấu phân tách.
 */
async function* tachLuong(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let dem = "";

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      dem += decoder.decode(value, { stream: true });

      // Chuẩn hóa xuống dòng TRƯỚC khi cắt, để không phải đoán nhà cung cấp
      // dùng CRLF hay LF.
      dem = dem.replace(/\r\n/g, "\n");

      const khoi = dem.split("\n\n");
      // Khối cuối có thể chưa trọn — giữ lại chờ lần đọc sau.
      dem = khoi.pop() ?? "";

      for (const k of khoi) {
        const duLieu = k
          .split("\n")
          .filter((dong) => dong.startsWith("data:"))
          .map((dong) => dong.slice(5).trim())
          .join("");
        if (!duLieu || duLieu === "[DONE]") continue;

        let goi: unknown;
        try {
          goi = JSON.parse(duLieu);
        } catch {
          // Một khối JSON hỏng không đáng làm hỏng cả câu trả lời.
          logger.warn("Bỏ qua một khối SSE không phải JSON hợp lệ");
          continue;
        }

        const text = layChu(goi);
        if (text) yield text;
      }
    }
  } finally {
    reader.releaseLock();
  }
}

type GeminiChunk = {
  candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
  promptFeedback?: { blockReason?: string };
};

function layChu(goi: unknown): string {
  const c = goi as GeminiChunk;

  if (c.promptFeedback?.blockReason) {
    throw upstreamError(
      `Mô hình từ chối xử lý câu hỏi (${c.promptFeedback.blockReason}).`,
    );
  }

  return (c.candidates?.[0]?.content?.parts ?? [])
    .map((p) => p.text ?? "")
    .join("");
}

/**
 * Sinh câu trả lời, trả từng mảnh chữ.
 *
 * `temperature` thấp là có chủ đích: đây là tra cứu quy định, không phải viết
 * sáng tạo. Câu trả lời cần lặp lại được — cùng câu hỏi, cùng ngữ cảnh thì nên
 * ra cùng nội dung, nếu không bộ đánh giá ở Sprint 4 sẽ đo phải nhiễu.
 */
export async function* sinhCauTraLoi(options: GenerateOptions): AsyncGenerator<string> {
  if (!env.GEMINI_API_KEY) {
    throw upstreamError("Chưa cấu hình GEMINI_API_KEY — không sinh được câu trả lời.");
  }

  const url = `${GOC}/${env.GEMINI_GENERATION_MODEL}:streamGenerateContent?alt=sse`;
  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: options.systemPrompt }] },
    contents: [{ role: "user", parts: [{ text: options.userPrompt }] }],
    generationConfig: {
      temperature: 0.2,
      topP: 0.9,
      maxOutputTokens: env.GENERATION_MAX_TOKENS,
    },
  });

  // ────────────────────────────────────────────────────────────────────────
  // THỬ LẠI CHỈ Ở BƯỚC MỞ LUỒNG, KHÔNG BAO GIỜ GIỮA CHỪNG.
  //
  // Gặp thật ngay lần chạy đầu: Gemini trả `503 model overloaded`, và lần gọi
  // lại 1,5 giây sau đã 200. Không có bước này thì mỗi lần dịch vụ bận là người
  // dùng nhận thông báo lỗi cho một sự cố tự khỏi sau một giây.
  //
  // Nhưng chỉ thử lại KHI CHƯA PHÁT MẢNH NÀO. Một khi token đầu tiên đã ra tới
  // trình duyệt thì gọi lại là sinh câu trả lời thứ hai nối vào giữa câu thứ
  // nhất — văn bản lai tạp mà không có lỗi nào báo. Lỗi giữa luồng phải để
  // nguyên cho chỗ gọi xử lý.
  // ────────────────────────────────────────────────────────────────────────
  let loiCuoi = "";

  for (let lan = 1; lan <= SO_LAN_THU; lan += 1) {
    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": env.GEMINI_API_KEY },
        signal: options.signal ?? null,
        body,
      });
    } catch (error) {
      if ((error as Error).name === "AbortError") return; // người dùng đóng tab
      loiCuoi = `lỗi mạng: ${(error as Error).message}`;
      await lui(lan);
      continue;
    }

    if (res.ok && res.body) {
      yield* tachLuong(res.body);
      return;
    }

    const chiTiet = (await res.text().catch(() => "")).replace(/\s+/g, " ").slice(0, 200);

    // 429 quá hạn mức và 5xx quá tải là tạm thời. 4xx còn lại (khóa sai, prompt
    // quá dài, nội dung bị chặn) thì thử lại bao nhiêu lần cũng cùng kết quả.
    if (res.status !== 429 && res.status < 500) {
      throw upstreamError(`Dịch vụ mô hình từ chối (HTTP ${res.status}): ${chiTiet}`);
    }

    loiCuoi = `HTTP ${res.status}: ${chiTiet}`;
    logger.warn(`Mở luồng thất bại lần ${lan}/${SO_LAN_THU} — ${loiCuoi}`);
    await lui(lan);
  }

  throw upstreamError(`Dịch vụ mô hình không phản hồi sau ${SO_LAN_THU} lần. ${loiCuoi}`);
}

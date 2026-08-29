// ---------------------------------------------------------------------------
// Sinh vector nhúng — mục 6.2 của docs/THIET-KE-HE-THONG.md.
//
// Hai việc đáng nói, cả hai đều đã ĐO trên API thật chứ không phải suy đoán:
//
// 1. BẢN CẮT NGẮN KHÔNG ĐƯỢC CHUẨN HÓA SẴN. Model trả 3072 chiều với chuẩn L2
//    đúng bằng 1.0000, nhưng khi xin `outputDimensionality: 1536` thì chuẩn tụt
//    xuống ~0.69 (768 chiều còn 0.59). Phải tự chuẩn hóa L2.
//
// 2. CACHE THEO NỘI DUNG, KHÔNG THEO TÀI LIỆU. Quy chế học vụ thường được ban
//    hành lại với vài điều sửa đổi: bản 2026 trùng phần lớn nội dung với 2025.
//    Tra `content_hash` trước khi gọi API tiết kiệm phần lớn lệnh gọi ở các lần
//    cập nhật.
// ---------------------------------------------------------------------------
import { Prisma } from "@prisma/client";
import { env } from "../config/env.js";
import { prisma } from "../config/prisma.js";
import { logger } from "../lib/logger.js";
import { upstreamError } from "../lib/errors.js";

const GOC = "https://generativelanguage.googleapis.com/v1beta/models";

/**
 * Kiểu tác vụ, mã hóa bất đối xứng giữa câu hỏi và tài liệu.
 *
 * Model cho phép nhúng câu hỏi khác cách nhúng đoạn văn, về lý thuyết là đúng
 * hơn. NHƯNG phép thử một mẫu trên dữ liệu của đồ án cho thấy nó làm độ phân
 * biệt hơi KÉM đi (chênh lệch 0,2321 so với 0,2618 khi không dùng). Một mẫu thì
 * chưa kết luận được gì.
 *
 * Vì vậy để bật/tắt được qua biến môi trường và đưa vào làm biến của bộ đánh
 * giá ở Sprint 4 — đo rồi hãy chốt, đừng chốt bằng cảm tính hay bằng tài liệu
 * của nhà cung cấp.
 */
export type TaskType = "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY";

/** Số đoạn gửi trong một request. API nhận tối đa 100; 64 theo tài liệu thiết kế. */
const KICH_THUOC_LO = 64;
const SO_LAN_THU = 3;

// ===========================================================================
// CHUẨN HÓA
// ===========================================================================

/**
 * Chuẩn hóa L2 — đưa vector về độ dài 1.
 *
 * Vì sao bắt buộc dù `<=>` của pgvector là khoảng cách cosine (vốn tự chuẩn hóa
 * bên trong): chuẩn hóa sẵn khiến cosine tương đương tích vô hướng, nên nếu sau
 * này đổi sang toán tử `<#>` cho nhanh hơn thì kết quả không đổi. Để nguyên
 * vector chưa chuẩn hóa là đặt một cái bẫy cho người sửa code sau.
 */
export function chuanHoaL2(v: number[]): number[] {
  let tong = 0;
  for (const x of v) tong += x * x;
  const chuan = Math.sqrt(tong);
  // Vector không (gần như không xảy ra) — trả nguyên, chia cho 0 ra NaN và
  // Postgres sẽ từ chối cả hàng.
  if (chuan === 0 || !Number.isFinite(chuan)) return v;
  return v.map((x) => x / chuan);
}

/** Định dạng vector cho pgvector: `[0.1,0.2,...]`. */
export function toVectorLiteral(v: number[]): string {
  return `[${v.join(",")}]`;
}

// ===========================================================================
// GỌI API
// ===========================================================================

const nghi = (ms: number) => new Promise((r) => setTimeout(r, ms));

type BatchResponse = { embeddings?: { values: number[] }[] };

async function goiLo(texts: string[], taskType: TaskType): Promise<number[][]> {
  if (!env.GEMINI_API_KEY) {
    throw upstreamError("Chưa cấu hình GEMINI_API_KEY — không sinh được vector nhúng.");
  }

  const body = {
    requests: texts.map((text) => ({
      model: `models/${env.GEMINI_EMBEDDING_MODEL}`,
      content: { parts: [{ text }] },
      outputDimensionality: env.EMBEDDING_DIM,
      ...(env.GEMINI_USE_TASK_TYPE ? { taskType } : {}),
    })),
  };

  let loiCuoi = "";

  for (let lan = 1; lan <= SO_LAN_THU; lan += 1) {
    let res: Response;
    try {
      res = await fetch(`${GOC}/${env.GEMINI_EMBEDDING_MODEL}:batchEmbedContents`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": env.GEMINI_API_KEY },
        body: JSON.stringify(body),
      });
    } catch (error) {
      loiCuoi = `lỗi mạng: ${(error as Error).message}`;
      await lui(lan);
      continue;
    }

    if (res.ok) {
      const json = (await res.json()) as BatchResponse;
      const ra = json.embeddings ?? [];
      if (ra.length !== texts.length) {
        throw upstreamError(`Gửi ${texts.length} đoạn nhưng nhận về ${ra.length} vector.`);
      }
      return ra.map((e) => chuanHoaL2(e.values));
    }

    const chiTiet = (await res.text()).slice(0, 300);

    // 429 quá hạn mức, 5xx lỗi phía họ — lùi rồi thử lại.
    // 4xx còn lại (khóa sai, đoạn quá dài) thử lại cũng vô ích.
    if (res.status !== 429 && res.status < 500) {
      throw upstreamError(`Gemini từ chối (HTTP ${res.status}): ${chiTiet}`);
    }

    loiCuoi = `HTTP ${res.status}: ${chiTiet}`;
    logger.warn(`Nhúng thất bại lần ${lan}/${SO_LAN_THU} — ${loiCuoi}`);
    await lui(lan);
  }

  throw upstreamError(`Gọi API nhúng thất bại sau ${SO_LAN_THU} lần. ${loiCuoi}`);
}

/**
 * Lùi theo cấp số nhân, có nhiễu ngẫu nhiên.
 *
 * Nhiễu là phần dễ bỏ sót: không có nó thì khi một lô lớn cùng gặp 429, mọi
 * request sẽ thử lại ĐÚNG CÙNG MỘT THỜI ĐIỂM và lại cùng bị từ chối.
 */
function lui(lan: number): Promise<unknown> {
  const co = 500 * 2 ** (lan - 1);
  return nghi(co + Math.random() * co);
}

/** Nhúng một danh sách văn bản. Tự chia lô. */
export async function nhung(texts: string[], taskType: TaskType): Promise<number[][]> {
  const ra: number[][] = [];
  for (let i = 0; i < texts.length; i += KICH_THUOC_LO) {
    ra.push(...(await goiLo(texts.slice(i, i + KICH_THUOC_LO), taskType)));
  }
  return ra;
}

/** Nhúng MỘT câu hỏi. Dùng ở đường truy hồi. */
export async function nhungCauHoi(question: string): Promise<number[]> {
  const [v] = await nhung([question], "RETRIEVAL_QUERY");
  if (!v) throw upstreamError("Không nhúng được câu hỏi.");
  return v;
}

// ===========================================================================
// SINH VECTOR CHO CÁC ĐOẠN CỦA MỘT TÀI LIỆU
// ===========================================================================

export type EmbedStats = {
  tong: number;
  tuCache: number;
  goiApi: number;
};

/**
 * Sinh vector cho mọi đoạn của một tài liệu còn thiếu.
 *
 * Chạy lại được: đoạn nào đã có vector cho model này thì bỏ qua, nên gọi lại sau
 * một lần thất bại giữa chừng không tốn thêm lệnh gọi nào cho phần đã xong.
 */
export async function nhungTaiLieu(documentId: string): Promise<EmbedStats> {
  const model = env.GEMINI_EMBEDDING_MODEL;

  // Chỉ lấy đoạn CHƯA có vector của model này.
  const thieu = await prisma.chunk.findMany({
    where: { documentId, embeddings: { none: { model } } },
    select: { id: true, content: true, contentHash: true },
    orderBy: { chunkIndex: "asc" },
  });
  if (thieu.length === 0) return { tong: 0, tuCache: 0, goiApi: 0 };

  // --- Tầng cache: đoạn khác có CÙNG nội dung đã được nhúng chưa? -----------
  const hashes = [...new Set(thieu.map((c) => c.contentHash))];
  const daCo = await prisma.$queryRaw<{ content_hash: string; embedding: string }[]>`
    SELECT DISTINCT ON (c."content_hash")
           c."content_hash", e."embedding"::text AS embedding
    FROM "chunks" c
    JOIN "chunk_embeddings" e ON e."chunk_id" = c."id" AND e."model" = ${model}
    WHERE c."content_hash" = ANY(${hashes}::bpchar[])
  `;
  const cache = new Map(daCo.map((r) => [r.content_hash, r.embedding]));

  const canGoi = thieu.filter((c) => !cache.has(c.contentHash));

  // --- Gọi API cho phần còn lại --------------------------------------------
  const vectorMoi = new Map<string, string>();
  if (canGoi.length > 0) {
    const vs = await nhung(
      canGoi.map((c) => c.content),
      "RETRIEVAL_DOCUMENT",
    );
    canGoi.forEach((c, i) => vectorMoi.set(c.id, toVectorLiteral(vs[i]!)));
  }

  // --- Ghi xuống -----------------------------------------------------------
  // Prisma không biết kiểu `vector` nên phải dùng SQL thô. Ép kiểu tường minh
  // `::vector` — thiếu nó thì Postgres coi tham số là text và từ chối.
  for (const c of thieu) {
    const lit = cache.get(c.contentHash) ?? vectorMoi.get(c.id);
    if (!lit) continue;
    await prisma.$executeRaw`
      INSERT INTO "chunk_embeddings" ("chunk_id", "embedding", "model")
      VALUES (${c.id}::uuid, ${lit}::vector, ${model})
      ON CONFLICT ("chunk_id", "model") DO UPDATE SET "embedding" = EXCLUDED."embedding"
    `;
  }

  return { tong: thieu.length, tuCache: thieu.length - canGoi.length, goiApi: canGoi.length };
}

/** Kiểu Prisma dùng ở nơi khác, khai ở đây cho khỏi import lặp. */
export type { Prisma };

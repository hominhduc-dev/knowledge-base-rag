// ---------------------------------------------------------------------------
// Hỏi đáp — docs/api-contract.md mục 5.
//
// Trả về một AsyncGenerator các sự kiện. Service này KHÔNG biết SSE là gì;
// `chat.controller.ts` là nơi duy nhất biết cách tuần tự hóa chúng lên dây.
// Nhờ vậy bộ đánh giá ở Sprint 4 gọi thẳng service được, không phải dựng HTTP.
// ---------------------------------------------------------------------------
import { prisma } from "../../config/prisma.js";
import { env } from "../../config/env.js";
import { logger } from "../../lib/logger.js";
import { notFound } from "../../lib/errors.js";
import { coTrichDan, locMarker } from "../../rag/citation-guard.js";
import { sinhCauTraLoi } from "../../rag/generate.js";
import { CAU_TU_CHOI, dungPromptNguoiDung, dungTieuDe, SYSTEM_PROMPT } from "../../rag/prompt.js";
import { search, type Source } from "../retrieval/retrieval.service.js";
import type { AuthenticatedUser } from "../../types/express.js";
import type { AskInput } from "./chat.schema.js";

export type ChatEvent =
  | { type: "sources"; items: Source[] }
  | { type: "token"; text: string }
  | {
      type: "done";
      messageId: string;
      conversationId: string;
      latencyMs: number;
      /**
       * Số hiệu các nguồn THỰC SỰ được trích, tập con của `sources`.
       *
       * Có mặt vì `sources` phải đi trước lúc sinh chữ, khi chưa ai biết mô hình
       * sẽ dùng đoạn nào — nếu không báo lại, giao diện đứng mãi ở đủ `topK` thẻ
       * trong khi câu trả lời chỉ nhắc hai cái, và tải lại hội thoại thì còn hai
       * vì `message_citations` chỉ lưu bấy nhiêu.
       */
      cited: number[];
    }
  | { type: "error"; code: string; message: string };

/**
 * Một lượt hỏi đáp.
 *
 * Thứ tự sự kiện: `sources` → `token`* → `done`. `sources` đi TRƯỚC token đầu
 * tiên, có chủ đích: giao diện dựng panel nguồn ngay lúc đó, nên người dùng thấy
 * hệ thống dựa vào tài liệu nào TRƯỚC CẢ KHI đọc câu trả lời.
 */
export async function* hoi(
  input: AskInput,
  user: AuthenticatedUser,
  signal?: AbortSignal,
): AsyncGenerator<ChatEvent> {
  const batDau = Date.now();

  // --- 1. Truy hồi trong phạm vi của người hỏi -----------------------------
  const ketQua = await search({ query: input.question, topK: env.RETRIEVAL_TOP_K }, user);
  const sources = ketQua.items;

  yield { type: "sources", items: sources };

  // --- 2. KHÔNG CÓ NGUỒN THÌ KHÔNG GỌI MÔ HÌNH -----------------------------
  //
  // Đây là ràng buộc quan trọng nhất của cả đường này. Gọi mô hình khi không có
  // ngữ cảnh thì nó sẽ trả lời bằng kiến thức chung về giáo dục đại học — nghe
  // rất hợp lý, và sai. Đó đúng là cái sai nguy hiểm nhất mà đề tài đặt ra để
  // giải quyết: sinh viên nhận một con số tự tin nhưng không thuộc quy chế nào.
  if (sources.length === 0) {
    const { conversationId, messageId } = await luuLuot(
      user,
      input,
      CAU_TU_CHOI,
      [],
      Date.now() - batDau,
    );
    yield { type: "token", text: CAU_TU_CHOI };
    yield { type: "done", messageId, conversationId, latencyMs: Date.now() - batDau, cited: [] };
    return;
  }

  // --- 3. Sinh câu trả lời ---------------------------------------------------
  //
  // Gom toàn bộ để kiểm marker: không thể kiểm một marker khi nó mới về nửa
  // chừng (`[1` rồi mới tới `]` ở mảnh sau). Đổi lại, người dùng thấy chữ chảy
  // dần vì ta vẫn phát `token` ngay khi nhận được.
  let dayDu = "";
  try {
    for await (const manh of sinhCauTraLoi({
      systemPrompt: SYSTEM_PROMPT,
      userPrompt: dungPromptNguoiDung(input.question, sources),
      signal,
    })) {
      dayDu += manh;
      yield { type: "token", text: manh };
    }
  } catch (error) {
    logger.error("Sinh câu trả lời thất bại", error);
    yield {
      type: "error",
      code: "UPSTREAM_ERROR",
      message: "Dịch vụ mô hình tạm thời không phản hồi. Vui lòng thử lại.",
    };
    return;
  }

  // --- 4. Ràng buộc trích dẫn ------------------------------------------------
  const kiem = locMarker(dayDu, sources.length);
  if (kiem.daGo.length > 0) {
    // Không im lặng: số lần mô hình bịa marker là một chỉ số chất lượng, và
    // Sprint 4 cần con số đó.
    logger.warn(
      `Mô hình bịa ${kiem.daGo.length} marker không có nguồn: [${kiem.daGo.join("], [")}] — đã gỡ`,
    );
  }

  const cuoiCung = coTrichDan(kiem) ? kiem.text.trim() : CAU_TU_CHOI;

  // Chỉ lưu những nguồn THỰC SỰ được trích. Lưu cả 10 đoạn truy hồi được sẽ làm
  // lịch sử hội thoại đầy trích dẫn mà câu trả lời không hề nhắc tới.
  const daTrich = sources.filter((s) => kiem.daDung.includes(s.n));

  const { conversationId, messageId } = await luuLuot(
    user,
    input,
    cuoiCung,
    daTrich,
    Date.now() - batDau,
  );

  // `daTrich` chứ không phải `kiem.daDung`: hai cái luôn khớp nhau (marker ngoài
  // dải đã bị `locMarker` gỡ trước đó), nhưng lấy từ danh sách đã lọc thì không
  // có đường nào trả về một số hiệu không có thẻ nguồn tương ứng.
  yield {
    type: "done",
    messageId,
    conversationId,
    latencyMs: Date.now() - batDau,
    cited: daTrich.map((s) => s.n),
  };
}

// ===========================================================================
// LƯU LỊCH SỬ
// ===========================================================================

async function luuLuot(
  user: AuthenticatedUser,
  input: AskInput,
  cauTraLoi: string,
  sources: Source[],
  latencyMs: number,
): Promise<{ conversationId: string; messageId: string }> {
  return prisma.$transaction(async (tx) => {
    let conversationId = input.conversationId ?? null;

    if (conversationId) {
      // Hội thoại của người khác thì coi như không tồn tại — không tiết lộ.
      const co = await tx.conversation.findFirst({
        where: { id: conversationId, userId: user.id },
        select: { id: true },
      });
      if (!co) throw notFound("Không tìm thấy hội thoại");
      await tx.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });
    } else {
      const moi = await tx.conversation.create({
        data: { userId: user.id, title: dungTieuDe(input.question) },
        select: { id: true },
      });
      conversationId = moi.id;
    }

    await tx.message.create({
      data: { conversationId, role: "USER", content: input.question },
    });

    const traLoi = await tx.message.create({
      data: { conversationId, role: "ASSISTANT", content: cauTraLoi, latencyMs },
      select: { id: true },
    });

    if (sources.length > 0) {
      await tx.messageCitation.createMany({
        data: sources.map((s) => ({
          messageId: traLoi.id,
          chunkId: s.chunkId,
          documentId: s.documentId,
          rank: s.n,
          score: s.score,
          // BẢN SAO của nội dung, không phải tham chiếu. Tài liệu bị gỡ thì
          // lịch sử hội thoại cũ vẫn hiển thị được trích dẫn — xem docs/erd.md
          // mục 2.4.
          quote: s.excerpt,
          headingPath: s.headingPath,
          page: s.page,
        })),
      });
    }

    return { conversationId, messageId: traLoi.id };
  });
}

// ===========================================================================
// LỊCH SỬ HỘI THOẠI
// ===========================================================================

export async function danhSachHoiThoai(user: AuthenticatedUser) {
  const rows = await prisma.conversation.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    take: 50,
    select: { id: true, title: true, updatedAt: true },
  });
  return {
    items: rows.map((r) => ({
      id: r.id,
      title: r.title,
      updatedAt: r.updatedAt.toISOString(),
    })),
  };
}

export async function chiTietHoiThoai(id: string, user: AuthenticatedUser) {
  // Lọc theo `userId` NGAY TRONG truy vấn. Lấy về rồi mới so ở tầng ứng dụng là
  // đúng kiểu lỗi mà `docs/phan-quyen.md` mục 4 cấm.
  const hoiThoai = await prisma.conversation.findFirst({
    where: { id, userId: user.id },
    select: {
      id: true,
      title: true,
      messages: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          role: true,
          content: true,
          citations: {
            orderBy: { rank: "asc" },
            select: {
              rank: true,
              score: true,
              quote: true,
              headingPath: true,
              page: true,
              documentId: true,
              chunkId: true,
              document: { select: { title: true, department: { select: { name: true } } } },
            },
          },
        },
      },
    },
  });

  // Hội thoại của người khác cũng trả 404, không phải 403 — 403 là xác nhận nó
  // có tồn tại.
  if (!hoiThoai) throw notFound("Không tìm thấy hội thoại");

  return {
    id: hoiThoai.id,
    title: hoiThoai.title,
    messages: hoiThoai.messages.map((m) => ({
      id: m.id,
      role: m.role.toLowerCase() as "user" | "assistant",
      content: m.content,
      sources: m.citations.map((c) => ({
        n: c.rank,
        // Tài liệu đã bị gỡ thì khóa ngoại thành NULL, nhưng bản sao vẫn còn.
        doc: c.document?.title ?? "Tài liệu đã bị gỡ",
        locator: [c.headingPath, c.page !== null ? `Trang ${c.page}` : null]
          .filter(Boolean)
          .join(" · ") || "Không rõ vị trí",
        excerpt: c.quote,
        unit: c.document?.department?.name ?? "Toàn trường",
        documentId: c.documentId,
        chunkId: c.chunkId,
        headingPath: c.headingPath,
        page: c.page,
        score: c.score,
      })),
    })),
  };
}

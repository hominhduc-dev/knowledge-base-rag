// ---------------------------------------------------------------------------
// Trích văn bản từ PDF và DOCX.
//
// Chỉ làm một việc: byte vào, văn bản theo trang ra. Không chạm cơ sở dữ liệu,
// không biết gì về job — nhờ vậy test được mà không cần dựng cả hệ thống.
// ---------------------------------------------------------------------------
import { extractText, getDocumentProxy } from "unpdf";
import type { ParsedPage } from "../../rag/chunk.js";

export type ParseResult = {
  pages: ParsedPage[];
  pageCount: number;
};

export class ParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ParseError";
  }
}

/**
 * PDF → văn bản theo trang.
 *
 * `mergePages: false` để giữ ranh giới trang. Gộp hết thành một chuỗi thì trích
 * dẫn mất số trang, mà "mở đúng trang" là một trong năm năng lực lõi của đồ án.
 */
export async function docPdf(buffer: Buffer): Promise<ParseResult> {
  let pdf;
  try {
    pdf = await getDocumentProxy(new Uint8Array(buffer));
  } catch (error) {
    throw new ParseError(`Không đọc được tệp PDF: ${(error as Error).message}`);
  }

  const { totalPages, text } = await extractText(pdf, { mergePages: false });
  const mang = Array.isArray(text) ? text : [text];

  const pages: ParsedPage[] = mang
    .map((t, i) => ({ page: i + 1, text: (t ?? "").trim() }))
    .filter((p) => p.text.length > 0);

  // Không rút được ký tự nào từ một tệp có trang: gần như chắc chắn là bản scan,
  // tức ảnh chứ không phải văn bản. OCR nằm NGOÀI phạm vi đồ án (mục 3 tổng
  // quan), nên báo lỗi rõ ràng thay vì lặng lẽ tạo một tài liệu rỗng mà truy hồi
  // không bao giờ trả về.
  if (pages.length === 0) {
    throw new ParseError(
      "Tệp PDF không chứa văn bản trích xuất được — có thể là bản scan. " +
        "Hệ thống không hỗ trợ OCR; cần một bản PDF có lớp văn bản.",
    );
  }

  return { pages, pageCount: totalPages };
}

/**
 * DOCX → văn bản.
 *
 * DOCX không có khái niệm trang: phân trang do trình soạn thảo tính lúc dựng
 * hình, không nằm trong tệp. Vì vậy toàn bộ nội dung về "trang 1", và trích dẫn
 * từ tài liệu DOCX chỉ định vị được bằng `headingPath`.
 */
export async function docDocx(buffer: Buffer): Promise<ParseResult> {
  const mammoth = await import("mammoth");
  let raw: string;
  try {
    const ket = await mammoth.extractRawText({ buffer });
    raw = ket.value;
  } catch (error) {
    throw new ParseError(`Không đọc được tệp DOCX: ${(error as Error).message}`);
  }

  const text = raw.trim();
  if (!text) throw new ParseError("Tệp DOCX không có nội dung văn bản.");

  return { pages: [{ page: 1, text }], pageCount: 1 };
}

/** Chọn bộ đọc theo loại tệp. */
export async function docTaiLieu(buffer: Buffer, sourceType: string): Promise<ParseResult> {
  if (sourceType === "PDF") return docPdf(buffer);
  if (sourceType === "DOCX") return docDocx(buffer);
  throw new ParseError(`Không hỗ trợ định dạng ${sourceType}`);
}

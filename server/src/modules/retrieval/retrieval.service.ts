// ---------------------------------------------------------------------------
// Truy hồi — điều phối đường `/search`.
//
// Logic SQL nóng nằm trong `retrieval.sql.ts`: lọc phạm vi trong WHERE, JOIN
// embedding có điều kiện model, rồi mới xếp hạng lai vector + toàn văn.
// ---------------------------------------------------------------------------
import type { AuthenticatedUser } from "../../types/express.js";
import { env } from "../../config/env.js";
import { nhungCauHoi } from "../../rag/embed.js";
import type { SearchInput } from "./retrieval.schema.js";
import { truyHoiLai } from "./retrieval.sql.js";

/** Một trích dẫn — docs/api-contract.md mục 2. */
export type Source = {
  n: number;
  doc: string;
  locator: string;
  excerpt: string;
  unit: string;
  documentId: string;
  chunkId: string;
  /// Vị trí trong cấu trúc văn bản: "Chương II > Điều 12 > Khoản 3".
  /// Khớp cột `chunks.heading_path`. Tên cũ `articleRef` đã bỏ — lược đồ v2 đổi
  /// cột thành `heading_path` và nội dung nay là đường dẫn đầy đủ, không chỉ số điều.
  headingPath: string | null;
  /// Trang để mở PDF đúng chỗ. Lấy từ `chunks.page_from`.
  page: number | null;
  score: number;
};

export type SearchResult = {
  items: Source[];
  tookMs: number;
  vectorHits: number;
  keywordHits: number;
};

/** Nhãn `unit` hiển thị: GLOBAL là "Toàn trường", còn lại là tên đơn vị. */
export const GLOBAL_UNIT_LABEL = "Toàn trường";

/**
 * Ghép `locator` theo đúng quy tắc ở `docs/api-contract.md` mục 3:
 * `headingPath` + " · Trang " + `page`; thiếu `headingPath` thì chỉ "Trang N";
 * thiếu cả hai thì "Không rõ vị trí".
 *
 * Truy hồi thật sau này dùng lại hàm này — đừng ghép tay ở chỗ khác, nếu không
 * hai chỗ sẽ hiển thị khác nhau cho cùng một đoạn văn.
 */
export function buildLocator(headingPath: string | null, page: number | null): string {
  if (headingPath && page !== null) return `${headingPath} · Trang ${page}`;
  if (headingPath) return headingPath;
  if (page !== null) return `Trang ${page}`;
  return "Không rõ vị trí";
}

export async function search(
  input: SearchInput,
  user: AuthenticatedUser,
): Promise<SearchResult> {
  const batDau = Date.now();
  const topK = input.topK ?? env.RETRIEVAL_TOP_K;
  const vector = await nhungCauHoi(input.query);
  const rows = await truyHoiLai(user, input.query, vector, topK);

  const items = rows.map<Source>((row, index) => ({
    n: index + 1,
    doc: row.doc,
    locator: buildLocator(row.heading_path, row.page_from),
    excerpt: row.content,
    unit: row.unit,
    documentId: row.document_id,
    chunkId: row.chunk_id,
    headingPath: row.heading_path,
    page: row.page_from,
    score: row.score,
  }));

  return {
    items,
    tookMs: Date.now() - batDau,
    vectorHits: rows.filter((row) => row.vec_score > 0).length,
    keywordHits: rows.filter((row) => row.keyword_score > 0).length,
  };
}

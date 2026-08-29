// ---------------------------------------------------------------------------
// Truy hồi — BẢN TẠM CỦA TUẦN 1.
//
// Trả ba kết quả cứng để TV3 (chat) và TV4 (giao diện) làm được ngay, không
// phải chờ tìm kiếm lai. Contract mục 6 quy định đúng như vậy.
//
// ĐÂY KHÔNG PHẢI TRUY HỒI THẬT. Hai việc còn thiếu:
//   1. `retrieval.sql.ts` — SQL lai vector + toàn văn ở mục 4.1 tài liệu thiết
//      kế, lấy điều kiện lọc từ `lib/scope.ts`. Chưa viết được vì 13 đoạn văn
//      seed chưa có vector nhúng (chờ GEMINI_API_KEY).
//   2. Ngưỡng RETRIEVAL_MIN_SCORE để quyết định trả "không có trong tài liệu".
//
// Dù là bản tạm, phần phạm vi vẫn được tôn trọng: hàm này KHÔNG bao giờ trả
// kết quả gắn đơn vị khác đơn vị người gọi. Nếu để nó trả một tên khoa cứng
// thì màn hình sẽ hiện tài liệu khoa khác cho mọi tài khoản, và người kiểm thử
// sẽ tưởng cơ chế cách ly đã hỏng.
// ---------------------------------------------------------------------------
import type { AuthenticatedUser } from "../../types/express.js";
import type { SearchInput } from "./retrieval.schema.js";

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

// Id giả, cố định. Chúng KHÔNG tồn tại trong cơ sở dữ liệu, nên
// GET /documents/:id/source-url với các id này sẽ trả 404 — đúng như mong đợi
// cho tới khi truy hồi thật thay chỗ.
const STUB_DOC_GLOBAL_1 = "00000000-0000-4000-8000-000000000001";
const STUB_DOC_GLOBAL_2 = "00000000-0000-4000-8000-000000000002";
const STUB_DOC_DEPARTMENT = "00000000-0000-4000-8000-000000000003";

/**
 * Tên đơn vị để hiển thị. Người dùng có thể thuộc nhiều đơn vị nên lấy cái đầu;
 * ADMIN không thuộc phạm vi nào cụ thể nên hiện "Toàn trường".
 */
function tenDonVi(user: AuthenticatedUser): string {
  if (user.role === "ADMIN") return GLOBAL_UNIT_LABEL;
  return user.departments[0]?.name ?? "Chưa gán đơn vị";
}

export async function search(
  input: SearchInput,
  user: AuthenticatedUser,
): Promise<SearchResult> {
  const batDau = Date.now();

  const items: Source[] = [
    {
      n: 1,
      doc: "Quy chế đào tạo trình độ đại học",
      locator: buildLocator("Điều 12, Khoản 1", 8),
      excerpt:
        "Sinh viên được xét công nhận tốt nghiệp khi tích lũy đủ số tín chỉ của " +
        "chương trình đào tạo và điểm trung bình tích lũy đạt từ 2,00 trở lên.",
      unit: GLOBAL_UNIT_LABEL,
      documentId: STUB_DOC_GLOBAL_1,
      chunkId: "00000000-0000-4000-8000-00000000000a",
      headingPath: "Điều 12, Khoản 1",
      page: 8,
      score: 0.83,
    },
    {
      n: 2,
      doc: "Quy định về cảnh báo học vụ",
      locator: buildLocator("Điều 5, Khoản 2", 3),
      excerpt:
        "Sinh viên bị cảnh báo học vụ nếu điểm trung bình học kỳ đạt dưới 1,00 " +
        "hoặc điểm trung bình tích lũy đạt dưới 1,20 đối với sinh viên năm thứ nhất.",
      unit: GLOBAL_UNIT_LABEL,
      documentId: STUB_DOC_GLOBAL_2,
      chunkId: "00000000-0000-4000-8000-00000000000b",
      headingPath: "Điều 5, Khoản 2",
      page: 3,
      score: 0.71,
    },
    {
      n: 3,
      doc: `Quy định nội bộ — ${tenDonVi(user)}`,
      locator: buildLocator(null, 2),
      excerpt:
        "Kết quả mẫu của đơn vị bạn. Bản tạm tuần 1 chưa đọc cơ sở dữ liệu; " +
        "truy hồi thật sẽ thay chỗ này bằng đoạn văn khớp câu hỏi.",
      // Luôn là đơn vị của chính người gọi — xem ghi chú đầu file.
      unit: tenDonVi(user),
      documentId: STUB_DOC_DEPARTMENT,
      chunkId: "00000000-0000-4000-8000-00000000000c",
      headingPath: null,
      page: 2,
      score: 0.64,
    },
  ];

  const topK = input.topK ?? items.length;
  const cat = items.slice(0, topK);

  return {
    items: cat,
    tookMs: Date.now() - batDau,
    // Bản tạm không có nhánh nào chạy thật; báo 0 thay vì bịa số, để lúc bảo vệ
    // không ai nhầm đây là số đo của tìm kiếm lai.
    vectorHits: 0,
    keywordHits: 0,
  };
}

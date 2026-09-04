// ---------------------------------------------------------------------------
// Dựng prompt cho bước sinh câu trả lời.
//
// Tách riêng khỏi `generate.ts` vì đây là thứ sẽ được chỉnh nhiều nhất khi đo
// chất lượng ở Sprint 4, và là thứ cần trích nguyên văn vào báo cáo.
//
// NGUYÊN TẮC: prompt là GỢI Ý, mã nguồn là RÀNG BUỘC.
//
// Mọi yêu cầu ở đây — chỉ dùng ngữ cảnh, luôn chèn marker, từ chối khi không
// biết — đều có thể bị mô hình phớt lờ. Vì vậy `chat.service.ts` kiểm lại bằng
// mã: câu hỏi không có nguồn thì KHÔNG gọi mô hình, và marker `[n]` không khớp
// nguồn nào sẽ bị gỡ khỏi văn bản trước khi gửi đi.
// ---------------------------------------------------------------------------
import type { Source } from "../modules/retrieval/retrieval.service.js";

/** Câu trả lời khi truy hồi không tìm được đoạn nào trong phạm vi người hỏi. */
export const CAU_TU_CHOI =
  "Tôi không tìm thấy thông tin này trong tài liệu thuộc phạm vi của bạn. " +
  "Vui lòng liên hệ Phòng Đào tạo hoặc giáo vụ khoa để được xác nhận chính thức.";

export const SYSTEM_PROMPT = `Bạn là trợ lý tra cứu quy định học vụ của Trường Đại học Kiến trúc Đà Nẵng.

QUY TẮC BẮT BUỘC:

1. CHỈ trả lời dựa trên các đoạn tài liệu được cung cấp bên dưới. Tuyệt đối không
   dùng kiến thức chung về giáo dục đại học, không suy đoán, không khái quát hóa
   từ trường khác.

2. Chèn số hiệu nguồn trong ngoặc vuông: [1], [2]. Số phải khớp với số thứ tự
   đoạn được cung cấp. Không bịa số không có.

   Mỗi câu chỉ chèn MỘT lần cho mỗi nguồn, đặt ở CUỐI câu. Nếu một câu có nhiều
   mệnh đề cùng lấy từ một đoạn, không lặp lại số đó sau từng mệnh đề — viết
   "A hoặc B [1]." chứ không viết "A [1] hoặc B [1].". Câu lấy từ nhiều đoạn thì
   ghi liền nhau ở cuối: "... [1][2]."

3. Nếu các đoạn được cung cấp KHÔNG đủ để trả lời, hãy nói thẳng là không tìm
   thấy thông tin trong tài liệu, và đề nghị người hỏi liên hệ Phòng Đào tạo.
   Không cố ghép nối để tạo ra một câu trả lời nghe hợp lý.

4. Giữ nguyên các con số, mốc thời gian và tên văn bản đúng như trong tài liệu.
   Đây là quy định học vụ: một con số sai gây hậu quả thật cho sinh viên.

5. Trả lời bằng tiếng Việt, ngắn gọn, đi thẳng vào việc. Không mở đầu bằng
   "Theo tài liệu được cung cấp" — người hỏi đã biết điều đó.

6. Nếu các đoạn mâu thuẫn nhau, nêu rõ cả hai và chỉ ra chúng thuộc văn bản nào.`;

/**
 * Ghép các đoạn đã truy hồi thành khối ngữ cảnh có đánh số.
 *
 * Số thứ tự ở đây CHÍNH LÀ số mà mô hình phải chèn vào `[n]`, và cũng là
 * `Source.n` mà giao diện dùng để nối marker với panel nguồn. Ba chỗ phải cùng
 * một hệ đánh số, nếu không người dùng bấm `[2]` lại mở ra nguồn khác.
 */
export function dungNguCanh(sources: Source[]): string {
  return sources
    .map(
      (s) =>
        `[${s.n}] ${s.doc} — ${s.locator} (${s.unit})\n${s.excerpt}`,
    )
    .join("\n\n---\n\n");
}

/** Phần người dùng: ngữ cảnh trước, câu hỏi sau. */
export function dungPromptNguoiDung(question: string, sources: Source[]): string {
  return `CÁC ĐOẠN TÀI LIỆU:

${dungNguCanh(sources)}

CÂU HỎI: ${question}`;
}

/**
 * Tiêu đề hội thoại, sinh từ câu hỏi đầu tiên.
 *
 * Cắt theo ranh giới TỪ chứ không cắt giữa chừng — cắt bừa ở ký tự thứ 60 có thể
 * rơi vào giữa một chữ tiếng Việt có dấu.
 */
export function dungTieuDe(question: string, gioiHan = 60): string {
  const sach = question.trim().replace(/\s+/g, " ");
  if (sach.length <= gioiHan) return sach;
  const cat = sach.slice(0, gioiHan);
  const khoangTrang = cat.lastIndexOf(" ");
  return (khoangTrang > 20 ? cat.slice(0, khoangTrang) : cat) + "…";
}

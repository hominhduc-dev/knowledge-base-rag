// ---------------------------------------------------------------------------
// Ràng buộc trích dẫn — mục 4.5 của docs/THIET-KE-HE-THONG.md.
//
// PROMPT LÀ GỢI Ý, MÃ NGUỒN LÀ RÀNG BUỘC.
//
// Prompt yêu cầu mô hình chỉ chèn marker `[n]` khớp với nguồn đã cung cấp. Mô
// hình có thể phớt lờ: nó bịa `[4]` trong khi chỉ có 3 nguồn, và người dùng bấm
// vào một trích dẫn không tồn tại. Module này kiểm lại ở tầng ứng dụng, không
// phụ thuộc việc mô hình có tuân thủ hay không.
//
// Hàm thuần, không chạm mạng hay CSDL — test được trực tiếp.
// ---------------------------------------------------------------------------

/** Marker dạng `[1]`, `[12]`. Không khớp `[a]`, `[1.2]` hay `[]`. */
const MARKER = /\[(\d{1,2})\]/g;

/**
 * Ranh giới câu: dấu kết câu theo sau bởi khoảng trắng, hoặc xuống dòng.
 *
 * Nhóm bắt để `split` GIỮ LẠI phần ngăn cách — nếu không, danh sách gạch đầu
 * dòng sẽ bị ép thành một khối liền.
 */
const RANH_CAU = /((?<=[.!?…])\s+|\n+)/;

export type GuardResult = {
  /** Văn bản đã gỡ các marker không hợp lệ. */
  text: string;
  /** Số hiệu nguồn thực sự còn được trích, theo thứ tự xuất hiện. */
  daDung: number[];
  /** Số hiệu mô hình bịa ra, đã bị gỡ. Ghi log để theo dõi chất lượng. */
  daGo: number[];
};

/**
 * Gỡ mọi marker không trỏ tới nguồn nào có thật.
 *
 * Chỉ gỡ MARKER, giữ nguyên phần chữ quanh nó: câu văn vẫn đọc được, chỉ mất
 * cái nhãn sai. Xóa cả câu sẽ làm câu trả lời cụt một cách khó hiểu.
 *
 * @param soNguon số lượng nguồn đã gửi cho mô hình; marker hợp lệ là 1..soNguon
 */
export function locMarker(text: string, soNguon: number): GuardResult {
  const daDung: number[] = [];
  const daGo: number[] = [];

  const ra = text.replace(MARKER, (nguyenVan, so: string) => {
    const n = Number.parseInt(so, 10);
    if (n >= 1 && n <= soNguon) {
      if (!daDung.includes(n)) daDung.push(n);
      return nguyenVan;
    }
    daGo.push(n);
    return "";
  });

  // Gỡ marker để lại khoảng trắng thừa và khoảng trắng trước dấu câu.
  const donDep = gomMarkerLap(ra)
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\s+([.,;:!?])/g, "$1");

  return { text: donDep, daDung, daGo };
}

/**
 * Trong MỘT câu, mỗi số hiệu chỉ giữ lại lần xuất hiện CUỐI.
 *
 * Prompt yêu cầu mô hình đặt marker một lần ở cuối câu, nhưng nó hay chèn sau
 * từng mệnh đề: "dưới 1,00 [1] hoặc dưới 1,20 [1]." Hai cái `[1]` trỏ cùng một
 * đoạn nên cái đầu không thêm thông tin gì, chỉ cắt vụn câu văn.
 *
 * Giữ lần CUỐI chứ không phải lần đầu: marker đứng sau phần chữ nó chứng minh,
 * nên đặt ở cuối mới bao được cả câu.
 *
 * Chỉ gộp trong phạm vi một câu. Mỗi gạch đầu dòng, mỗi câu là một khẳng định
 * riêng và vẫn cần nguồn của nó — gộp toàn văn bản sẽ để cả đoạn trần trụi chỉ
 * còn đúng một marker ở cuối.
 *
 * KHÔNG đụng tới `daDung`: mỗi số vẫn còn đúng một lần, tập nguồn được trích
 * không đổi.
 */
function gomMarkerLap(text: string): string {
  const phan = text.split(RANH_CAU);

  // Bước 2 vì `split` có nhóm bắt: chỉ số chẵn là câu, lẻ là phần ngăn cách.
  for (let i = 0; i < phan.length; i += 2) {
    const cau = phan[i];
    if (!cau || !cau.includes("[")) continue;

    // Lượt một: đếm mỗi số xuất hiện bao nhiêu lần trong câu.
    const tong = new Map<string, number>();
    cau.replace(MARKER, (_, so: string) => {
      tong.set(so, (tong.get(so) ?? 0) + 1);
      return "";
    });

    // Lượt hai: đi lại từ đầu, chỉ giữ lần bằng đúng tổng — tức lần cuối.
    const daGap = new Map<string, number>();
    phan[i] = cau.replace(MARKER, (nguyenVan, so: string) => {
      const lan = (daGap.get(so) ?? 0) + 1;
      daGap.set(so, lan);
      return lan === tong.get(so) ? nguyenVan : "";
    });
  }

  return phan.join("");
}

/**
 * Câu trả lời có ít nhất một trích dẫn hợp lệ không?
 *
 * Dùng để quyết định có thay bằng thông điệp từ chối hay không. Một câu trả lời
 * không trích dẫn gì, dù nghe hợp lý, chính là thứ đề tài này đặt ra để chống:
 * không có cách nào kiểm chứng nó đến từ đâu.
 */
export function coTrichDan(ket: GuardResult): boolean {
  return ket.daDung.length > 0;
}

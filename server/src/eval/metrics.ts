// ---------------------------------------------------------------------------
// Chỉ số đánh giá truy hồi — mục 7.2 của docs/THIET-KE-HE-THONG.md.
//
// Hàm thuần, không chạm CSDL và không gọi mạng, nên test được trực tiếp. Đây là
// những con số sẽ nằm trong báo cáo, nên định nghĩa phải rõ ràng và kiểm được.
// ---------------------------------------------------------------------------

/**
 * recall@k — tỉ lệ câu hỏi có ÍT NHẤT MỘT đoạn vàng nằm trong top-k.
 *
 * Chỉ số CHÍNH của đồ án, mục tiêu ≥ 0,80 tại k = 5.
 *
 * Lưu ý về định nghĩa: đây là "ít nhất một", KHÔNG phải "bao nhiêu phần trăm số
 * đoạn vàng tìm được". Với hỏi đáp thì một đoạn đúng đã đủ để trả lời, nên định
 * nghĩa này phản ánh đúng thứ người dùng quan tâm. Nếu báo cáo dùng định nghĩa
 * kia thì con số sẽ thấp hơn — phải nói rõ đang dùng định nghĩa nào.
 */
export function trungTrongTopK(
  ketQua: readonly string[],
  doanVang: readonly string[],
  k: number,
): boolean {
  const vang = new Set(doanVang);
  return ketQua.slice(0, k).some((id) => vang.has(id));
}

/**
 * Thứ hạng của đoạn vàng ĐẦU TIÊN, đếm từ 1. `null` nếu trượt hoàn toàn.
 *
 * Đếm từ 1 chứ không từ 0 vì MRR lấy nghịch đảo — hạng 0 sẽ chia cho không.
 */
export function hangTrungDauTien(
  ketQua: readonly string[],
  doanVang: readonly string[],
): number | null {
  const vang = new Set(doanVang);
  const i = ketQua.findIndex((id) => vang.has(id));
  return i === -1 ? null : i + 1;
}

/**
 * MRR — trung bình của nghịch đảo thứ hạng đoạn vàng đầu tiên.
 *
 * Khác recall ở chỗ nó đo CHẤT LƯỢNG XẾP HẠNG, không chỉ đo có tìm thấy hay
 * không. Tìm thấy ở hạng 1 được 1,0; hạng 5 chỉ được 0,2. Hai cấu hình cùng
 * recall@10 nhưng khác MRR thì cấu hình MRR cao hơn đưa câu trả lời lên trước
 * mắt người dùng sớm hơn.
 *
 * Câu trượt tính 0 — KHÔNG bỏ qua. Bỏ qua câu trượt sẽ khiến một cấu hình chỉ
 * trả lời được 3 câu nhưng trả rất đúng trông tốt hơn cấu hình trả lời được 30
 * câu ở hạng trung bình.
 */
export function mrr(hangCacCau: readonly (number | null)[]): number {
  if (hangCacCau.length === 0) return 0;
  const tong = hangCacCau.reduce<number>((s, h) => s + (h === null ? 0 : 1 / h), 0);
  return tong / hangCacCau.length;
}

/** recall@k trên toàn bộ bộ câu hỏi. */
export function recallAtK(
  cacCau: readonly { ketQua: readonly string[]; doanVang: readonly string[] }[],
  k: number,
): number {
  if (cacCau.length === 0) return 0;
  const trung = cacCau.filter((c) => trungTrongTopK(c.ketQua, c.doanVang, k)).length;
  return trung / cacCau.length;
}

/** Làm tròn ba chữ số thập phân, đúng độ chính xác cột `numeric(4,3)`. */
export function lamTron(x: number): number {
  return Math.round(x * 1000) / 1000;
}

// ---------------------------------------------------------------------------
// Kiểm chứng ràng buộc trích dẫn — mục 4.5 của docs/THIET-KE-HE-THONG.md.
//
// Đây là chỗ mã nguồn chặn mô hình. Prompt yêu cầu chỉ chèn marker khớp nguồn
// đã cung cấp, nhưng mô hình có thể phớt lờ — và khi nó bịa `[4]` trong khi chỉ
// có 3 nguồn, người dùng bấm vào một trích dẫn không tồn tại.
// ---------------------------------------------------------------------------
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { coTrichDan, locMarker } from "./citation-guard.js";

describe("locMarker — gỡ trích dẫn mô hình bịa ra", () => {
  it("giữ nguyên marker hợp lệ", () => {
    const ket = locMarker("Sinh viên cần 105 tín chỉ [1] và không nợ quá 02 học phần [2].", 3);
    assert.equal(ket.text, "Sinh viên cần 105 tín chỉ [1] và không nợ quá 02 học phần [2].");
    assert.deepEqual(ket.daDung, [1, 2]);
    assert.deepEqual(ket.daGo, []);
  });

  it("GỠ marker vượt quá số nguồn đã gửi", () => {
    // Mô hình bịa [4] trong khi chỉ có 3 nguồn — tình huống mục 4.5 nêu đích danh.
    const ket = locMarker("Điều kiện là 105 tín chỉ [1], theo quy định mới [4].", 3);
    assert.ok(!ket.text.includes("[4]"), "marker bịa vẫn còn trong văn bản");
    assert.deepEqual(ket.daGo, [4]);
    assert.deepEqual(ket.daDung, [1]);
  });

  it("gỡ marker nhưng GIỮ câu văn quanh nó", () => {
    const ket = locMarker("Sinh viên phải nộp đơn trước 15 ngày [9].", 2);
    // Xóa cả câu sẽ làm câu trả lời cụt một cách khó hiểu; chỉ cái nhãn sai bị bỏ.
    assert.ok(ket.text.includes("Sinh viên phải nộp đơn trước 15 ngày"));
    assert.ok(!ket.text.includes("[9]"));
  });

  it("gỡ marker số 0 — không có nguồn nào đánh số 0", () => {
    const ket = locMarker("Theo quy định [0].", 3);
    assert.deepEqual(ket.daGo, [0]);
  });

  it("không nhận nhầm những thứ trông giống marker", () => {
    const goc = "Mục [a] và khoảng [1.5] và ngoặc rỗng [] giữ nguyên.";
    const ket = locMarker(goc, 3);
    assert.equal(ket.text, goc);
    assert.deepEqual(ket.daGo, []);
  });

  it("dọn khoảng trắng thừa sau khi gỡ", () => {
    const ket = locMarker("Điều kiện [5] là 105 tín chỉ [1].", 2);
    assert.ok(!/ {2,}/.test(ket.text), `còn khoảng trắng đôi: ${JSON.stringify(ket.text)}`);
    assert.ok(!/\s+\./.test(ket.text), "còn khoảng trắng trước dấu chấm");
  });

  it("không đếm trùng khi cùng một nguồn được trích nhiều lần", () => {
    const ket = locMarker("Theo [1], và cũng theo [1] thì [2] bổ sung thêm.", 2);
    assert.deepEqual(ket.daDung, [1, 2]);
  });

  it("ghi nhận đúng thứ tự xuất hiện, không phải thứ tự số", () => {
    const ket = locMarker("Trước hết [3], sau đó [1].", 3);
    assert.deepEqual(ket.daDung, [3, 1]);
  });
});

describe("coTrichDan — quyết định có thay bằng câu từ chối không", () => {
  it("câu trả lời không trích dẫn gì là KHÔNG chấp nhận được", () => {
    // Nghe hợp lý nhưng không có cách nào kiểm chứng nó đến từ đâu — đúng thứ
    // đề tài này đặt ra để chống.
    const ket = locMarker("Sinh viên cần tích lũy đủ tín chỉ để tốt nghiệp.", 3);
    assert.equal(coTrichDan(ket), false);
  });

  it("câu trả lời mà MỌI marker đều bịa cũng không chấp nhận được", () => {
    const ket = locMarker("Điều kiện là 90 tín chỉ [7][8].", 3);
    assert.deepEqual(ket.daDung, []);
    assert.equal(coTrichDan(ket), false, "phải bị coi là không có trích dẫn");
  });

  it("chỉ cần một trích dẫn hợp lệ là đủ", () => {
    const ket = locMarker("Điều kiện là 105 tín chỉ [1], có thể thay đổi [9].", 3);
    assert.equal(coTrichDan(ket), true);
  });
});

// ---------------------------------------------------------------------------
// Kiểm chứng chỉ số đánh giá — mục 7.2 của docs/THIET-KE-HE-THONG.md.
//
// Đây là những con số sẽ nằm trong báo cáo và được hội đồng hỏi. Một công thức
// sai ở đây không gây lỗi nào — nó chỉ cho ra một bảng số liệu đẹp và vô nghĩa.
// ---------------------------------------------------------------------------
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hangTrungDauTien, lamTron, mrr, recallAtK, trungTrongTopK } from "./metrics.js";

describe("trungTrongTopK", () => {
  it("chỉ cần MỘT đoạn vàng trong top-k là tính đạt", () => {
    assert.equal(trungTrongTopK(["a", "b", "c"], ["c"], 5), true);
  });

  it("đoạn vàng nằm NGOÀI top-k thì không tính", () => {
    // Có tìm thấy, nhưng ở hạng 4 — với k=3 thì người dùng không thấy nó.
    assert.equal(trungTrongTopK(["a", "b", "c", "vang"], ["vang"], 3), false);
    assert.equal(trungTrongTopK(["a", "b", "c", "vang"], ["vang"], 4), true);
  });

  it("không có đoạn vàng nào thì luôn trượt", () => {
    assert.equal(trungTrongTopK(["a", "b"], [], 5), false);
  });

  it("kết quả rỗng thì trượt", () => {
    assert.equal(trungTrongTopK([], ["vang"], 5), false);
  });
});

describe("hangTrungDauTien", () => {
  it("đếm từ 1, không phải từ 0", () => {
    // Đếm từ 0 sẽ làm MRR chia cho không.
    assert.equal(hangTrungDauTien(["vang", "b"], ["vang"]), 1);
    assert.equal(hangTrungDauTien(["a", "vang"], ["vang"]), 2);
  });

  it("lấy đoạn vàng ĐẦU TIÊN khi có nhiều đoạn đúng", () => {
    assert.equal(hangTrungDauTien(["a", "v2", "v1"], ["v1", "v2"]), 2);
  });

  it("trả null khi trượt hoàn toàn", () => {
    assert.equal(hangTrungDauTien(["a", "b"], ["vang"]), null);
  });
});

describe("mrr", () => {
  it("hạng 1 được điểm tuyệt đối", () => {
    assert.equal(mrr([1, 1, 1]), 1);
  });

  it("hạng thấp hơn thì điểm thấp hơn", () => {
    assert.equal(mrr([2]), 0.5);
    assert.equal(mrr([4]), 0.25);
  });

  it("câu TRƯỢT tính 0, KHÔNG bỏ qua", () => {
    // Bỏ qua câu trượt sẽ khiến một cấu hình chỉ trả lời được 1 câu nhưng rất
    // đúng trông tốt hơn cấu hình trả lời được cả bộ ở hạng trung bình.
    assert.equal(mrr([1, null]), 0.5);
    assert.notEqual(mrr([1, null]), 1, "câu trượt bị bỏ qua — công thức sai");
  });

  it("bộ rỗng trả 0, không phải NaN", () => {
    assert.equal(mrr([]), 0);
  });

  it("phân biệt được hai cấu hình cùng recall nhưng khác thứ hạng", () => {
    // Cả hai đều tìm thấy đủ, nhưng cấu hình A đưa đáp án lên trước.
    const a = mrr([1, 1, 2]);
    const b = mrr([5, 6, 7]);
    assert.ok(a > b, "MRR không phân biệt được chất lượng xếp hạng");
  });
});

describe("recallAtK", () => {
  const bo = [
    { ketQua: ["v", "a"], doanVang: ["v"] }, // trúng hạng 1
    { ketQua: ["a", "b", "c", "v"], doanVang: ["v"] }, // trúng hạng 4
    { ketQua: ["a", "b"], doanVang: ["v"] }, // trượt
  ];

  it("tính đúng tỉ lệ theo k", () => {
    assert.equal(lamTron(recallAtK(bo, 1)), 0.333);
    assert.equal(lamTron(recallAtK(bo, 5)), 0.667);
  });

  it("k lớn hơn không bao giờ làm recall GIẢM", () => {
    // Tính chất bắt buộc: recall@k đơn điệu không giảm theo k. Vi phạm là công
    // thức sai.
    let truoc = 0;
    for (const k of [1, 2, 3, 5, 10, 20]) {
      const r = recallAtK(bo, k);
      assert.ok(r >= truoc, `recall@${k} = ${r} nhỏ hơn recall trước đó ${truoc}`);
      truoc = r;
    }
  });

  it("bộ rỗng trả 0", () => {
    assert.equal(recallAtK([], 5), 0);
  });
});

describe("lamTron", () => {
  it("giữ ba chữ số thập phân, khớp cột numeric(4,3)", () => {
    assert.equal(lamTron(0.6666666), 0.667);
    assert.equal(lamTron(1), 1);
  });
});

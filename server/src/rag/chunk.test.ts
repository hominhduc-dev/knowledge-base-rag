// ---------------------------------------------------------------------------
// Kiểm chứng bộ cắt đoạn — mục 4.4 của docs/THIET-KE-HE-THONG.md.
//
// Đây là thành phần quyết định CHẤT LƯỢNG TRÍCH DẪN. Cắt sai chỗ thì người dùng
// bấm vào nguồn rồi không thấy câu mà hệ thống vừa trích — lỗi không gây exception
// nào, chỉ làm sản phẩm mất tin cậy.
//
// Hàm thuần, không chạm cơ sở dữ liệu, nên test chạy được mà không cần Postgres.
// ---------------------------------------------------------------------------
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { catDoan, catTheoDoanVan, uocLuongToken, type ParsedPage } from "./chunk.js";

/** Quy chế thật rút gọn, có đủ Chương → Điều → Khoản. */
const QUY_CHE: ParsedPage[] = [
  {
    page: 1,
    text: [
      "Chương I",
      "QUY ĐỊNH CHUNG",
      "Điều 1. Phạm vi điều chỉnh",
      "Quy định này áp dụng cho sinh viên hệ đại học chính quy.",
      "Điều 2. Đối tượng áp dụng",
      "Sinh viên đang theo học tại trường.",
    ].join("\n"),
  },
  {
    page: 2,
    text: [
      "Chương II",
      "ĐỒ ÁN TỐT NGHIỆP",
      "Điều 12. Điều kiện nhận đồ án",
      "Khoản 1. Sinh viên được nhận đồ án khi tích lũy tối thiểu 105 tín chỉ.",
      "Khoản 2. Không nợ quá 02 học phần bắt buộc.",
    ].join("\n"),
  },
];

describe("uocLuongToken", () => {
  it("đếm theo ký tự, không theo từ", () => {
    // Chuỗi tiếng Việt có dấu vẫn được đếm bằng số ký tự chứ không phải byte.
    assert.equal(uocLuongToken("a".repeat(35)), 10);
    assert.ok(uocLuongToken("Điều 12") > 0);
  });
});

describe("catDoan — cắt theo cấu trúc", () => {
  it("ĐIỀU là đơn vị cơ sở — vừa trần thì giữ trọn cả Điều trong một đoạn", () => {
    const ra = catDoan(QUY_CHE);
    // Ba Điều, ba đoạn. Điều 12 giữ CẢ HAI Khoản vì tổng vẫn dưới trần: các
    // khoản của cùng một điều bổ nghĩa cho nhau, tách ra là trích dẫn trả về
    // nửa quy định.
    assert.equal(ra.length, 3);
    const dieu12 = ra.find((c) => c.headingPath === "Chương II > Điều 12")!;
    assert.ok(dieu12.content.includes("105 tín chỉ"), "thiếu Khoản 1");
    assert.ok(dieu12.content.includes("02 học phần bắt buộc"), "thiếu Khoản 2");
  });

  it("KHÔNG sinh đoạn chỉ chứa dòng tiêu đề", () => {
    const ra = catDoan(QUY_CHE);
    // "QUY ĐỊNH CHUNG" và "ĐỒ ÁN TỐT NGHIỆP" là tiêu đề chương, không phải nội
    // dung. Một đoạn chỉ có tiêu đề là rác với truy hồi: nó khớp câu hỏi nhưng
    // không mang câu trả lời nào.
    assert.ok(!ra.some((c) => c.content.trim() === "QUY ĐỊNH CHUNG"));
    assert.ok(!ra.some((c) => c.content.trim() === "ĐỒ ÁN TỐT NGHIỆP"));
  });

  it("dựng headingPath đầy đủ tới cấp cha", () => {
    const ra = catDoan(QUY_CHE);
    assert.deepEqual(
      ra.map((c) => c.headingPath),
      ["Chương I > Điều 1", "Chương I > Điều 2", "Chương II > Điều 12"],
    );
  });

  it("giữ đúng số trang của từng đoạn", () => {
    const ra = catDoan(QUY_CHE);
    assert.deepEqual(
      ra.map((c) => c.pageFrom),
      [1, 1, 2],
    );
  });

  it("CHỈ cắt theo Khoản khi Điều vượt trần", () => {
    // Cùng dữ liệu, hạ trần xuống để buộc cắt.
    const ra = catDoan(QUY_CHE, { maxTokens: 25, overlapTokens: 5 });
    const duong = ra.map((c) => c.headingPath);

    assert.ok(
      duong.includes("Chương II > Điều 12 > Khoản 1"),
      `phải cắt ra Khoản khi vượt trần, nhận được: ${JSON.stringify(duong)}`,
    );
    assert.ok(duong.includes("Chương II > Điều 12 > Khoản 2"));

    // Lời dẫn của Điều đi kèm Khoản ĐẦU TIÊN, không đứng riêng thành một đoạn
    // chỉ có tiêu đề.
    const khoan1 = ra.find((c) => c.headingPath?.endsWith("Khoản 1"))!;
    assert.ok(khoan1.content.includes("Điều kiện nhận đồ án"));
  });

  it("không trộn nội dung của hai Điều vào một đoạn", () => {
    const ra = catDoan(QUY_CHE);
    const dieu1 = ra.find((c) => c.headingPath === "Chương I > Điều 1")!;
    assert.ok(dieu1.content.includes("hệ đại học chính quy"));
    assert.ok(
      !dieu1.content.includes("đang theo học tại trường"),
      "nội dung Điều 2 lọt vào đoạn của Điều 1",
    );
  });

  it("giữ được cặp đối chứng: con số nằm cùng đoạn với điều kiện của nó", () => {
    const ra = catDoan(QUY_CHE);
    const doan = ra.find((c) => c.content.includes("105 tín chỉ"))!;
    assert.ok(doan, "không tìm thấy đoạn chứa con số đối chứng");
    // Con số phải nằm cùng đoạn với ngữ cảnh giải thích nó, nếu không truy hồi
    // trả về một con số trần không ai hiểu là điều kiện gì.
    assert.ok(doan.content.includes("nhận đồ án"));
    assert.ok(doan.headingPath?.includes("Điều 12"));
  });

  it("nhận diện được cả dạng KHÔNG DẤU — một số PDF mất dấu khi trích", () => {
    const khongDau: ParsedPage[] = [
      {
        page: 1,
        text: ["Chuong II", "Dieu 12. Dieu kien nhan do an", "Tich luy toi thieu 105 tin chi."].join("\n"),
      },
    ];
    const ra = catDoan(khongDau);
    assert.equal(ra.length, 1);
    // Giữ NGUYÊN VĂN cách tài liệu viết, không ép về dạng có dấu — trích dẫn
    // phải khớp với cái người đọc nhìn thấy trong tệp gốc.
    assert.equal(ra[0]?.headingPath, "Chuong II > Dieu 12");
  });

  it("KHÔNG coi 'theo Điều 12' giữa câu là một tiêu đề", () => {
    const giuaCau: ParsedPage[] = [
      {
        page: 1,
        text: ["Điều 5. Xử lý vi phạm", "Sinh viên vi phạm bị xử lý theo Điều 12 của quy chế này."].join("\n"),
      },
    ];
    const ra = catDoan(giuaCau);
    assert.equal(ra.length, 1, "tham chiếu giữa câu bị cắt nhầm thành tiêu đề");
    assert.equal(ra[0]?.headingPath, "Điều 5");
  });

  it("cắt nhỏ một Điều quá dài, có chồng lấn", () => {
    const cau = "Sinh viên phải hoàn thành đầy đủ nghĩa vụ học phí trước kỳ thi. ";
    const dai: ParsedPage[] = [
      { page: 1, text: `Điều 9. Nghĩa vụ tài chính\n${cau.repeat(60)}` },
    ];

    const ra = catDoan(dai, { maxTokens: 100, overlapTokens: 30 });
    assert.ok(ra.length > 1, "đoạn quá dài phải được cắt nhỏ");
    // Mọi mảnh đều giữ nguyên headingPath — nếu không, trích dẫn từ mảnh thứ hai
    // trở đi sẽ mất vị trí.
    assert.ok(ra.every((c) => c.headingPath === "Điều 9"));

    // Chồng lấn: phần đuôi của mảnh trước phải xuất hiện lại ở đầu mảnh sau.
    const duoi = ra[0]!.content.trim().split(/(?<=[.!?;])\s+/).slice(-1)[0]!;
    assert.ok(ra[1]!.content.includes(duoi), "không thấy phần chồng lấn giữa hai mảnh");
  });

  it("tôn trọng trần maxTokens", () => {
    const cau = "Đây là một câu đủ dài để kiểm tra việc cắt theo trần token. ";
    const dai: ParsedPage[] = [{ page: 1, text: `Điều 9. Thử\n${cau.repeat(80)}` }];
    const ra = catDoan(dai, { maxTokens: 120, overlapTokens: 20 });

    // Cho phép vượt một chút: thuật toán chỉ cắt được ở ranh giới câu, nên một
    // câu dài bất thường vẫn có thể đẩy đoạn vượt trần.
    for (const c of ra) {
      assert.ok(c.tokenCount <= 120 * 1.5, `đoạn ${c.tokenCount} token, vượt xa trần 120`);
    }
  });
});

describe("catTheoDoanVan — đường lùi cho tài liệu không cấu trúc", () => {
  const SO_TAY: ParsedPage[] = [
    {
      page: 1,
      text: [
        "Chào mừng sinh viên khóa mới.",
        "",
        "Thư viện mở cửa từ 7h30 đến 21h00 các ngày trong tuần.",
        "",
        "Ký túc xá nhận đăng ký vào đầu mỗi học kỳ.",
      ].join("\n"),
    },
  ];

  it("tự động dùng khi không tìm thấy ranh giới Điều/Chương", () => {
    const ra = catDoan(SO_TAY);
    assert.ok(ra.length > 0);
    // Không có cấu trúc thì không có gì để ghi vào headingPath — trích dẫn chỉ
    // còn số trang. Đó là hạn chế đã biết và chấp nhận.
    assert.ok(ra.every((c) => c.headingPath === null));
  });

  it("gom các đoạn văn nhỏ lại thay vì mỗi đoạn một chunk", () => {
    const ra = catTheoDoanVan(SO_TAY, { maxTokens: 800, overlapTokens: 100 });
    assert.equal(ra.length, 1, "ba đoạn văn ngắn nên nằm chung một chunk");
    assert.ok(ra[0]?.content.includes("Thư viện"));
    assert.ok(ra[0]?.content.includes("Ký túc xá"));
  });

  it("vẫn cắt khi tổng vượt trần", () => {
    const ra = catTheoDoanVan(SO_TAY, { maxTokens: 15, overlapTokens: 5 });
    assert.ok(ra.length > 1);
  });

  it("giữ số trang đầu và cuối khi một chunk trải qua hai trang", () => {
    const haiTrang: ParsedPage[] = [
      { page: 3, text: "Nội dung trang ba." },
      { page: 4, text: "Nội dung trang bốn." },
    ];
    const ra = catTheoDoanVan(haiTrang);
    assert.equal(ra.length, 1);
    assert.equal(ra[0]?.pageFrom, 3);
    assert.equal(ra[0]?.pageTo, 4);
  });
});

describe("trường hợp biên", () => {
  it("tài liệu rỗng trả mảng rỗng, không ném lỗi", () => {
    assert.deepEqual(catDoan([]), []);
    assert.deepEqual(catDoan([{ page: 1, text: "   \n\n  " }]), []);
  });

  it("không sinh đoạn rỗng từ dòng tiêu đề đứng một mình", () => {
    const chiTieuDe: ParsedPage[] = [{ page: 1, text: "Chương I\nĐiều 1. Tiêu đề\nNội dung." }];
    const ra = catDoan(chiTieuDe);
    assert.ok(ra.every((c) => c.content.trim().length > 0));
  });
});

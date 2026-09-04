// ---------------------------------------------------------------------------
// Bộ câu hỏi vàng — mục 7.1 của docs/THIET-KE-HE-THONG.md.
//
// ĐOẠN ĐÁP ÁN ĐƯỢC THAM CHIẾU BẰNG CHUỖI NỘI DUNG, KHÔNG BẰNG UUID.
//
// UUID của đoạn văn sinh ra lúc seed. Ghi UUID vào đây thì file này chết ngay
// khi ai đó nạp lại dữ liệu trên máy khác — và chết IM LẶNG, chỉ biểu hiện bằng
// recall tụt về 0. Chuỗi nội dung thì đọc được, tự giải thích đáp án đúng là gì,
// và bộ nạp báo lỗi to nếu chuỗi khớp 0 hoặc nhiều hơn 1 đoạn.
//
// NGUYÊN TẮC ĐẶT CÂU HỎI: dùng từ ngữ NGƯỜI HỎI THẬT sẽ dùng, không chép lại từ
// trong văn bản. Hỏi "bị đuổi học khi nào" chứ không hỏi "cảnh báo học vụ là
// gì" — nếu câu hỏi trùng từ với đáp án thì bài đo chỉ còn đo tìm kiếm từ khóa,
// và điểm số đẹp một cách vô nghĩa.
// ---------------------------------------------------------------------------

export type GoldenQuestion = {
  /** Mã ổn định, dùng làm khóa trong `eval_questions`. */
  code: string;
  question: string;
  /**
   * Mã đơn vị của người hỏi giả định. `null` nghĩa là câu hỏi không phụ thuộc
   * đơn vị — dùng tài khoản ADMIN.
   */
  asker: "CNTT" | "KTR" | "XD" | null;
  /**
   * Chuỗi nhận dạng các đoạn ĐÁNG LẼ phải được truy hồi. Mỗi chuỗi phải khớp
   * ĐÚNG MỘT đoạn trong cơ sở dữ liệu.
   *
   * Rỗng nghĩa là câu hỏi KHÔNG có đáp án trong kho — hệ thống phải từ chối.
   */
  gold: string[];
  note?: string;
};

export const BO_CAU_HOI_VANG: GoldenQuestion[] = [
  // --- Cặp đối chứng: cùng câu hỏi, hai khoa, hai đáp án ---------------------
  {
    code: "DOAN-CNTT",
    question: "Em cần bao nhiêu tín chỉ mới được làm khóa luận ra trường?",
    asker: "CNTT",
    gold: ["tối thiểu 105 tín chỉ"],
    note: "Cặp đối chứng. Câu hỏi dùng 'khóa luận', tài liệu dùng 'đồ án'.",
  },
  {
    code: "DOAN-KTR",
    question: "Em cần bao nhiêu tín chỉ mới được làm khóa luận ra trường?",
    asker: "KTR",
    gold: ["tối thiểu 90 tín chỉ"],
    note: "Cùng câu hỏi với DOAN-CNTT nhưng đáp án khác — kiểm cách ly phạm vi.",
  },
  {
    code: "DOAN-DIEUKIEN-CNTT",
    question: "Nợ môn thì có được nhận đồ án không?",
    asker: "CNTT",
    gold: ["không nợ quá 02 học phần bắt buộc"],
  },
  {
    code: "DOAN-BANVE-KTR",
    question: "Làm đồ án ngành xây dựng có phải nộp bản vẽ không?",
    asker: "KTR",
    gold: ["bản vẽ kỹ thuật"],
  },

  // --- Tốt nghiệp -----------------------------------------------------------
  {
    code: "TN-DIEM",
    question: "Điểm trung bình bao nhiêu thì được ra trường?",
    asker: null,
    gold: ["điểm trung bình tích lũy đạt từ 2,00"],
  },
  {
    code: "TN-NGOAINGU",
    question: "Ra trường có bắt buộc phải có bằng tiếng Anh không?",
    asker: null,
    gold: ["chuẩn đầu ra ngoại ngữ bậc 3"],
  },
  {
    code: "TN-KYLUAT",
    question: "Đang bị kỷ luật thì có được xét tốt nghiệp không?",
    asker: null,
    gold: ["không trong thời gian bị kỷ luật"],
  },
  {
    code: "TN-GDTC",
    question: "Chưa học xong giáo dục thể chất có ra trường được không?",
    asker: null,
    gold: ["Giáo dục thể chất"],
  },

  // --- Cảnh báo học vụ ------------------------------------------------------
  {
    code: "CANHBAO-DIEM",
    question: "Học kém thế nào thì bị nhà trường nhắc nhở?",
    asker: null,
    gold: ["điểm trung bình học kỳ đạt dưới 1,00"],
    note: "Câu hỏi tránh hẳn cụm 'cảnh báo học vụ' có trong văn bản.",
  },
  {
    code: "CANHBAO-TINCHI",
    question: "Rớt bao nhiêu tín chỉ thì bị cảnh cáo?",
    asker: null,
    gold: ["tổng số tín chỉ chưa đạt"],
  },

  // --- Bảo lưu --------------------------------------------------------------
  {
    code: "BAOLUU-THOIGIAN",
    question: "Em muốn nghỉ một năm rồi học tiếp có được không?",
    asker: null,
    gold: ["bảo lưu kết quả học tập tối đa 02 học kỳ"],
  },
  {
    code: "BAOLUU-NOPDON",
    question: "Xin tạm dừng học thì nộp giấy tờ ở đâu?",
    asker: null,
    gold: ["Đơn xin bảo lưu kết quả học tập nộp tại Phòng Đào tạo"],
  },

  // --- Chứng chỉ ngoại ngữ, tin học (tài liệu OCR) --------------------------
  {
    code: "CC-CHUANDAURA",
    question: "Chuẩn đầu ra ngoại ngữ và tin học của trường là gì?",
    asker: null,
    gold: ["Yêu cầu chuẩn đầu ra ngoại ngữ, tin học"],
  },
  {
    code: "CC-MIENTHI",
    question: "Có chứng chỉ IELTS rồi thì khỏi thi đúng không?",
    asker: null,
    gold: ["được xét miễn thi khảo sát"],
  },
  {
    code: "CC-HOSO",
    question: "Nộp chứng chỉ tiếng Anh cần photo công chứng không?",
    asker: null,
    gold: ["nộp hồ sơ văn bằng chứng chỉ xét miễn thi"],
  },
  {
    code: "CC-CONGNHAN",
    question: "Trường công nhận những chứng chỉ tin học nào?",
    asker: null,
    gold: ["Công nhận chứng chỉ Ngoại ngữ và tin học tương đương"],
  },
  {
    code: "CC-KETQUA",
    question: "Bao giờ thì biết mình có được miễn thi hay không?",
    asker: null,
    gold: ["Công bố kết quả xét miễn thi"],
  },
  {
    code: "CC-HIEULUC",
    question: "Quy định về chứng chỉ ngoại ngữ áp dụng từ khi nào?",
    asker: null,
    gold: ["có hiệu lực từ học kỳ 1 năm học 2026-2"],
  },
  {
    code: "CC-PHAMVI",
    question: "Quy định quy đổi chứng chỉ áp dụng cho ai?",
    asker: null,
    gold: ["Phạm vi điều chỉnh và đối tượng áp dụng"],
  },
  {
    code: "CC-HOIDONG",
    question: "Ai là người quyết định việc miễn thi chuẩn đầu ra?",
    asker: null,
    gold: ["Hội đồng xét miễn thi"],
  },

  // --- Đồ án, chi tiết khác -------------------------------------------------
  {
    code: "DOAN-HOIDONG-CNTT",
    question: "Hội đồng chấm đồ án gồm mấy người?",
    asker: "CNTT",
    gold: ["tối thiểu 03 thành viên"],
  },
  {
    code: "DOAN-DIEMDAT-CNTT",
    question: "Bao nhiêu điểm thì đồ án được coi là đạt?",
    asker: "CNTT",
    gold: ["điểm trung bình của hội đồng từ 4,0"],
  },
  {
    code: "DOAN-GVHD-CNTT",
    question: "Một thầy được hướng dẫn tối đa mấy bạn?",
    asker: "CNTT",
    gold: ["không quá 08 sinh viên"],
  },

  // --- Học phí --------------------------------------------------------------
  {
    code: "HOCPHI-HANNOP",
    question: "Hạn chót đóng tiền học kỳ một là ngày nào?",
    asker: null,
    gold: ["nộp trước ngày 15/10/2025"],
  },
  {
    code: "HOCPHI-NOPODAU",
    question: "Đóng học phí ở đâu?",
    asker: null,
    gold: ["cổng thanh toán trực tuyến"],
  },

  // --- CÁCH LY PHẠM VI: hỏi về khoa khác -----------------------------------
  {
    code: "CACHLY-CNTT-HOI-KTR",
    question: "Đồ án ngành kiến trúc cần bao nhiêu tín chỉ?",
    asker: "CNTT",
    gold: [],
    note:
      "Sinh viên CNTT hỏi về quy định Khoa Kiến trúc. Đáp án tồn tại trong CSDL " +
      "nhưng NGOÀI phạm vi người hỏi — hệ thống phải từ chối, không được trả 90 tín chỉ.",
  },
  {
    code: "CACHLY-KTR-HOI-CNTT",
    question: "Quy định đồ án của khoa công nghệ thông tin thế nào?",
    asker: "KTR",
    gold: [],
    note: "Chiều ngược lại. Không được trả 105 tín chỉ.",
  },
  {
    code: "CACHLY-XD-HOI-DOAN",
    question: "Điều kiện nhận đồ án tốt nghiệp của khoa em là gì?",
    asker: "XD",
    gold: [],
    note: "Khoa Xây dựng chưa có tài liệu đồ án riêng — phải từ chối.",
  },

  // --- NGOÀI KHO TÀI LIỆU: bắt buộc từ chối --------------------------------
  {
    code: "NGOAI-VEMAYBAY",
    question: "Giá vé máy bay đi Nhật Bản mùa hè khoảng bao nhiêu?",
    asker: null,
    gold: [],
    note: "Không liên quan gì tới học vụ.",
  },
  {
    code: "NGOAI-KYTUCXA",
    question: "Ký túc xá trường có máy giặt không?",
    asker: null,
    gold: [],
    note: "Thuộc lĩnh vực học vụ nhưng không có trong kho — dễ khiến mô hình đoán bừa.",
  },
  {
    code: "NGOAI-HOCBONG",
    question: "Điều kiện xét học bổng khuyến khích học tập là gì?",
    asker: null,
    gold: [],
    note: "Nghe rất giống nội dung có thật, nhưng kho chưa có quy chế học bổng.",
  },
];

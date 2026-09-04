export type Source = {
  n: number;
  doc: string;
  locator: string;
  excerpt: string;
  unit: string;
};

export type DocumentStatus = "ready" | "processing" | "error";

export type KnowledgeDocument = {
  name: string;
  code: string;
  unit: string;
  status: DocumentStatus;
  chunks: number;
  updated: string;
};

export const sampleQuestions = [
  "Điều kiện xét tốt nghiệp là gì?",
  "Chứng chỉ nào được quy đổi chuẩn đầu ra ngoại ngữ, tin học?",
  "Bao nhiêu tín chỉ thì bị cảnh báo học vụ?",
  "Thủ tục xin bảo lưu kết quả học tập?",
];

export const history = [
  { title: "Điều kiện nhận đồ án tốt nghiệp", when: "Hôm nay" },
  { title: "Nợ bao nhiêu tín chỉ thì bị cảnh báo", when: "Hôm qua" },
  { title: "Hạn nộp học phí học kỳ I", when: "18/08" },
  { title: "Cấp bảng điểm tiếng Anh mất bao lâu", when: "11/08" },
];

const graduationSources: Source[] = [
  {
    n: 1,
    doc: "Quy chế đào tạo trình độ đại học",
    locator: "Điều 12, Khoản 1 · Trang 8",
    excerpt: "Sinh viên được xét công nhận tốt nghiệp khi tích lũy đủ số tín chỉ của chương trình đào tạo và điểm trung bình tích lũy đạt từ 2,00 trở lên.",
    unit: "Toàn trường",
  },
  {
    n: 2,
    doc: "Quy chế đào tạo trình độ đại học",
    locator: "Điều 12, Khoản 3 · Trang 8",
    excerpt: "Sinh viên phải đạt chuẩn đầu ra ngoại ngữ bậc 3 theo Khung năng lực ngoại ngữ 6 bậc dùng cho Việt Nam và hoàn thành các học phần Giáo dục thể chất, Giáo dục quốc phòng và an ninh.",
    unit: "Toàn trường",
  },
  {
    n: 3,
    doc: "Quy chế đào tạo trình độ đại học",
    locator: "Điều 12, Khoản 4 · Trang 9",
    excerpt: "Tại thời điểm xét tốt nghiệp, sinh viên không bị truy cứu trách nhiệm hình sự và không trong thời gian bị kỷ luật ở mức đình chỉ học tập.",
    unit: "Toàn trường",
  },
];

const warningSources: Source[] = [
  {
    n: 1,
    doc: "Quy chế đào tạo trình độ đại học",
    locator: "Điều 10, Khoản 1 · Trang 6",
    excerpt: "Sinh viên bị cảnh báo học vụ nếu điểm trung bình học kỳ đạt dưới 1,00 hoặc điểm trung bình tích lũy đạt dưới 1,20 đối với sinh viên năm thứ nhất.",
    unit: "Toàn trường",
  },
  {
    n: 2,
    doc: "Quy chế đào tạo trình độ đại học",
    locator: "Điều 10, Khoản 2 · Trang 6",
    excerpt: "Sinh viên bị cảnh báo học vụ nếu tổng số tín chỉ chưa đạt tính từ đầu khóa học vượt quá 24 tín chỉ.",
    unit: "Toàn trường",
  },
];

const reserveSources: Source[] = [
  {
    n: 1,
    doc: "Hướng dẫn thủ tục hành chính — Phòng Đào tạo",
    locator: "Mục 2.1 · Trang 3",
    excerpt: "Đơn xin bảo lưu kết quả học tập nộp tại Phòng Đào tạo trước ngày bắt đầu học kỳ ít nhất 15 ngày, kèm xác nhận của Giáo vụ khoa và bản sao giấy tờ minh chứng.",
    unit: "Toàn trường",
  },
  {
    n: 2,
    doc: "Quy chế đào tạo trình độ đại học",
    locator: "Điều 15, Khoản 2 · Trang 11",
    excerpt: "Sinh viên được bảo lưu kết quả học tập tối đa 02 học kỳ liên tiếp; thời gian bảo lưu không tính vào thời gian tối đa hoàn thành chương trình đào tạo.",
    unit: "Toàn trường",
  },
];

const tuitionSources: Source[] = [
  {
    n: 1,
    doc: "Sổ tay sinh viên 2025–2026",
    locator: "Mục 4.2 · Trang 21",
    excerpt: "Học phí học kỳ I năm học 2025–2026 nộp trước ngày 15/10/2025 qua cổng thanh toán trực tuyến của trường hoặc tại Phòng Kế hoạch – Tài chính.",
    unit: "Toàn trường",
  },
];

export function mockAnswer(question: string): { answer: string; sources: Source[] } | null {
  const q = question.toLocaleLowerCase("vi");
  if (q.includes("tốt nghiệp")) {
    return {
      answer: "Sinh viên được xét tốt nghiệp khi tích lũy đủ số tín chỉ và có điểm trung bình tích lũy từ 2,00 trở lên [1]. Anh/chị đồng thời phải đạt chuẩn đầu ra ngoại ngữ bậc 3 và hoàn thành Giáo dục thể chất, Giáo dục quốc phòng và an ninh [2]. Tại thời điểm xét, sinh viên không bị truy cứu trách nhiệm hình sự hoặc kỷ luật đình chỉ học tập [3].",
      sources: graduationSources,
    };
  }
  if (q.includes("cảnh báo") || q.includes("24 tín chỉ")) {
    return {
      answer: "Sinh viên có thể bị cảnh báo học vụ khi điểm trung bình học kỳ dưới 1,00 hoặc điểm trung bình tích lũy dưới 1,20 đối với năm thứ nhất [1]. Cảnh báo cũng áp dụng khi tổng số tín chỉ chưa đạt tính từ đầu khóa vượt quá 24 tín chỉ [2].",
      sources: warningSources,
    };
  }
  if (q.includes("bảo lưu")) {
    return {
      answer: "Anh/chị nộp đơn xin bảo lưu tại Phòng Đào tạo trước ngày bắt đầu học kỳ ít nhất 15 ngày, kèm xác nhận của Giáo vụ khoa và giấy tờ minh chứng [1]. Kết quả học tập được bảo lưu tối đa 02 học kỳ liên tiếp [2].",
      sources: reserveSources,
    };
  }
  if (q.includes("học phí")) {
    return {
      answer: "Theo tài liệu hiện có, học phí học kỳ I năm học 2025–2026 phải nộp trước ngày 15/10/2025 qua cổng thanh toán trực tuyến hoặc tại Phòng Kế hoạch – Tài chính [1].",
      sources: tuitionSources,
    };
  }
  return null;
}

// `documents` và `documentChunks` đã được gỡ: màn Tài liệu nay gọi thẳng
// `GET /documents` và `GET /documents/:id/chunks`. Xem `features/documents/api.ts`.
//
// Giữ lại dữ liệu giả song song với API thật là để hai nguồn sự thật cùng tồn
// tại, và người kiểm thử không biết mình đang nhìn cái nào.

export const departments = [
  { name: "Khoa Công nghệ Thông tin", kind: "Khoa · 4 bộ môn", docs: 24, users: 1180, staff: "Trần Thị Hoà" },
  { name: "Khoa Kiến trúc", kind: "Khoa · 3 bộ môn", docs: 17, users: 940, staff: "Lê Văn Bằng" },
  { name: "Khoa Xây dựng", kind: "Khoa · 5 bộ môn", docs: 31, users: 1620, staff: "Phạm Quốc Đạt" },
  { name: "Phòng Đào tạo", kind: "Phòng ban", docs: 12, users: 26, staff: "Nguyễn Thu Hà" },
  { name: "Phòng Công tác Sinh viên", kind: "Phòng ban", docs: 9, users: 18, staff: "Vũ Đình Nam" },
];

/**
 * Dữ liệu giả cho màn quản trị, phản chiếu `server/prisma/seed.ts`.
 *
 * Chỉ có HAI vai. Giảng viên (Đỗ Anh Khoa) mang vai "Sinh viên" là đúng, không
 * phải sót: vai quyết định *làm được gì*, mà giảng viên chỉ cần đọc tài liệu của
 * khoa mình — xem docs/phan-quyen.md mục 1.
 *
 * Xóa khối này khi `GET /users` hoạt động.
 */
export const users = [
  { name: "Đỗ Anh Khoa", email: "khoa.da@dau.edu.vn", role: "Sinh viên", scope: "Khoa Công nghệ Thông tin" },
  { name: "Trần Thị Hoà", email: "hoa.tt@dau.edu.vn", role: "Quản trị viên", scope: "Khoa Công nghệ Thông tin" },
  { name: "Lê Văn Bằng", email: "bang.lv@dau.edu.vn", role: "Quản trị viên", scope: "Khoa Kiến trúc" },
  { name: "Phạm Quốc Đạt", email: "dat.pq@dau.edu.vn", role: "Quản trị viên", scope: "Khoa Xây dựng" },
  { name: "Vũ Đình Nam", email: "nam.vd@dau.edu.vn", role: "Quản trị viên", scope: "Phòng Công tác Sinh viên" },
  { name: "Nguyễn Thu Hà", email: "ha.nt@dau.edu.vn", role: "Quản trị viên", scope: "Toàn trường" },
  { name: "Hồ Minh Đức", email: "duc_2351220193@dau.edu.vn", role: "Sinh viên", scope: "Khoa Công nghệ Thông tin" },
  { name: "Võ Minh Hiếu", email: "hieu_2351220221@dau.edu.vn", role: "Sinh viên", scope: "Khoa Kiến trúc" },
];

// Ma trận quyền đã chuyển sang `features/admin/permissions.ts`.
//
// Nó là HẰNG SỐ, không phải dữ liệu giả: mọi thứ trong file này rồi sẽ bị xóa khi
// endpoint tương ứng xong, còn bảng quyền thì ở lại.

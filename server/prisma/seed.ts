/**
 * Dữ liệu mồi cho Sổ Tay Sinh Viên CNTT.
 *
 * Chạy: pnpm --filter @tang-thu/backend db:seed
 *
 * Vì hệ thống không có chức năng tự đăng ký, đây là cách DUY NHẤT để có tài
 * khoản đăng nhập — kể cả tài khoản quản trị. Seed hỏng là không ai vào được.
 *
 * Script này chạy lại được nhiều lần (idempotent): dùng upsert theo khóa duy
 * nhất, không nhân bản dữ liệu.
 *
 * PHẠM VI: đơn vị, người dùng, tài liệu và đoạn văn. KHÔNG sinh vector nhúng —
 * việc đó cần khóa Gemini và do tiến trình nạp tài liệu đảm nhiệm. Các đoạn văn
 * ở đây vẫn tìm được bằng tìm kiếm toàn văn vì cột `tsv` sinh tự động từ
 * `content`, đủ để kiểm thử cách ly phạm vi ngay từ Sprint 1.
 */
import { DeptType, DocStatus, MemberRole } from "@prisma/client";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { createHash } from "node:crypto";

const prisma = new PrismaClient();

/** Mật khẩu dùng chung cho cán bộ/admin mồi. Sinh viên dùng chính mã số sinh viên. */
const STAFF_SEED_PASSWORD = process.env.STAFF_SEED_PASSWORD ?? "Tangthu@123";

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
/** Ước lượng thô số token tiếng Việt, đủ dùng cho dữ liệu mồi. */
const estimateTokens = (s: string) => Math.ceil(s.length / 3.5);

// ===========================================================================
// ĐƠN VỊ
// ===========================================================================

const DEPARTMENTS = [
  { code: "CNTT", name: "Khoa Công nghệ Thông tin", type: DeptType.FACULTY },
];

// ===========================================================================
// NGƯỜI DÙNG
//
// Dữ liệu demo chỉ thuộc CNTT; ba vai phục vụ học phần Lập trình mạng.
//
// `code` là mã số sinh viên với sinh viên, mã cán bộ với tài khoản cán bộ/admin.
// Sinh viên đăng nhập bằng mã hoặc email, mật khẩu mặc định là chính mã số sinh viên.
// ===========================================================================

const USERS = [
  { code: "CB0231", email: "khoa.da@dau.edu.vn", fullName: "Đỗ Anh Khoa", role: MemberRole.USER, dept: "CNTT" },
  { code: "CB0142", email: "hoa.tt@dau.edu.vn", fullName: "Trần Thị Hoà", role: MemberRole.CONTENT_ADMIN, dept: "CNTT" },
  { code: "CB0006", email: "ha.nt@dau.edu.vn", fullName: "Nguyễn Thu Hà", role: MemberRole.SYSTEM_ADMIN, dept: "CNTT" },
];

// ===========================================================================
// SINH VIÊN — dữ liệu thật
//
// Nguồn: danh sách điểm danh lớp học phần "Lập trình mạng (NEP30103 - 23CT3)",
// học kỳ 1 năm học 2026-2027. Trích bằng `pnpm exec tsx scripts/extract-pdf.ts`.
//
// Mã sinh viên vào cột `code` (KHÔNG phải `id` — `id` là UUID khóa chính, mọi
// khóa ngoại trỏ vào đó; nếu trường cấp lại mã cho ai đó thì liên kết sẽ hỏng).
//
// Nhóm học tập KHÔNG được lưu vào cơ sở dữ liệu — lược đồ không có bảng tương
// ứng. Ở đây nó chỉ dùng làm khóa phân khoa: mỗi nhóm vào trọn một khoa, luân
// phiên CNTT → KTR → XD. Cách này tất định và giữ các bạn cùng nhóm chung khoa.
// ===========================================================================

/** Thứ tự nhóm quyết định khoa. Đổi thứ tự là đổi cách phân khoa. */
const GROUP_ORDER = [
  "Chồn",
  "Lucky",
  "Luôn giữ bình tĩnh",
  "Mất phương hướng",
  "Money",
  "Ngũ Hổ Tướng",
  "Nhóm Một",
  "NTTHH",
  "QBZ",
  "Thirty-six",
  "Vinno",
  "Xóm vắng",
  "Xóm nghỉ",
];

/** Chỉ khoa mới có sinh viên; phòng ban thì không. */
const STUDENT_DEPARTMENTS = ["CNTT"];

const groupToDepartment = new Map(
  GROUP_ORDER.map((group, i) => [group, STUDENT_DEPARTMENTS[i % STUDENT_DEPARTMENTS.length]]),
);

/** [mã sinh viên, họ đệm và tên, nhóm học tập] */
const STUDENTS: [string, string, string][] = [
  ["2351220274", "Võ Ngọc Bình", "Chồn"],
  ["2251220231", "Cao Xuân Đạt", "Chồn"],
  ["2351220275", "Trần Mỹ Nhung", "Chồn"],
  ["2351220232", "Huỳnh Công Thủ", "Chồn"],
  ["2351220221", "Võ Minh Hiếu", "Lucky"],
  ["2351220168", "Âu Thị Huyền Trang", "Lucky"],
  ["2351220222", "Phạm Thị Thùy Trang", "Lucky"],
  ["2351220001", "Chung Cơ Tuấn", "Lucky"],
  ["2351220110", "Đỗ Nguyễn Hoàng Tuấn", "Lucky"],
  ["2351220145", "Phùng Thị Thanh Huyền", "Luôn giữ bình tĩnh"],
  ["2351220131", "Nguyễn Thị Thục Ngân", "Luôn giữ bình tĩnh"],
  ["2351220154", "Võ Phương Nhi", "Luôn giữ bình tĩnh"],
  ["2351220121", "Nguyễn Minh Vương", "Luôn giữ bình tĩnh"],
  ["2351220227", "Trần Quốc Cường", "Mất phương hướng"],
  ["2351220007", "Lê Nguyễn Tiến Đạt", "Mất phương hướng"],
  ["2351220043", "Lê Nguyễn Hải", "Mất phương hướng"],
  ["2351220246", "Trương Văn Trà", "Mất phương hướng"],
  ["2351220109", "Huỳnh Ngọc Dũng", "Money"],
  ["2351220111", "Đinh Xuân Phát", "Money"],
  ["2351220224", "Nguyễn Thị Thu Thảo", "Money"],
  ["2351220223", "Nguyễn Quốc Trung", "Money"],
  ["2351220267", "Nguyễn Gia Bảo", "Ngũ Hổ Tướng"],
  ["2351220158", "Lê Nguyên Duy", "Ngũ Hổ Tướng"],
  ["2351220144", "Nguyễn Như Hùng", "Ngũ Hổ Tướng"],
  ["2351220143", "Đỗ Văn Hưng", "Ngũ Hổ Tướng"],
  ["2351220117", "Phạm Minh Tuấn", "Ngũ Hổ Tướng"],
  ["2351220193", "Hồ Minh Đức", "Nhóm Một"],
  ["2351220174", "Ngô Xuân Thụy", "Nhóm Một"],
  ["2351220112", "Đặng Hoàng Vũ", "Nhóm Một"],
  ["2351220208", "Trương Xuân Anh", "Nhóm Một"],
  ["2351220104", "Ngô Thanh Hải", "NTTHH"],
  ["2351220251", "Lê Đoàn Khang Huy", "NTTHH"],
  ["2351220076", "Nguyễn Ngọc", "NTTHH"],
  ["2351220098", "Ngô Huỳnh Văn Thương", "NTTHH"],
  ["2351220077", "Phan Nguyễn Đức Trung", "NTTHH"],
  ["2351220218", "Nguyễn Thái Bảo", "QBZ"],
  ["2351220204", "Trần Văn Nguyên", "QBZ"],
  ["2351220237", "Lê Phi Thường", "QBZ"],
  ["2351220220", "Nguyễn Anh Tuấn", "QBZ"],
  ["2351220239", "Mai Đức Tùng", "QBZ"],
  ["2351220159", "Nguyễn Đăng Đạt", "Thirty-six"],
  ["2351220286", "Lương Bằng Đô", "Thirty-six"],
  ["2351220165", "Hoàng Anh Quân", "Thirty-six"],
  ["2351220129", "Nguyễn Văn Thạnh", "Thirty-six"],
  ["2351220130", "Nguyễn Ngọc Tín", "Thirty-six"],
  ["2351220024", "Đoàn Duy Bình", "Vinno"],
  ["2351220038", "Hồ Quốc Cường", "Vinno"],
  ["2351220051", "Nguyễn Đức Hiếu", "Vinno"],
  ["2351220025", "Mai Hữu Phước", "Vinno"],
  ["2351220169", "Đỗ Phú Bảo Hoàng", "Xóm vắng"],
  ["2351220166", "Võ Trung Kiên", "Xóm vắng"],
  ["2351220157", "Chế Viết Phong", "Xóm vắng"],
  ["2351220200", "Đinh Phú Quý", "Xóm vắng"],
  ["2351220279", "Vũ Văn Sang", "Xóm nghỉ"],
  ["2151220261", "Nguyễn Đình Tiệp", "Xóm nghỉ"],
  ["2351220179", "Lê Văn Nam Trung", "Xóm nghỉ"],
  ["2451220011", "Lê Mạnh Tú", "Xóm nghỉ"],
];

/** Bỏ dấu tiếng Việt. Chữ đ và Đ không phân tách được nên phải thay riêng. */
function removeDiacritics(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
}

/**
 * Email theo quy tắc `<tên>_<mã sinh viên>@dau.edu.vn`.
 * Tên là từ cuối cùng trong họ tên — quy ước đặt tên tiếng Việt.
 * Ví dụ: "Hồ Minh Đức" + 2351220193 → duc_2351220193@dau.edu.vn
 */
function studentEmail(fullName: string, code: string): string {
  const given = fullName.trim().split(/\s+/).pop() ?? "";
  return `${removeDiacritics(given).toLowerCase()}_${code}@dau.edu.vn`;
}

// ===========================================================================
// TÀI LIỆU VÀ ĐOẠN VĂN
// ===========================================================================

type SeedChunk = { articleRef: string | null; page: number | null; text: string };

type SeedDocument = {
  title: string;
  docNumber: string;
  issuedDate: string;
  /// null nghia la TOAN TRUONG — moi nguoi doc duoc. Co gia tri thi chi thanh
  /// vien dung don vi do doc duoc. Khong con cot `scope` rieng: mot cot NULL
  /// duoc da mang du thong tin, hai cot la hai co hoi lech nhau.
  dept: string | null;
  uploader: string; // email
  status: DocStatus;
  pageCount: number;
  chunks: SeedChunk[];
};

const DOCUMENTS: SeedDocument[] = [
  {
    title: "Quy chế đào tạo trình độ đại học",
    docNumber: "1234/QĐ-ĐHKTĐN",
    issuedDate: "2025-08-12",
    dept: null,
    uploader: "ha.nt@dau.edu.vn",
    status: DocStatus.READY,
    pageCount: 24,
    chunks: [
      {
        articleRef: "Điều 12, Khoản 1",
        page: 8,
        text: "Sinh viên được xét công nhận tốt nghiệp khi tích lũy đủ số tín chỉ của chương trình đào tạo và điểm trung bình tích lũy đạt từ 2,00 trở lên.",
      },
      {
        articleRef: "Điều 12, Khoản 3",
        page: 8,
        text: "Sinh viên phải đạt chuẩn đầu ra ngoại ngữ bậc 3 theo Khung năng lực ngoại ngữ 6 bậc dùng cho Việt Nam và hoàn thành các học phần Giáo dục thể chất, Giáo dục quốc phòng và an ninh.",
      },
      {
        articleRef: "Điều 12, Khoản 4",
        page: 9,
        text: "Tại thời điểm xét tốt nghiệp, sinh viên không bị truy cứu trách nhiệm hình sự và không trong thời gian bị kỷ luật ở mức đình chỉ học tập.",
      },
      {
        articleRef: "Điều 10, Khoản 1",
        page: 6,
        text: "Sinh viên bị cảnh báo học vụ nếu điểm trung bình học kỳ đạt dưới 1,00 hoặc điểm trung bình tích lũy đạt dưới 1,20 đối với sinh viên năm thứ nhất.",
      },
      {
        articleRef: "Điều 10, Khoản 2",
        page: 6,
        text: "Sinh viên bị cảnh báo học vụ nếu tổng số tín chỉ chưa đạt tính từ đầu khóa học vượt quá 24 tín chỉ.",
      },
      {
        articleRef: "Điều 15, Khoản 2",
        page: 11,
        text: "Sinh viên được bảo lưu kết quả học tập tối đa 02 học kỳ liên tiếp; thời gian bảo lưu không tính vào thời gian tối đa hoàn thành chương trình đào tạo.",
      },
    ],
  },
  {
    title: "Sổ tay sinh viên 2025–2026",
    docNumber: "STSV-2025",
    issuedDate: "2025-08-02",
    dept: null,
    uploader: "ha.nt@dau.edu.vn",
    status: DocStatus.READY,
    pageCount: 48,
    chunks: [
      {
        articleRef: "Mục 4.2",
        page: 21,
        text: "Học phí học kỳ I năm học 2025–2026 nộp trước ngày 15/10/2025 qua cổng thanh toán trực tuyến của trường hoặc tại Phòng Kế hoạch – Tài chính.",
      },
    ],
  },
  {
    title: "Hướng dẫn thủ tục hành chính — Phòng Đào tạo",
    docNumber: "HD-PĐT-03",
    issuedDate: "2025-07-18",
    dept: null,
    uploader: "ha.nt@dau.edu.vn",
    status: DocStatus.READY,
    pageCount: 12,
    chunks: [
      {
        articleRef: "Mục 2.1",
        page: 3,
        text: "Đơn xin bảo lưu kết quả học tập nộp tại Phòng Đào tạo trước ngày bắt đầu học kỳ ít nhất 15 ngày, kèm xác nhận của Giáo vụ khoa và bản sao giấy tờ minh chứng.",
      },
    ],
  },
  {
    title: "Quy định về đồ án tốt nghiệp — Khoa Công nghệ Thông tin",
    docNumber: "88/QĐ-CNTT",
    issuedDate: "2026-08-20",
    dept: "CNTT",
    uploader: "hoa.tt@dau.edu.vn",
    status: DocStatus.READY,
    pageCount: 9,
    chunks: [
      {
        articleRef: "Điều 3, Khoản 1",
        page: 2,
        text: "Sinh viên được nhận đồ án tốt nghiệp khi đã tích lũy tối thiểu 105 tín chỉ và không nợ quá 02 học phần bắt buộc của chương trình.",
      },
      {
        articleRef: "Điều 5, Khoản 2",
        page: 4,
        text: "Mỗi giảng viên hướng dẫn không quá 08 sinh viên làm đồ án tốt nghiệp trong một học kỳ.",
      },
      {
        articleRef: "Điều 7, Khoản 1",
        page: 6,
        text: "Đồ án được bảo vệ trước hội đồng gồm tối thiểu 03 thành viên; đồ án đạt khi điểm trung bình của hội đồng từ 4,0 trở lên.",
      },
    ],
  },
  {
    // Tài liệu ĐỐI CHỨNG cho kiểm thử cách ly: cùng chủ đề đồ án tốt nghiệp
    // nhưng thuộc Khoa Kiến trúc, và có CON SỐ KHÁC hẳn Khoa CNTT.
    // Sinh viên CNTT hỏi về điều kiện nhận đồ án mà nhận được "90 tín chỉ"
    // tức là đã rò rỉ phạm vi.
    title: "Quy định về đồ án tốt nghiệp — Khoa Kiến trúc",
    docNumber: "77/QĐ-KTR",
    issuedDate: "2026-08-15",
    dept: "KTR",
    uploader: "bang.lv@dau.edu.vn",
    status: DocStatus.READY,
    pageCount: 7,
    chunks: [
      {
        articleRef: "Điều 4, Khoản 1",
        page: 2,
        text: "Sinh viên được nhận đồ án tốt nghiệp khi đã tích lũy tối thiểu 90 tín chỉ và hoàn thành toàn bộ học phần thực tập công trình.",
      },
      {
        articleRef: "Điều 6, Khoản 3",
        page: 5,
        text: "Đồ án tốt nghiệp ngành Kỹ thuật xây dựng phải có bản vẽ kỹ thuật kèm thuyết minh tính toán kết cấu được giảng viên hướng dẫn ký xác nhận.",
      },
    ],
  },
  {
    // Trạng thái đang xử lý — do CONTRIBUTOR đề xuất, chờ EDITOR duyệt.
    // Minh họa luồng duyệt và trạng thái tiến trình trên giao diện.
    title: "Đề cương chi tiết học phần Kỹ thuật lập trình",
    docNumber: "ĐC-IT2030",
    issuedDate: "2026-08-22",
    dept: "CNTT",
    uploader: "khoa.da@dau.edu.vn",
    status: DocStatus.PROCESSING,
    pageCount: 6,
    chunks: [],
  },
  {
    // Trạng thái lỗi — minh họa tài liệu là bản scan, không trích được văn bản.
    title: "Quy định thực tập doanh nghiệp — Khoa Công nghệ Thông tin",
    docNumber: "91/QĐ-CNTT",
    issuedDate: "2026-08-21",
    dept: "CNTT",
    uploader: "hoa.tt@dau.edu.vn",
    status: DocStatus.FAILED,
    pageCount: 4,
    chunks: [],
  },
];

// ===========================================================================
// CHẠY SEED
// ===========================================================================

// ===========================================================================
// NẠP DỮ LIỆU
//
// Chạy lại được nhiều lần, không nhân bản dữ liệu: mọi thao tác đều là upsert
// theo một khóa tự nhiên ổn định (`code`, `email`, `file_hash`).
//
// Vì hệ thống KHÔNG có chức năng đăng ký, seed là cách DUY NHẤT để có tài khoản
// mà demo. Seed hỏng thì không ai đăng nhập được, kể cả SYSTEM_ADMIN — vì vậy nó phải
// nằm trong CI.
// ===========================================================================

async function main() {
  console.log("Bắt đầu nạp dữ liệu mồi\n");

  // --- Đơn vị ---------------------------------------------------------------
  const deptId = new Map<string, string>();
  for (const d of DEPARTMENTS) {
    const row = await prisma.department.upsert({
      where: { code: d.code },
      update: { name: d.name, type: d.type },
      create: d,
    });
    deptId.set(d.code, row.id);
  }
  console.log(`  Đơn vị:      ${DEPARTMENTS.length}`);

  // --- Cán bộ ---------------------------------------------------------------
  const userId = new Map<string, string>();

  /** Tạo người dùng rồi gắn vào đúng đơn vị với đúng vai. */
  async function upsertNguoiDung(
    code: string,
    email: string,
    fullName: string,
    role: MemberRole,
    deptCode: string,
    password: string,
  ): Promise<void> {
    const departmentId = deptId.get(deptCode);
    if (!departmentId) throw new Error(`Không tìm thấy đơn vị ${deptCode} cho ${email}`);

    // Chuẩn hóa GIỐNG HỆT tầng xác thực: email chữ thường, mã chữ hoa. Lệch một
    // chỗ thôi là tài khoản seed không đăng nhập được, mà lỗi lại báo "sai mật
    // khẩu" nên rất khó lần ra.
    const emailChuan = email.trim().toLowerCase();
    const codeChuan = code.trim().toUpperCase();
    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.upsert({
      where: { email: emailChuan },
      update: { fullName, code: codeChuan, passwordHash, isActive: true },
      create: { email: emailChuan, code: codeChuan, fullName, passwordHash },
    });
    userId.set(emailChuan, user.id);

    // Quan hệ nhiều–nhiều: đây mới là chỗ quyết định phạm vi nhìn thấy.
    await prisma.departmentMember.upsert({
      where: { userId_departmentId: { userId: user.id, departmentId } },
      update: { role },
      create: { userId: user.id, departmentId, role },
    });
  }

  for (const u of USERS) {
    await upsertNguoiDung(u.code, u.email, u.fullName, u.role, u.dept, STAFF_SEED_PASSWORD);
  }
  console.log(`  Cán bộ:      ${USERS.length}`);

  // --- Sinh viên ------------------------------------------------------------
  const demSinhVien = new Map<string, number>();
  for (const [code, fullName, group] of STUDENTS) {
    const deptCode = groupToDepartment.get(group);
    if (!deptCode) throw new Error(`Nhóm "${group}" chưa được gán khoa`);
    await upsertNguoiDung(
      code,
      studentEmail(fullName, code),
      fullName,
      MemberRole.USER,
      deptCode,
      code,
    );
    demSinhVien.set(deptCode, (demSinhVien.get(deptCode) ?? 0) + 1);
  }
  const phanBo = [...demSinhVien.entries()].map(([k, v]) => `${k} ${v}`).join(" · ");
  console.log(`  Sinh viên:   ${STUDENTS.length}  (${phanBo})`);

  // --- Tài liệu và đoạn văn -------------------------------------------------
  let soDoan = 0;
  for (const doc of DOCUMENTS.filter((d) => d.dept === null || d.dept === "CNTT")) {
    const departmentId = doc.dept ? (deptId.get(doc.dept) ?? null) : null;
    if (doc.dept && !departmentId) throw new Error(`Không tìm thấy đơn vị ${doc.dept}`);

    const uploadedById = userId.get(doc.uploader.toLowerCase());
    if (!uploadedById) throw new Error(`Không tìm thấy người tải lên ${doc.uploader}`);

    // Khóa tự nhiên để chạy lại không nhân bản. Ở hệ thống thật đây là SHA-256
    // của chính file; ở đây chưa có file nên băm số hiệu văn bản.
    const fileHash = sha256(`seed:${doc.docNumber}`);

    const chung = {
      title: doc.title,
      departmentId,
      visibility: 1,
      sourceType: "PDF",
      filePath: `seed/${doc.docNumber.replace(/[^\w.-]/g, "_")}.pdf`,
      pageCount: doc.pageCount,
      status: doc.status,
      uploadedById,
    };

    const document = await prisma.document.upsert({
      where: { fileHash },
      update: chung,
      create: { ...chung, fileHash },
    });

    // UPSERT theo `(document_id, chunk_index)`, KHÔNG xóa rồi tạo lại.
    //
    // ────────────────────────────────────────────────────────────────────────
    // VÌ SAO ĐIỀU NÀY QUAN TRỌNG, chứ không chỉ là chuyện gọn gàng.
    //
    // `eval_gold_chunks.chunk_id` có `ON DELETE CASCADE`. Xóa đoạn văn là xóa
    // luôn mọi liên kết câu hỏi vàng ↔ đoạn đáp án, KHÔNG BÁO GÌ. Nghĩa là mỗi
    // lần chạy lại `db:seed` sẽ thổi bay công gán bộ câu hỏi vàng, và người chạy
    // chỉ phát hiện khi recall đột ngột về 0.
    //
    // `chunk_index` LÀ khóa ổn định — lược đồ có sẵn `@@unique([documentId,
    // chunkIndex])`. Upsert theo nó giữ nguyên `id` của đoạn văn qua các lần
    // chạy, nên liên kết câu hỏi vàng sống sót.
    // ────────────────────────────────────────────────────────────────────────
    for (const [i, c] of doc.chunks.entries()) {
      const noiDung = {
        content: c.text,
        contentHash: sha256(c.text),
        headingPath: c.articleRef,
        pageFrom: c.page,
        pageTo: c.page,
        tokenCount: estimateTokens(c.text),
        // LẶP từ documents — cho phép lọc phạm vi TRƯỚC khi xếp hạng.
        departmentId,
        visibility: 1,
      };
      await prisma.chunk.upsert({
        where: { documentId_chunkIndex: { documentId: document.id, chunkIndex: i } },
        update: noiDung,
        create: { documentId: document.id, chunkIndex: i, ...noiDung },
      });
      soDoan++;
    }

    // Lần seed này có ÍT đoạn hơn lần trước thì dọn phần thừa ở đuôi. Chỉ những
    // đoạn thật sự không còn tồn tại mới bị xóa.
    await prisma.chunk.deleteMany({
      where: { documentId: document.id, chunkIndex: { gte: doc.chunks.length } },
    });
  }
  console.log(`  Tài liệu:    ${DOCUMENTS.filter((d) => d.dept === null || d.dept === "CNTT").length}`);
  console.log(`  Đoạn văn:    ${soDoan}`);

  // --- Bộ câu hỏi vàng ------------------------------------------------------
  // Mới tạo bộ rỗng để bảng tồn tại và `eval` có chỗ ghi vào. Ba mươi câu hỏi
  // thật thuộc Sprint 4.
  await prisma.evalSet.upsert({
    where: { name: "cntt-v1" },
    update: {},
    create: {
      name: "cntt-v1",
      description: "Bộ câu hỏi vàng để đo recall@k và MRR. Sẽ điền ở Sprint 4.",
    },
  });

  console.log("\nPhạm vi demo: sinh viên CNTT; tài liệu CNTT và quy định chung.");
  console.log("Vai: USER · CONTENT_ADMIN (CB0142) · SYSTEM_ADMIN (CB0006).");

}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

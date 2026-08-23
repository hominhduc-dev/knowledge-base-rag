/**
 * Dữ liệu mồi cho Tàng Thư.
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
import {
  PrismaClient,
  Role,
  DepartmentType,
  DocumentScope,
  ProcessingStatus,
  ApprovalStatus,
} from "@prisma/client";
import bcrypt from "bcryptjs";
import { createHash } from "node:crypto";

const prisma = new PrismaClient();

/** Mật khẩu dùng chung cho mọi tài khoản mồi. Ghi rõ trong README để tiện chấm. */
const SEED_PASSWORD = process.env.SEED_PASSWORD ?? "Tangthu@123";

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
/** Ước lượng thô số token tiếng Việt, đủ dùng cho dữ liệu mồi. */
const estimateTokens = (s: string) => Math.ceil(s.length / 3.5);

// ===========================================================================
// ĐƠN VỊ
// ===========================================================================

const DEPARTMENTS = [
  { code: "CNTT", name: "Khoa Công nghệ Thông tin", type: DepartmentType.KHOA },
  { code: "KTR", name: "Khoa Kiến trúc", type: DepartmentType.KHOA },
  { code: "XD", name: "Khoa Xây dựng", type: DepartmentType.KHOA },
  { code: "PDT", name: "Phòng Đào tạo", type: DepartmentType.PHONG_BAN },
  { code: "CTSV", name: "Phòng Công tác Sinh viên", type: DepartmentType.PHONG_BAN },
];

// ===========================================================================
// NGƯỜI DÙNG
//
// Bố trí có chủ đích để kiểm thử cách ly phạm vi theo CẢ HAI CHIỀU:
// sinh viên CNTT và sinh viên Xây dựng, giáo vụ CNTT và giáo vụ Xây dựng.
// Chỉ một chiều thì bộ kiểm thử có thể xanh trong khi vẫn rò rỉ chiều ngược lại.
//
// `code` là mã số sinh viên với VIEWER, mã cán bộ với các vai còn lại.
// Đăng nhập được bằng mã hoặc email, cùng một mật khẩu.
// ===========================================================================

const USERS = [
  { code: "CB0231", email: "khoa.da@dau.edu.vn", fullName: "Đỗ Anh Khoa", role: Role.CONTRIBUTOR, dept: "CNTT" },
  { code: "CB0142", email: "hoa.tt@dau.edu.vn", fullName: "Trần Thị Hoà", role: Role.EDITOR, dept: "CNTT" },
  { code: "CB0388", email: "dat.pq@dau.edu.vn", fullName: "Phạm Quốc Đạt", role: Role.EDITOR, dept: "XD" },
  { code: "CB0205", email: "bang.lv@dau.edu.vn", fullName: "Lê Văn Bằng", role: Role.EDITOR, dept: "KTR" },
  { code: "CB0417", email: "nam.vd@dau.edu.vn", fullName: "Vũ Đình Nam", role: Role.EDITOR, dept: "CTSV" },
  { code: "CB0006", email: "ha.nt@dau.edu.vn", fullName: "Nguyễn Thu Hà", role: Role.ADMIN, dept: "PDT" },
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
const STUDENT_DEPARTMENTS = ["CNTT", "KTR", "XD"];

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
  scope: DocumentScope;
  dept: string | null; // null khi scope = GLOBAL
  uploader: string; // email
  processing: ProcessingStatus;
  approval: ApprovalStatus;
  pageCount: number;
  chunks: SeedChunk[];
};

const DOCUMENTS: SeedDocument[] = [
  {
    title: "Quy chế đào tạo trình độ đại học",
    docNumber: "1234/QĐ-ĐHKTĐN",
    issuedDate: "2025-08-12",
    scope: DocumentScope.GLOBAL,
    dept: null,
    uploader: "ha.nt@dau.edu.vn",
    processing: ProcessingStatus.READY,
    approval: ApprovalStatus.APPROVED,
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
    scope: DocumentScope.GLOBAL,
    dept: null,
    uploader: "ha.nt@dau.edu.vn",
    processing: ProcessingStatus.READY,
    approval: ApprovalStatus.APPROVED,
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
    scope: DocumentScope.GLOBAL,
    dept: null,
    uploader: "ha.nt@dau.edu.vn",
    processing: ProcessingStatus.READY,
    approval: ApprovalStatus.APPROVED,
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
    scope: DocumentScope.DEPARTMENT,
    dept: "CNTT",
    uploader: "hoa.tt@dau.edu.vn",
    processing: ProcessingStatus.READY,
    approval: ApprovalStatus.APPROVED,
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
    // nhưng thuộc Khoa Xây dựng, và có CON SỐ KHÁC hẳn Khoa CNTT.
    // Sinh viên CNTT hỏi về điều kiện nhận đồ án mà nhận được "90 tín chỉ"
    // tức là đã rò rỉ phạm vi.
    title: "Quy định về đồ án tốt nghiệp — Khoa Xây dựng",
    docNumber: "77/QĐ-XD",
    issuedDate: "2026-08-15",
    scope: DocumentScope.DEPARTMENT,
    dept: "XD",
    uploader: "dat.pq@dau.edu.vn",
    processing: ProcessingStatus.READY,
    approval: ApprovalStatus.APPROVED,
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
    scope: DocumentScope.DEPARTMENT,
    dept: "CNTT",
    uploader: "khoa.da@dau.edu.vn",
    processing: ProcessingStatus.PROCESSING,
    approval: ApprovalStatus.PROPOSED,
    pageCount: 6,
    chunks: [],
  },
  {
    // Trạng thái lỗi — minh họa tài liệu là bản scan, không trích được văn bản.
    title: "Quy định thực tập doanh nghiệp — Khoa Công nghệ Thông tin",
    docNumber: "91/QĐ-CNTT",
    issuedDate: "2026-08-21",
    scope: DocumentScope.DEPARTMENT,
    dept: "CNTT",
    uploader: "hoa.tt@dau.edu.vn",
    processing: ProcessingStatus.FAILED,
    approval: ApprovalStatus.APPROVED,
    pageCount: 4,
    chunks: [],
  },
];

// ===========================================================================
// CHẠY SEED
// ===========================================================================

async function main() {
  console.log("Bắt đầu nạp dữ liệu mồi\n");

  // --- Đơn vị ---
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

  // --- Người dùng ---
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);
  const userId = new Map<string, string>();
  for (const u of USERS) {
    const departmentId = deptId.get(u.dept);
    if (!departmentId) throw new Error(`Không tìm thấy đơn vị ${u.dept} cho ${u.email}`);
    // Chuẩn hóa giống hệt tầng xác thực sẽ làm: email chữ thường, mã chữ hoa.
    const email = u.email.trim().toLowerCase();
    const code = u.code.trim().toUpperCase();
    const row = await prisma.user.upsert({
      where: { email },
      // Cập nhật lại mật khẩu để chạy seed lần nữa là khôi phục được quyền vào hệ thống
      update: { code, fullName: u.fullName, role: u.role, departmentId, passwordHash, isActive: true },
      create: { code, email, fullName: u.fullName, role: u.role, departmentId, passwordHash },
    });
    userId.set(u.email, row.id);
  }
  console.log(`  Cán bộ:      ${USERS.length}`);

  // --- Sinh viên ---
  const perDepartment = new Map<string, number>();
  for (const [code, fullName, group] of STUDENTS) {
    const deptCode = groupToDepartment.get(group);
    if (!deptCode) throw new Error(`Nhóm "${group}" chưa được gán khoa`);
    const departmentId = deptId.get(deptCode);
    if (!departmentId) throw new Error(`Không tìm thấy đơn vị ${deptCode}`);

    const email = studentEmail(fullName, code);
    await prisma.user.upsert({
      where: { email },
      update: { code, fullName, role: Role.VIEWER, departmentId, passwordHash, isActive: true },
      create: { code, email, fullName, role: Role.VIEWER, departmentId, passwordHash },
    });
    perDepartment.set(deptCode, (perDepartment.get(deptCode) ?? 0) + 1);
  }
  const byDept = [...perDepartment].map(([d, n]) => `${d} ${n}`).join(" · ");
  console.log(`  Sinh viên:   ${STUDENTS.length}  (${byDept})`);

  // --- Tài liệu và đoạn văn ---
  let chunkTotal = 0;
  for (const doc of DOCUMENTS) {
    const departmentId = doc.dept ? deptId.get(doc.dept)! : null;
    const uploadedById = userId.get(doc.uploader);
    if (!uploadedById) throw new Error(`Không tìm thấy người tải lên ${doc.uploader}`);

    // Băm theo số hiệu để chạy lại seed không tạo bản ghi trùng.
    const contentHash = sha256(`seed:${doc.docNumber}`);
    const isApproved = doc.approval === ApprovalStatus.APPROVED;

    const common = {
      title: doc.title,
      docNumber: doc.docNumber,
      issuedDate: new Date(doc.issuedDate),
      scope: doc.scope,
      departmentId,
      // File thật chưa có trên Supabase Storage. Đường dẫn này là chỗ giữ chỗ;
      // bấm mở tài liệu gốc sẽ lỗi cho tới khi có luồng tải lên thật.
      storagePath: `seed/${doc.docNumber.replace(/\//g, "-")}.pdf`,
      mimeType: "application/pdf",
      fileSize: 1024 * 512,
      pageCount: doc.pageCount,
      processingStatus: doc.processing,
      approvalStatus: doc.approval,
      uploadedById,
      // Ràng buộc documents_approved_ck: đã duyệt thì bắt buộc có người duyệt
      // và thời điểm duyệt.
      approvedById: isApproved ? uploadedById : null,
      approvedAt: isApproved ? new Date(doc.issuedDate) : null,
    };

    const row = await prisma.document.upsert({
      where: { contentHash },
      update: common,
      create: { ...common, contentHash },
    });

    // Ghi lại toàn bộ đoạn văn của tài liệu này để chạy lại seed không nhân bản.
    await prisma.chunk.deleteMany({ where: { documentId: row.id } });

    if (doc.chunks.length > 0) {
      await prisma.chunk.createMany({
        data: doc.chunks.map((c, i) => ({
          documentId: row.id,
          // Sao chép phạm vi từ tài liệu xuống đoạn văn — đây là chỗ thực hiện
          // việc lặp cột có chủ đích, và là điều kiện để lọc TRƯỚC khi xếp hạng.
          departmentId,
          scope: doc.scope,
          chunkIndex: i,
          content: c.text,
          tokenCount: estimateTokens(c.text),
          page: c.page,
          articleRef: c.articleRef,
          contentHash: sha256(c.text),
        })),
      });
      chunkTotal += doc.chunks.length;
    }
  }
  console.log(`  Tài liệu:    ${DOCUMENTS.length}`);
  console.log(`  Đoạn văn:    ${chunkTotal}  (chưa có vector nhúng)\n`);

  // --- Tóm tắt tài khoản ---
  console.log(`Mật khẩu chung: ${SEED_PASSWORD}\n`);
  const rows = await prisma.user.findMany({
    include: { department: true },
    orderBy: [{ role: "asc" }, { email: "asc" }],
  });
  console.log("Cán bộ:");
  console.log(`  ${"VAI".padEnd(12)} ${"MÃ".padEnd(12)} ${"EMAIL".padEnd(30)} ĐƠN VỊ`);
  for (const u of rows.filter((r) => r.role !== Role.VIEWER)) {
    console.log(
      `  ${u.role.padEnd(12)} ${(u.code ?? "—").padEnd(12)} ${u.email.padEnd(30)} ${u.department.name}`,
    );
  }

  console.log("\nMột vài sinh viên để đăng nhập thử:");
  const samples = ["2351220193", "2351220208", "2351220221", "2351220145"];
  for (const u of rows.filter((r) => r.code && samples.includes(r.code))) {
    console.log(`  ${(u.code ?? "").padEnd(12)} ${u.email.padEnd(30)} ${u.fullName} · ${u.department.name}`);
  }

  console.log("\nĐăng nhập được bằng mã HOẶC email, cùng mật khẩu trên.");

  console.log("\nGợi ý kiểm thử cách ly phạm vi — hỏi 'điều kiện nhận đồ án tốt nghiệp':");
  console.log("  2351220193 Hồ Minh Đức (CNTT)          → phải thấy 105 tín chỉ");
  console.log("  2351220145 Phùng Thị Thanh Huyền (XD)  → phải thấy 90 tín chỉ");
  console.log("  Nếu ai đó nhận được con số của khoa kia, cách ly phạm vi đã rò rỉ.\n");
}

main()
  .catch((e) => {
    console.error("\nSeed thất bại:", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

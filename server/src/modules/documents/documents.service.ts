// ---------------------------------------------------------------------------
// Tài liệu — docs/api-contract.md mục 6.
//
// MỌI truy vấn ở đây đều bắt đầu bằng điều kiện lọc lấy từ `lib/scope.ts`. Đó là
// nơi DUY NHẤT biết quy tắc phạm vi; viết lại quy tắc ở file này là tạo một bản
// sao sẽ lệch đi theo thời gian, và bản lệch đó chính là chỗ rò rỉ.
// ---------------------------------------------------------------------------
import { Prisma } from "@prisma/client";
import type { DocStatus } from "@prisma/client";
import { prisma } from "../../config/prisma.js";
import { forbiddenScope, notFound, validationError } from "../../lib/errors.js";
import { scopeWhere, documentWriteWhere } from "../../lib/scope.js";
import { assertContentAdmin, canManageContent, PROGRAM_CODE } from "../../lib/roles.js";
import type { AuthenticatedUser } from "../../types/express.js";
import { buildLocator } from "../retrieval/index.js";
import { duongDanLuu, luuTep, sha256, xoaTep } from "./documents.storage.js";
import type { CreateInput, ListQuery, UpdateInput } from "./documents.schema.js";

const NHAN_TOAN_TRUONG = "Toàn trường";

export type KnowledgeDocument = {
  id: string;
  name: string;
  unit: string;
  status: Lowercase<DocStatus>;
  chunks: number;
  updated: string;
  isGlobal: boolean;
  canEdit: boolean;
};

const CHON_DANH_SACH = {
  id: true,
  title: true,
  status: true,
  departmentId: true,
  updatedAt: true,
  department: { select: { name: true } },
  _count: { select: { chunks: true } },
} as const;

type HangDanhSach = Prisma.DocumentGetPayload<{ select: typeof CHON_DANH_SACH }>;

function toDto(row: HangDanhSach, user: AuthenticatedUser): KnowledgeDocument {
  return {
    id: row.id,
    name: row.title,
    unit: row.department?.name ?? NHAN_TOAN_TRUONG,
    status: row.status.toLowerCase() as Lowercase<DocStatus>,
    chunks: row._count.chunks,
    updated: row.updatedAt.toISOString(),
    isGlobal: row.departmentId === null,
    // Backend quyết định quyền sửa từ vai đã xác thực.
    canEdit: canManageContent(user.role),
  };
}

// ===========================================================================
// ĐỌC
// ===========================================================================

export async function list(
  query: ListQuery,
  user: AuthenticatedUser,
): Promise<{ items: KnowledgeDocument[]; total: number; page: number; pageSize: number }> {
  const dieuKien: Prisma.DocumentWhereInput[] = [scopeWhere(user)];

  // Bộ lọc của người dùng nằm TRONG phạm vi đã cho phép, không thay thế nó. Đây
  // là chỗ dễ sai nhất: viết `where: { departmentId: ... }` đè lên `scopeWhere`
  // là mở toang phạm vi mà mọi thứ trông vẫn chạy đúng.
  if (query.scope === "global") dieuKien.push({ departmentId: null });
  if (query.scope === "department") dieuKien.push({ departmentId: { not: null } });
  if (query.status) dieuKien.push({ status: query.status.toUpperCase() as DocStatus });
  if (query.q) dieuKien.push({ title: { contains: query.q, mode: "insensitive" } });

  const where: Prisma.DocumentWhereInput = { AND: dieuKien };

  const [rows, total] = await Promise.all([
    prisma.document.findMany({
      where,
      select: CHON_DANH_SACH,
      orderBy: { updatedAt: "desc" },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.document.count({ where }),
  ]);

  return {
    items: rows.map((r) => toDto(r, user)),
    total,
    page: query.page,
    pageSize: query.pageSize,
  };
}

/**
 * Tìm một tài liệu TRONG phạm vi của người gọi.
 *
 * Phân biệt hai tình huống, đúng contract mục 2:
 *   - không tồn tại       → 404 NOT_FOUND
 *   - tồn tại, khác đơn vị → 403 FORBIDDEN_SCOPE
 *
 * Được phép trả 403 ở đây vì người gọi đã có `id` trong tay — họ vốn biết tài
 * liệu đó tồn tại. Endpoint LIỆT KÊ thì không bao giờ trả 403, vì như vậy là
 * tiết lộ có tồn tại tài liệu mà lẽ ra họ không được biết.
 */
async function timTrongPhamVi(id: string, user: AuthenticatedUser) {
  const doc = await prisma.document.findUnique({
    where: { id },
    select: {
      ...CHON_DANH_SACH,
      visibility: true,
      sourceType: true,
      filePath: true,
      fileHash: true,
      pageCount: true,
      errorMessage: true,
      createdAt: true,
      uploadedBy: { select: { fullName: true, email: true } },
    },
  });
  if (!doc) throw notFound("Không tìm thấy tài liệu");

  const trongPhamVi = await prisma.document.findFirst({
    where: { AND: [{ id }, scopeWhere(user)] },
    select: { id: true },
  });
  if (!trongPhamVi) throw forbiddenScope();

  return doc;
}

export async function get(id: string, user: AuthenticatedUser) {
  const doc = await timTrongPhamVi(id, user);
  const job = await prisma.ingestJob.findFirst({
    where: { documentId: id },
    orderBy: { createdAt: "desc" },
    select: { status: true, retryCount: true, lastError: true, finishedAt: true },
  });

  return {
    document: {
      ...toDto(doc, user),
      sourceType: doc.sourceType,
      pageCount: doc.pageCount,
      createdAt: doc.createdAt.toISOString(),
      uploadedBy: doc.uploadedBy.fullName,
      errorMessage: doc.errorMessage,
    },
    chunkCount: doc._count.chunks,
    job,
  };
}

export async function listChunks(
  id: string,
  query: { page: number; pageSize: number },
  user: AuthenticatedUser,
) {
  // Kiểm phạm vi qua tài liệu cha trước. Đoạn văn cũng mang `departmentId` riêng
  // nhưng đi qua cha cho thông báo lỗi đúng: 404 khi tài liệu không có, 403 khi
  // nó thuộc đơn vị khác.
  await timTrongPhamVi(id, user);

  const [rows, total] = await Promise.all([
    prisma.chunk.findMany({
      where: { documentId: id },
      orderBy: { chunkIndex: "asc" },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      select: {
        id: true,
        chunkIndex: true,
        content: true,
        headingPath: true,
        pageFrom: true,
        pageTo: true,
      },
    }),
    prisma.chunk.count({ where: { documentId: id } }),
  ]);

  return {
    items: rows.map((c) => ({
      id: c.id,
      index: c.chunkIndex,
      text: c.content,
      headingPath: c.headingPath,
      pageFrom: c.pageFrom,
      pageTo: c.pageTo,
      locator: buildLocator(c.headingPath, c.pageFrom),
    })),
    total,
  };
}

export async function getStatus(id: string, user: AuthenticatedUser) {
  const doc = await timTrongPhamVi(id, user);
  const job = await prisma.ingestJob.findFirst({
    where: { documentId: id },
    orderBy: { createdAt: "desc" },
    select: { status: true, lastError: true },
  });

  const status = doc.status.toLowerCase() as Lowercase<DocStatus>;
  const phase = status === "pending" ? "upload" : status === "ready" ? "done" : "process";
  // Không có tiến độ thật vì worker xử lý cả tài liệu trong một lượt. Ba mốc rời
  // rạc còn hơn một con số bịa chạy đều đặn nhưng không phản ánh gì.
  const progress = status === "ready" ? 100 : status === "processing" ? 60 : status === "failed" ? 0 : 10;

  return {
    status,
    phase,
    progress,
    chunks: doc._count.chunks,
    error: doc.errorMessage ?? job?.lastError ?? null,
  };
}

/** Trả nội dung tệp gốc — controller lo phần truyền. */
export async function getFile(id: string, user: AuthenticatedUser) {
  const doc = await timTrongPhamVi(id, user);
  return {
    filePath: doc.filePath,
    sourceType: doc.sourceType,
    fileName: `${doc.title.replace(/[^\p{L}\p{N} ._-]/gu, "_").slice(0, 120)}.${
      doc.sourceType === "DOCX" ? "docx" : "pdf"
    }`,
  };
}

// ===========================================================================
// GHI — CONTENT_ADMIN và SYSTEM_ADMIN; service vẫn kiểm vai và phạm vi
// ===========================================================================

async function assertDocumentTarget(departmentId: string | null | undefined) {
  if (departmentId == null) return;
  const department = await prisma.department.findFirst({
    where: { id: departmentId, code: PROGRAM_CODE }, select: { id: true },
  });
  if (!department) throw forbiddenScope("Chỉ nhận tài liệu ngành CNTT hoặc quy định chung áp dụng cho sinh viên CNTT.");
}

async function timDeQuanLy(id: string, user: AuthenticatedUser) {
  assertContentAdmin(user);
  return timTrongPhamVi(id, user);
}

export async function create(
  file: Express.Multer.File,
  sourceType: "PDF" | "DOCX",
  input: CreateInput,
  user: AuthenticatedUser,
): Promise<{ documentId: string; status: string; jobId: string }> {
  assertContentAdmin(user);
  await assertDocumentTarget(input.departmentId);
  if (input.departmentId) {
    const ton = await prisma.department.findUnique({
      where: { id: input.departmentId },
      select: { id: true },
    });
    if (!ton) throw validationError("Đơn vị không tồn tại");
  }

  const fileHash = sha256(file.buffer);

  // Khử trùng lặp ở TẦNG TÀI LIỆU: cùng nội dung thì không xử lý lại. Tiết kiệm
  // cả lượt trích văn bản lẫn lượt gọi API nhúng sau này.
  const trung = await prisma.document.findUnique({
    where: { fileHash },
    select: { id: true },
  });
  if (trung) {
    throw new (await import("../../lib/errors.js")).AppError(
      "DUPLICATE_DOCUMENT",
      "Tệp này đã tồn tại trong hệ thống. Liên hệ quản trị nếu cần kiểm tra tài liệu.",
    );
  }

  const filePath = duongDanLuu(fileHash, sourceType);
  await luuTep(file.buffer, filePath);

  // Tạo tài liệu và job trong MỘT transaction. Tách ra thì một lần lỗi giữa
  // chừng để lại tài liệu PENDING vĩnh viễn, không worker nào nhặt.
  const { document, job } = await prisma.$transaction(async (tx) => {
    const document = await tx.document.create({
      data: {
        title: input.title,
        departmentId: input.departmentId ?? null,
        visibility: 1,
        sourceType,
        filePath,
        fileHash,
        status: "PENDING",
        uploadedById: user.id,
      },
      select: { id: true, status: true },
    });
    const job = await tx.ingestJob.create({
      data: { documentId: document.id },
      select: { id: true },
    });
    return { document, job };
  });

  return { documentId: document.id, status: document.status.toLowerCase(), jobId: job.id };
}

export async function update(id: string, input: UpdateInput, user: AuthenticatedUser) {
  await timDeQuanLy(id, user);
  await assertDocumentTarget(input.departmentId);

  if (input.departmentId) {
    const ton = await prisma.department.findUnique({
      where: { id: input.departmentId },
      select: { id: true },
    });
    if (!ton) throw validationError("Đơn vị không tồn tại");
  }

  // Đổi `departmentId` sẽ tự đồng bộ xuống `chunks` nhờ trigger
  // `documents_sync_chunk_scope` trong cơ sở dữ liệu — KHÔNG cập nhật tay ở đây.
  // Xem docs/erd.md mục 2.1.
  const row = await prisma.document.update({
    where: { id, AND: [documentWriteWhere(user)] },
    data: {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.departmentId !== undefined ? { departmentId: input.departmentId } : {}),
    },
    select: CHON_DANH_SACH,
  });

  return toDto(row, user);
}

export async function remove(id: string, user: AuthenticatedUser): Promise<void> {
  const doc = await timDeQuanLy(id, user);

  // Xóa cứng. Lược đồ v2 không có cột `deletedAt`, và lịch sử hội thoại vẫn an
  // toàn: `message_citations.document_id` dùng ON DELETE SET NULL nên trích dẫn
  // cũ vẫn hiển thị được, chỉ mất đường mở tệp. Xem docs/erd.md mục 4.
  await prisma.document.delete({ where: { id, AND: [documentWriteWhere(user)] } });

  // Xóa tệp SAU khi bản ghi đã đi. Ngược lại thì một lần lỗi ở bước xóa bản ghi
  // để lại tài liệu trỏ vào tệp không còn tồn tại.
  //
  // Chỉ xóa khi không còn tài liệu nào dùng chung tệp đó — `fileHash` là UNIQUE
  // nên hiện tại luôn đúng, nhưng kiểm vẫn rẻ.
  const conDung = await prisma.document.count({ where: { fileHash: doc.fileHash } });
  if (conDung === 0) await xoaTep(doc.filePath);
}

export async function retry(id: string, user: AuthenticatedUser): Promise<{ jobId: string }> {
  const doc = await timDeQuanLy(id, user);
  if (doc.status !== "FAILED") {
    throw validationError(
      `Chỉ chạy lại được tài liệu ở trạng thái failed; tài liệu này đang ở ${doc.status.toLowerCase()}.`,
    );
  }

  const { job } = await prisma.$transaction(async (tx) => {
    await tx.document.update({
      where: { id, status: "FAILED", AND: [documentWriteWhere(user)] },
      data: { status: "PENDING", errorMessage: null },
    });
    // Job MỚI, không đặt lại job cũ: giữ được lịch sử đã thử bao nhiêu lần và
    // lỗi gì, thứ cần khi tìm nguyên nhân một tài liệu liên tục thất bại.
    const job = await tx.ingestJob.create({
      data: { documentId: id },
      select: { id: true },
    });
    return { job };
  });

  return { jobId: job.id };
}

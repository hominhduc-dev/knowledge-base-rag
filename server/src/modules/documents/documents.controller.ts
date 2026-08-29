// ---------------------------------------------------------------------------
// Controller cho /documents/*. Parse, gọi service, trả về. Không có logic
// nghiệp vụ và KHÔNG kiểm phạm vi ở đây — phạm vi nằm trong truy vấn.
// ---------------------------------------------------------------------------
import type { Request, Response } from "express";
import { ok } from "../../lib/http.js";
import { validationError } from "../../lib/errors.js";
import { currentUser } from "../../middleware/auth.middleware.js";
import { loaiTepTu } from "../../middleware/upload.middleware.js";
import {
  chunkQuerySchema,
  createSchema,
  documentIdParam,
  fileQuerySchema,
  listQuerySchema,
  updateSchema,
} from "./documents.schema.js";
import { docTep } from "./documents.storage.js";
import * as service from "./documents.service.js";

/** GET /documents */
export async function list(req: Request, res: Response): Promise<void> {
  const query = listQuerySchema.parse(req.query);
  ok(res, await service.list(query, currentUser(req)));
}

/** GET /documents/:id */
export async function get(req: Request, res: Response): Promise<void> {
  const { id } = documentIdParam.parse(req.params);
  ok(res, await service.get(id, currentUser(req)));
}

/** GET /documents/:id/chunks */
export async function listChunks(req: Request, res: Response): Promise<void> {
  const { id } = documentIdParam.parse(req.params);
  const query = chunkQuerySchema.parse(req.query);
  ok(res, await service.listChunks(id, query, currentUser(req)));
}

/** GET /documents/:id/status */
export async function getStatus(req: Request, res: Response): Promise<void> {
  const { id } = documentIdParam.parse(req.params);
  ok(res, await service.getStatus(id, currentUser(req)));
}

/**
 * GET /documents/:id/file
 *
 * Truyền thẳng nội dung, KHÔNG trả URL. Tệp nằm trong volume `uploads` và thư
 * mục đó không được phục vụ tĩnh — đây là chỗ duy nhất đọc được nó, sau khi đã
 * kiểm phạm vi.
 */
export async function getFile(req: Request, res: Response): Promise<void> {
  const { id } = documentIdParam.parse(req.params);
  fileQuerySchema.parse(req.query); // `?page=` để frontend nối #page=N, không dùng ở đây
  const { filePath, sourceType, fileName } = await service.getFile(id, currentUser(req));
  const buffer = await docTep(filePath);

  res.setHeader(
    "Content-Type",
    sourceType === "DOCX"
      ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      : "application/pdf",
  );
  // `inline` để trình duyệt mở ngay trong tab, giữ được `#page=N`.
  // Tên tệp mã hóa theo RFC 5987 vì tiêu đề tiếng Việt có dấu.
  res.setHeader(
    "Content-Disposition",
    `inline; filename*=UTF-8''${encodeURIComponent(fileName)}`,
  );
  res.setHeader("Content-Length", String(buffer.length));
  // Tài liệu thuộc phạm vi riêng của từng người — không cho proxy nào cache.
  res.setHeader("Cache-Control", "private, no-store");
  res.end(buffer);
}

/** POST /documents — ADMIN */
export async function create(req: Request, res: Response): Promise<void> {
  const file = req.file;
  if (!file) throw validationError('Thiếu tệp. Gửi bằng multipart/form-data ở trường "file".');

  const sourceType = loaiTepTu(file.mimetype);
  if (!sourceType) throw validationError("Chỉ nhận tệp PDF hoặc DOCX.");

  const input = createSchema.parse(req.body);
  // 202 Accepted: đã nhận và xếp hàng, chưa xử lý xong. Trả 201 là nói dối —
  // tài liệu chưa dùng được cho tới khi worker cắt đoạn xong.
  ok(res, await service.create(file, sourceType, input, currentUser(req)), 202);
}

/** PATCH /documents/:id — ADMIN */
export async function update(req: Request, res: Response): Promise<void> {
  const { id } = documentIdParam.parse(req.params);
  const input = updateSchema.parse(req.body);
  ok(res, await service.update(id, input, currentUser(req)));
}

/** DELETE /documents/:id — ADMIN */
export async function remove(req: Request, res: Response): Promise<void> {
  const { id } = documentIdParam.parse(req.params);
  await service.remove(id, currentUser(req));
  res.status(204).end();
}

/** POST /documents/:id/retry — ADMIN */
export async function retry(req: Request, res: Response): Promise<void> {
  const { id } = documentIdParam.parse(req.params);
  ok(res, await service.retry(id, currentUser(req)), 202);
}

// ---------------------------------------------------------------------------
// Zod cho /documents/* — docs/api-contract.md mục 6.
// ---------------------------------------------------------------------------
import { z } from "zod";

const uuid = z.uuid({ error: "Không phải mã định danh hợp lệ" });

export const documentIdParam = z.object({ id: uuid });

export const listQuerySchema = z.object({
  q: z.string().trim().max(200).optional(),
  /** `all` mặc định · `department` chỉ của đơn vị mình · `global` chỉ toàn trường. */
  scope: z.enum(["all", "department", "global"]).default("all"),
  status: z.enum(["pending", "processing", "ready", "failed"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  // Trần 100 để một request không kéo về cả bảng.
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const chunkQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
});

export const fileQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
});

/**
 * Thân của `POST /documents`. Đến từ `multipart/form-data` nên MỌI trường đều là
 * chuỗi — kể cả trường lẽ ra là null.
 */
export const createSchema = z.object({
  title: z
    .string({ error: "Vui lòng nhập tiêu đề tài liệu" })
    .trim()
    .min(3, "Tiêu đề phải có ít nhất 3 ký tự")
    .max(500, "Tiêu đề không được quá 500 ký tự"),
  /**
   * Bỏ trống nghĩa là tài liệu TOÀN TRƯỜNG (`documents.department_id = NULL`).
   *
   * Biểu mẫu HTML gửi chuỗi rỗng cho ô không chọn, và một số client gửi hẳn chữ
   * "null". Quy cả hai về `undefined` để tầng dưới chỉ phải xử lý một trường hợp.
   */
  departmentId: z
    .string()
    .trim()
    .transform((v) => (v === "" || v === "null" ? undefined : v))
    .pipe(uuid.optional())
    .optional(),
});

export const updateSchema = z
  .object({
    title: z.string().trim().min(3).max(500).optional(),
    departmentId: z
      .string()
      .trim()
      .nullable()
      .transform((v) => (v === "" || v === "null" ? null : v))
      .pipe(z.union([uuid, z.null()]))
      .optional(),
  })
  .refine((body) => Object.keys(body).length > 0, {
    message: "Cần ít nhất một trường để cập nhật",
  });

export type ListQuery = z.infer<typeof listQuerySchema>;
export type CreateInput = z.infer<typeof createSchema>;
export type UpdateInput = z.infer<typeof updateSchema>;

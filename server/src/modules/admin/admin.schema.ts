// ---------------------------------------------------------------------------
// Zod cho /departments/* và /users/* — docs/api-contract.md mục 8.
// ---------------------------------------------------------------------------
import { z } from "zod";
import { MemberRole } from "@prisma/client";

const uuid = z.uuid({ error: "Không phải mã định danh hợp lệ" });

export const idParam = z.object({ id: uuid });
export const thanhVienParam = z.object({ id: uuid, userId: uuid });

export const userQuerySchema = z.object({
  q: z.string().trim().max(200).optional(),
  departmentId: uuid.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(100),
});

export const suaNguoiDungSchema = z.object({
  // Chỉ cho bật/tắt. KHÔNG có `role` ở đây: vai gắn với tư cách thành viên, đổi
  // vai đi qua /departments/:id/members.
  isActive: z.boolean({ error: "Cần trường isActive kiểu boolean" }),
});

export const doiVaiSchema = z.object({
  userId: uuid,
  roleCode: z.enum(MemberRole, { error: "Vai phải là STUDENT hoặc ADMIN" }),
});

export type UserQuery = z.infer<typeof userQuerySchema>;
export type SuaNguoiDungInput = z.infer<typeof suaNguoiDungSchema>;
export type DoiVaiInput = z.infer<typeof doiVaiSchema>;

// ---------------------------------------------------------------------------
// Controller cho /auth/*. Chỉ làm ba việc: parse, gọi service, trả về.
// Không có logic nghiệp vụ và không kiểm phạm vi ở đây.
// ---------------------------------------------------------------------------
import type { Request, Response } from "express";
import { ok } from "../../lib/http.js";
import { currentUser } from "../../middleware/auth.middleware.js";
import { changePasswordSchema, loginSchema } from "./auth.schema.js";
import * as service from "./auth.service.js";

/** POST /auth/login */
export async function login(req: Request, res: Response): Promise<void> {
  const input = loginSchema.parse(req.body);
  ok(res, await service.login(input));
}

/** GET /auth/me — dùng để khôi phục phiên khi tải lại trang. */
export async function me(req: Request, res: Response): Promise<void> {
  // Không truy vấn lại: requireAuth đã nạp bản mới nhất từ cơ sở dữ liệu.
  const user = currentUser(req);
  ok(res, { user: service.toUserDto(user), memberships: service.toMembershipDtos(user) });
}

/** PUT /auth/password */
export async function changePassword(req: Request, res: Response): Promise<void> {
  const input = changePasswordSchema.parse(req.body);
  ok(res, await service.changePassword(currentUser(req).id, input));
}

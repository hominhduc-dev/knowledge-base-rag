// ---------------------------------------------------------------------------
// requireRole('ADMIN') — chặn theo VAI.
//
// PHẠM VI KHÔNG KIỂM Ở ĐÂY. Middleware này chỉ trả lời "vai của bạn có được làm
// việc này không". Câu hỏi "tài nguyên này có thuộc đơn vị của bạn không" thuộc
// về mệnh đề WHERE — xem `lib/scope.ts`. Kiểm phạm vi ở controller rồi truy vấn
// không lọc là đúng cái lỗi mà tests/scope-isolation.test.ts được viết ra để bắt.
//
// Chỉ có hai vai nên không cần thứ hạng: hoặc đòi ADMIN, hoặc không đòi gì.
// ---------------------------------------------------------------------------
import type { NextFunction, Request, Response } from "express";
import { MemberRole } from "@prisma/client";
import { forbiddenRole } from "../lib/errors.js";
import { ROLE_LABEL } from "../lib/roles.js";
import { currentUser } from "./auth.middleware.js";

/** Yêu cầu vai cụ thể. Dùng SAU `requireAuth`. */
export function requireRole(required: MemberRole) {
  return function guard(req: Request, _res: Response, next: NextFunction): void {
    try {
      const user = currentUser(req);
      if (user.role !== required) {
        throw forbiddenRole(
          `Thao tác này cần quyền ${ROLE_LABEL[required]}. ` +
            `Tài khoản của bạn đang ở vai ${ROLE_LABEL[user.role]}.`,
        );
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}

/** Lối tắt cho trường hợp dùng nhiều nhất. */
export const requireAdmin = requireRole(MemberRole.ADMIN);

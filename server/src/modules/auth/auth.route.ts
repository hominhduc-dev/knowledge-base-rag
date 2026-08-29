// ---------------------------------------------------------------------------
// /auth/* — phụ lục A của docs/THIET-KE-HE-THONG.md.
//
// Không có POST /auth/register và sẽ không bao giờ có: docs/phan-quyen.md mục 2.
//
// Các endpoint quản trị (/departments/*, /departments/:id/members) thuộc module
// này nhưng chưa được viết — xem ghi chú ở src/routes.ts.
// ---------------------------------------------------------------------------
import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware.js";
import * as controller from "./auth.controller.js";

export const authRouter: Router = Router();

authRouter.post("/auth/login", controller.login);
authRouter.get("/auth/me", requireAuth, controller.me);
authRouter.put("/auth/password", requireAuth, controller.changePassword);

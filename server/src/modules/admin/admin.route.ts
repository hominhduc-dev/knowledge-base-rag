// ---------------------------------------------------------------------------
// /departments/* và /users/* — docs/api-contract.md mục 8.
//
// `/departments/full` phải khai TRƯỚC `/departments/:id` nếu sau này có route
// đó, nếu không Express khớp cái sau và coi "full" là một mã định danh.
// ---------------------------------------------------------------------------
import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { requireAdmin } from "../../middleware/role.middleware.js";
import * as controller from "./admin.controller.js";

export const adminRouter: Router = Router();

// Mọi vai: cần tên đơn vị để hiển thị phạm vi. KHÔNG kèm số đếm.
adminRouter.get("/departments", requireAuth, controller.danhSachDonVi);

// Chỉ ADMIN
adminRouter.get("/departments/full", requireAuth, requireAdmin, controller.danhSachDonViDayDu);
adminRouter.get("/users", requireAuth, requireAdmin, controller.danhSachNguoiDung);
adminRouter.patch("/users/:id", requireAuth, requireAdmin, controller.suaNguoiDung);
adminRouter.post("/departments/:id/members", requireAuth, requireAdmin, controller.ganThanhVien);
adminRouter.delete(
  "/departments/:id/members/:userId",
  requireAuth,
  requireAdmin,
  controller.goThanhVien,
);

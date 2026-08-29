// ---------------------------------------------------------------------------
// /documents/* — docs/api-contract.md mục 6.
//
// Thứ tự khai báo có ý nghĩa: `/documents/:id/chunks` phải đứng TRƯỚC
// `/documents/:id`, nếu không Express khớp cái sau và coi "chunks" là một phần
// của id.
// ---------------------------------------------------------------------------
import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { requireAdmin } from "../../middleware/role.middleware.js";
import { nhanTep } from "../../middleware/upload.middleware.js";
import * as controller from "./documents.controller.js";

export const documentsRouter: Router = Router();

// --- Đọc: mọi vai, nhưng CHỈ trong phạm vi của mình -------------------------
documentsRouter.get("/documents", requireAuth, controller.list);
documentsRouter.get("/documents/:id/chunks", requireAuth, controller.listChunks);
documentsRouter.get("/documents/:id/status", requireAuth, controller.getStatus);
documentsRouter.get("/documents/:id/file", requireAuth, controller.getFile);
documentsRouter.get("/documents/:id", requireAuth, controller.get);

// --- Ghi: chỉ ADMIN ---------------------------------------------------------
documentsRouter.post("/documents", requireAuth, requireAdmin, nhanTep, controller.create);
documentsRouter.post("/documents/:id/retry", requireAuth, requireAdmin, controller.retry);
documentsRouter.patch("/documents/:id", requireAuth, requireAdmin, controller.update);
documentsRouter.delete("/documents/:id", requireAuth, requireAdmin, controller.remove);

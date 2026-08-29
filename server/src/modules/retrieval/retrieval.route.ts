// ---------------------------------------------------------------------------
// /search — docs/api-contract.md mục 6.
//
// Endpoint phục vụ gỡ lỗi và bộ đánh giá, không dùng ở giao diện chính. Vẫn bắt
// buộc đăng nhập: phạm vi truy hồi phụ thuộc đơn vị của người gọi, để mở là mở
// luôn một đường đọc tài liệu không qua kiểm soát nào.
// ---------------------------------------------------------------------------
import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware.js";
import * as controller from "./retrieval.controller.js";

export const retrievalRouter: Router = Router();

retrievalRouter.post("/search", requireAuth, controller.search);

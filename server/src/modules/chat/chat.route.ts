// ---------------------------------------------------------------------------
// /chat và /conversations — docs/api-contract.md mục 5.
//
// Mọi vai đều hỏi được; phạm vi tài liệu do truy vấn quyết định, không do route.
// ---------------------------------------------------------------------------
import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware.js";
import * as controller from "./chat.controller.js";

export const chatRouter: Router = Router();

chatRouter.post("/chat", requireAuth, controller.ask);
chatRouter.get("/conversations", requireAuth, controller.list);
chatRouter.get("/conversations/:id", requireAuth, controller.get);

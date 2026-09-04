// ---------------------------------------------------------------------------
// Bản đồ toàn bộ API. Giữ file này gọn trong một màn hình — đọc nó là biết hệ
// thống có những gì. Chi tiết nằm trong `*.route.ts` của từng module.
//
// Mọi đường dẫn dưới đây đã có sẵn tiền tố `/api` do app.ts gắn.
// Đối chiếu: phụ lục A của docs/THIET-KE-HE-THONG.md
// ---------------------------------------------------------------------------
import { Router } from "express";
import { prisma } from "./config/prisma.js";
import { ok } from "./lib/http.js";
import { authRouter } from "./modules/auth/index.js";
import { documentsRouter } from "./modules/documents/index.js";
import { retrievalRouter } from "./modules/retrieval/index.js";

export const routes: Router = Router();

const batDauChay = Date.now();

// --- Sức khỏe ---------------------------------------------------------------
// Đếm job đang chờ luôn, theo phụ lục A. Truy vấn này chạm cơ sở dữ liệu nên
// endpoint phân biệt được "tiến trình còn sống" với "còn nói chuyện được với
// CSDL" — bộ cân bằng tải nhờ đó rút đúng node hỏng thay vì tiếp tục đẩy vào.
routes.get("/health", async (_req, res) => {
  const pendingJobs = await prisma.ingestJob.count({ where: { status: "PENDING" } });
  ok(res, {
    status: "ok",
    uptime: Math.floor((Date.now() - batDauChay) / 1000),
    pendingJobs,
  });
});

// --- Đã hiện thực -----------------------------------------------------------
routes.use(authRouter); //      POST /auth/login · GET /auth/me · PUT /auth/password
routes.use(documentsRouter); // /documents/* — liệt kê · chi tiết · chunks · tệp · tải lên
routes.use(retrievalRouter); // POST /search

// --- Chưa hiện thực ---------------------------------------------------------
// Gắn thêm vào đây khi xong, mỗi module một dòng:
//
//   routes.use(chatRouter);       /chat (SSE) · /conversations/*        [TV3]
//   routes.use(adminRouter);      /departments/* · /departments/:id/members [TV4]
//   routes.use(evalRouter);       /eval/runs                            [Đức]
//
// Đường dẫn và khuôn dữ liệu của cả ba đã chốt ở phụ lục A. Sửa tài liệu
// trước, sửa code sau.

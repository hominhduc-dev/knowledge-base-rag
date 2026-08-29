// ---------------------------------------------------------------------------
// Lắp ráp Express. File này KHÔNG gọi listen() — server.ts làm việc đó, nhờ
// vậy test tích hợp import được `app` mà không chiếm cổng.
// ---------------------------------------------------------------------------
import express from "express";
import type { Express } from "express";
import cors from "cors";
import helmet from "helmet";
import { corsOrigins, env } from "./config/env.js";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware.js";
import { logger } from "./lib/logger.js";
import { routes } from "./routes.js";

export function createApp(): Express {
  const app = express();

  // Backend chạy sau reverse proxy trên VPS. Không bật cờ này thì req.ip là địa
  // chỉ của proxy, và mọi giới hạn theo IP sau này sẽ gom cả thế giới vào một rổ.
  app.set("trust proxy", 1);
  app.disable("x-powered-by");

  app.use(helmet());
  app.use(
    cors({
      origin: corsOrigins,
      // Không cần credentials: token đi trong header Authorization, không phải
      // cookie. Đổi sang cookie httpOnly (điểm treo số 3 của contract) thì mới
      // bật, và lúc đó `origin` không được để `*`.
      credentials: false,
      allowedHeaders: ["Content-Type", "Authorization"],
    }),
  );

  // Giới hạn 1 MB cho JSON. Upload tài liệu đi qua multipart ở module ingest
  // với hạn mức riêng MAX_UPLOAD_MB, không dùng đường này.
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true, limit: "1mb" }));

  app.use((req, _res, next) => {
    logger.debug(`${req.method} ${req.originalUrl}`);
    next();
  });

  app.use("/api", routes);

  // Thứ tự bắt buộc: notFound trước, errorHandler sau cùng.
  app.use(notFoundHandler);
  app.use(errorHandler);

  logger.info(`Express đã lắp xong · NODE_ENV=${env.NODE_ENV} · CORS=${corsOrigins.join(", ")}`);
  return app;
}

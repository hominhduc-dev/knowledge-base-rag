// ---------------------------------------------------------------------------
// Chuẩn hóa mọi lỗi về khuôn dạng ở docs/api-contract.md mục 1.
//
// Express 5 tự chuyển promise bị reject trong handler sang error middleware,
// nên không cần bọc `asyncHandler` quanh từng route như ở Express 4.
// ---------------------------------------------------------------------------
import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { AppError, ERROR_STATUS } from "../lib/errors.js";
import { fail } from "../lib/http.js";
import { logger } from "../lib/logger.js";
import { isProduction } from "../config/env.js";

/** Route không khớp gì cả. Đặt SAU toàn bộ route, TRƯỚC errorHandler. */
export function notFoundHandler(req: Request, res: Response): void {
  fail(res, 404, "NOT_FOUND", `Không có endpoint ${req.method} ${req.originalUrl}`);
}

/** Gói các issue của zod thành thông báo đọc được. */
function fromZod(error: ZodError) {
  const details = error.issues.map((issue) => ({
    field: issue.path.join(".") || "(gốc)",
    message: issue.message,
  }));
  const dau = details[0];
  const message = dau ? `${dau.field}: ${dau.message}` : "Dữ liệu vào không hợp lệ";
  return { message, details };
}

export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  next: NextFunction,
): void {
  // Header đã gửi đi rồi thì không ghi đè được nữa — nhường cho Express đóng
  // kết nối. Hay gặp với SSE, nơi phản hồi bắt đầu chảy trước khi lỗi xảy ra.
  if (res.headersSent) {
    next(error);
    return;
  }

  if (error instanceof AppError) {
    // `details` của AppError do service tự đính kèm và có thể chứa thông tin
    // nội bộ, nên chỉ lộ ngoài môi trường thật.
    fail(res, error.status, error.code, error.message, isProduction ? undefined : error.details);
    return;
  }

  if (error instanceof ZodError) {
    // Ngược lại, `details` của zod LUÔN được gửi kể cả ở production — đó là lỗi
    // biểu mẫu của chính người dùng ("thiếu mật khẩu", "câu hỏi quá ngắn"), và
    // frontend cần chúng để tô đúng ô nhập. Tên trường ở đây là tên trong thân
    // request mà người gọi vừa gửi, không phải tên cột trong cơ sở dữ liệu.
    const { message, details } = fromZod(error);
    fail(res, ERROR_STATUS.VALIDATION_ERROR, "VALIDATION_ERROR", message, details);
    return;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    // P2002: đụng ràng buộc duy nhất. Với documents đó là `content_hash`,
    // tức tài liệu trùng — contract quy định 409 DUPLICATE_DOCUMENT.
    if (error.code === "P2002") {
      fail(res, ERROR_STATUS.DUPLICATE_DOCUMENT, "DUPLICATE_DOCUMENT", "Dữ liệu đã tồn tại");
      return;
    }
    if (error.code === "P2025") {
      fail(res, ERROR_STATUS.NOT_FOUND, "NOT_FOUND", "Không tìm thấy tài nguyên");
      return;
    }
  }

  if (
    error instanceof Prisma.PrismaClientInitializationError ||
    error instanceof Prisma.PrismaClientRustPanicError
  ) {
    logger.error("Không kết nối được cơ sở dữ liệu", error);
    fail(res, ERROR_STATUS.UPSTREAM_ERROR, "UPSTREAM_ERROR", "Cơ sở dữ liệu tạm thời không phản hồi");
    return;
  }

  // Còn lại là lỗi ngoài dự kiến. Ghi đầy đủ vào log, trả ra ngoài thông báo
  // trung tính — thông điệp lỗi gốc hay chứa đường dẫn file và câu SQL.
  logger.error("Lỗi không mong đợi", error);
  fail(res, 500, "INTERNAL_ERROR", "Lỗi máy chủ nội bộ");
}

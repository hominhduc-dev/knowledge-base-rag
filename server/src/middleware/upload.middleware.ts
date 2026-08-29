// ---------------------------------------------------------------------------
// Nhận tệp tải lên. Giới hạn kích thước và định dạng.
// ---------------------------------------------------------------------------
import multer from "multer";
import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env.js";
import { AppError, validationError } from "../lib/errors.js";

const MIME_CHO_PHEP: Record<string, "PDF" | "DOCX"> = {
  "application/pdf": "PDF",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "DOCX",
};

/**
 * Giữ tệp trong BỘ NHỚ, không ghi tạm ra đĩa.
 *
 * Trần 20 MB mà đường xử lý cần đọc toàn bộ nội dung để băm SHA-256 và trích văn
 * bản, nên ghi ra đĩa rồi đọc lại chỉ thêm một vòng vào-ra. Nếu sau này nâng trần
 * lên hàng trăm MB thì phải đổi sang `diskStorage`.
 */
export const uploadTaiLieu = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: env.MAX_UPLOAD_MB * 1024 * 1024,
    files: 1,
  },
  fileFilter(_req, file, cb) {
    if (MIME_CHO_PHEP[file.mimetype]) return cb(null, true);
    cb(
      validationError(
        `Chỉ nhận tệp PDF hoặc DOCX. Tệp gửi lên có kiểu ${file.mimetype || "không xác định"}.`,
      ),
    );
  },
}).single("file");

/** Suy loại tệp từ MIME. Trả null nếu không nhận ra. */
export function loaiTepTu(mimetype: string): "PDF" | "DOCX" | null {
  return MIME_CHO_PHEP[mimetype] ?? null;
}

/**
 * Bọc multer để lỗi của nó về đúng khuôn `AppError`.
 *
 * Không bọc thì `LIMIT_FILE_SIZE` rơi xuống error handler như một lỗi lạ và trả
 * `500 INTERNAL_ERROR` — người dùng thấy "lỗi máy chủ" trong khi thật ra chỉ là
 * tệp của họ quá lớn.
 */
export function nhanTep(req: Request, res: Response, next: NextFunction): void {
  uploadTaiLieu(req, res, (error: unknown) => {
    if (!error) return next();

    if (error instanceof AppError) return next(error);

    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        return next(validationError(`Tệp vượt quá giới hạn ${env.MAX_UPLOAD_MB} MB.`));
      }
      if (error.code === "LIMIT_UNEXPECTED_FILE") {
        return next(validationError('Chỉ nhận một tệp, ở trường tên "file".'));
      }
      return next(validationError(`Lỗi khi nhận tệp: ${error.message}`));
    }

    next(error);
  });
}

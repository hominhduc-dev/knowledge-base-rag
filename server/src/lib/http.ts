// ---------------------------------------------------------------------------
// Khuôn dạng phản hồi — docs/api-contract.md mục 1.
//
//   thành công: { "success": true,  "data": { ... } }
//   thất bại:   { "success": false, "error": { "code": "...", "message": "..." } }
//
// Controller không tự gọi res.json() với hình dạng khác. Lớp vỏ này là thứ
// `apiClient` phía frontend bóc ra; lệch một chỗ là frontend nhận undefined.
// ---------------------------------------------------------------------------
import type { Response } from "express";
import type { ErrorCode } from "./errors.js";

export type ApiSuccess<T> = { success: true; data: T };
export type ApiFailure = {
  success: false;
  error: { code: ErrorCode; message: string; details?: unknown };
};

export function ok<T>(res: Response, data: T, status = 200): void {
  res.status(status).json({ success: true, data } satisfies ApiSuccess<T>);
}

export function fail(
  res: Response,
  status: number,
  code: ErrorCode,
  message: string,
  details?: unknown,
): void {
  const body: ApiFailure = { success: false, error: { code, message } };
  if (details !== undefined) body.error.details = details;
  res.status(status).json(body);
}

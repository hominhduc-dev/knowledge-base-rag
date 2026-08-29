// ---------------------------------------------------------------------------
// Mã lỗi và HTTP status — hiện thực trực tiếp bảng ở docs/api-contract.md mục 1.
//
// Thêm mã mới thì phải sửa cả bảng trong tài liệu đó TRƯỚC. Frontend hiển thị
// thông báo khác nhau theo `code`, không theo status.
// ---------------------------------------------------------------------------

export const ERROR_STATUS = {
  UNAUTHENTICATED: 401,
  ACCOUNT_DISABLED: 403,
  FORBIDDEN_ROLE: 403,
  FORBIDDEN_SCOPE: 403,
  NOT_FOUND: 404,
  VALIDATION_ERROR: 422,
  DUPLICATE_DOCUMENT: 409,
  UPSTREAM_ERROR: 503,
  INTERNAL_ERROR: 500,
} as const;

export type ErrorCode = keyof typeof ERROR_STATUS;

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  /** Chi tiết thêm cho VALIDATION_ERROR — không lộ ra ngoài ở môi trường thật. */
  readonly details?: unknown;

  constructor(code: ErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = ERROR_STATUS[code];
    this.details = details;
  }
}

// --- Các lỗi hay dùng -------------------------------------------------------
// Thông báo mặc định viết sẵn bằng tiếng Việt vì frontend hiển thị thẳng.

export const unauthenticated = (message = "Phiên đăng nhập không hợp lệ hoặc đã hết hạn") =>
  new AppError("UNAUTHENTICATED", message);

export const accountDisabled = (message = "Tài khoản đã bị vô hiệu hóa") =>
  new AppError("ACCOUNT_DISABLED", message);

export const forbiddenRole = (message = "Vai trò của bạn không được phép thực hiện thao tác này") =>
  new AppError("FORBIDDEN_ROLE", message);

export const forbiddenScope = (message = "Tài liệu không thuộc phạm vi của bạn") =>
  new AppError("FORBIDDEN_SCOPE", message);

export const notFound = (message = "Không tìm thấy tài nguyên") =>
  new AppError("NOT_FOUND", message);

export const validationError = (message = "Dữ liệu vào không hợp lệ", details?: unknown) =>
  new AppError("VALIDATION_ERROR", message, details);

export const upstreamError = (message = "Dịch vụ bên ngoài tạm thời không phản hồi") =>
  new AppError("UPSTREAM_ERROR", message);

// ---------------------------------------------------------------------------
// Cầu nối duy nhất tới API. Không component nào gọi `fetch` trực tiếp.
//
// Máy chủ luôn trả một trong hai khuôn (phụ lục A của docs/THIET-KE-HE-THONG.md):
//
//   { "success": true,  "data": { ... } }
//   { "success": false, "error": { "code": "...", "message": "..." } }
//
// Hàm này BÓC lớp vỏ đó ra, nên component chỉ thấy phần `data` và không phải
// biết về khuôn dạng. Đổi lại, mọi lỗi đều ném ra dưới dạng `ApiError` có mã.
// ---------------------------------------------------------------------------

/**
 * Đường dẫn gốc của API.
 *
 * Trong Docker, biến này được đặt thành `/api` — đường dẫn TƯƠNG ĐỐI, có chủ
 * đích: trình duyệt tự dùng đúng máy nó vừa tải trang, nên chạy đúng cho
 * localhost, cho IP LAN và cho cả đường hầm tạm mà không phải build lại.
 *
 * Giá trị mặc định dưới đây dành cho lúc chạy `pnpm dev` trên máy, khi giao
 * diện ở cổng 3000 còn API ở cổng 4000 — hai gốc khác nhau nên phải ghi đủ.
 */
const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

/** Khóa localStorage giữ token. Chỉ `features/auth` được đụng tới. */
export const TOKEN_KEY = "tang-thu-token";

/**
 * Lỗi có mã, giữ nguyên `code` mà máy chủ trả về.
 *
 * Giữ được mã là điều kiện để giao diện phân biệt hai tình huống rất khác nhau:
 * `FORBIDDEN_ROLE` là "vai của bạn không được làm việc này", còn
 * `FORBIDDEN_SCOPE` là "việc này thuộc đơn vị khác". Cả hai đều là HTTP 403, nên
 * nếu chỉ giữ mã trạng thái thì không phân biệt được.
 */
export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  /** Lỗi từng trường cho biểu mẫu, có khi `code` là `VALIDATION_ERROR`. */
  readonly details?: { field: string; message: string }[];

  constructor(
    code: string,
    message: string,
    status: number,
    details?: { field: string; message: string }[],
  ) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.details = details;
  }

  /** Phiên đăng nhập không còn dùng được — giao diện nên đưa về màn đăng nhập. */
  get isAuthFailure(): boolean {
    return this.code === "UNAUTHENTICATED" || this.code === "ACCOUNT_DISABLED";
  }
}

function readToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    // Trình duyệt chặn lưu trữ (chế độ riêng tư, thiết lập chặn cookie bên thứ
    // ba). Coi như chưa đăng nhập còn hơn để cả trang chết.
    return null;
  }
}

export async function apiClient<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = readToken();

  let response: Response;
  try {
    response = await fetch(`${apiUrl}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init.headers,
      },
    });
  } catch {
    // Máy chủ không chạy, mất mạng, hoặc CORS chặn. Chưa có phản hồi nào để đọc
    // mã lỗi, nên tự dựng một `ApiError` cho phía gọi xử lý đồng nhất.
    throw new ApiError(
      "NETWORK_ERROR",
      "Không kết nối được máy chủ Sổ Tay Sinh Viên CNTT. Kiểm tra xem API đã chạy chưa.",
      0,
    );
  }

  // 204 No Content không có thân; `response.json()` sẽ ném lỗi cú pháp.
  const raw = response.status === 204 ? null : await response.text();
  let body: unknown = null;
  if (raw) {
    try {
      body = JSON.parse(raw);
    } catch {
      // Phản hồi không phải JSON — thường là trang lỗi của reverse proxy.
      throw new ApiError(
        "INVALID_RESPONSE",
        `Máy chủ trả về dữ liệu không đọc được (HTTP ${response.status}).`,
        response.status,
      );
    }
  }

  const envelope = body as
    | { success: true; data: T }
    | {
        success: false;
        error: { code: string; message: string; details?: { field: string; message: string }[] };
      }
    | null;

  if (!response.ok || envelope?.success === false) {
    const error = envelope && envelope.success === false ? envelope.error : undefined;
    throw new ApiError(
      error?.code ?? "UNKNOWN",
      error?.message ?? `Yêu cầu thất bại (HTTP ${response.status}).`,
      response.status,
      error?.details,
    );
  }

  // Bóc lớp vỏ. Component chỉ thấy phần `data`.
  return (envelope?.success === true ? envelope.data : (null as T)) as T;
}

/** Lối tắt cho các lệnh gọi có thân JSON. */
export function apiPost<T>(path: string, body: unknown): Promise<T> {
  return apiClient<T>(path, { method: "POST", body: JSON.stringify(body) });
}

export function apiPut<T>(path: string, body: unknown): Promise<T> {
  return apiClient<T>(path, { method: "PUT", body: JSON.stringify(body) });
}

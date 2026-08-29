"use client";

// ---------------------------------------------------------------------------
// Phiên đăng nhập thật.
//
// KHÔNG có bảng người dùng ở đây, và đừng thêm lại. Bản trước giữ một mảng
// `demoUsers` phản chiếu dữ liệu seed để đăng nhập được khi chưa có máy chủ.
// Đó là một đường vào KHÔNG QUA MÁY CHỦ: ai sửa được JavaScript trong trình
// duyệt là chọn được vai và phạm vi cho chính mình — đúng thứ mà cả đồ án này
// phủ định.
//
// Vai và phạm vi CHỈ đến từ máy chủ, qua phản hồi của `/auth/login` và
// `/auth/me`. Dữ liệu lưu ở localStorage chỉ để khỏi nháy màn hình khi tải lại
// trang; nó không được tin, và `/auth/me` là thứ quyết định.
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { ApiError, apiClient, apiPost, TOKEN_KEY } from "@/lib/api-client";

/** Đúng khuôn `user` mà máy chủ trả về — phụ lục A. */
export type AuthUser = {
  id: string;
  code: string | null;
  name: string;
  email: string;
  /** Nhãn hiển thị: "Sinh viên" hoặc "Quản trị viên". */
  role: string;
  /** Mã vai, dùng cho logic. Chỉ có hai giá trị. */
  roleCode: "STUDENT" | "ADMIN";
  /** Chuỗi hiển thị phạm vi: tên đơn vị, hoặc "Toàn trường" với ADMIN. */
  scope: string;
};

export type Membership = {
  departmentId: string;
  code: string;
  name: string;
  roleCode: "STUDENT" | "ADMIN";
};

type Session = { user: AuthUser; memberships: Membership[] };
type LoginResponse = Session & { token: string };

const PROFILE_KEY = "tang-thu-profile";
const CHANGE_EVENT = "tang-thu-session-change";

// ===========================================================================
// Kho phiên — một bản duy nhất cho cả ứng dụng
// ===========================================================================

// `useSyncExternalStore` so sánh tham chiếu để quyết định vẽ lại. Nếu
// `getSnapshot` dựng object mới mỗi lần gọi thì React sẽ vẽ lại vô tận. Vì vậy
// giữ đúng một tham chiếu ở đây và chỉ thay khi phiên thật sự đổi.
let session: Session | null = null;
let daNapTuLuuTru = false;

function docLuuTru(): Session | null {
  try {
    const token = window.localStorage.getItem(TOKEN_KEY);
    const raw = window.localStorage.getItem(PROFILE_KEY);
    // Thiếu một trong hai thì coi như chưa đăng nhập. Có hồ sơ mà không có token
    // là trạng thái vô nghĩa — mọi lệnh gọi API sẽ trả 401.
    if (!token || !raw) return null;
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

function ghiLuuTru(next: Session | null, token?: string): void {
  try {
    if (next) {
      if (token) window.localStorage.setItem(TOKEN_KEY, token);
      window.localStorage.setItem(PROFILE_KEY, JSON.stringify(next));
    } else {
      window.localStorage.removeItem(TOKEN_KEY);
      window.localStorage.removeItem(PROFILE_KEY);
    }
  } catch {
    // Trình duyệt chặn lưu trữ: phiên vẫn dùng được trong tab hiện tại, chỉ là
    // tải lại trang sẽ phải đăng nhập lại.
  }
}

function datPhien(next: Session | null, token?: string): void {
  session = next;
  // Đánh dấu đã nạp: nếu không, effect khôi phục phiên chạy sau `login()` sẽ đọc
  // đè localStorage lên phiên vừa đăng nhập.
  daNapTuLuuTru = true;
  ghiLuuTru(next, token);
  if (typeof window !== "undefined") window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(onStoreChange: () => void): () => void {
  window.addEventListener("storage", onStoreChange); // đăng xuất ở tab khác
  window.addEventListener(CHANGE_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(CHANGE_EVENT, onStoreChange);
  };
}

/**
 * Nạp phiên từ localStorage ở lần gọi đầu tiên.
 *
 * An toàn với hydrate: lúc hydrate React dùng `getServerSnapshot`, chỉ sau khi
 * hydrate xong mới chuyển sang hàm này. Nhưng xem `useDaHydrate` bên dưới — chỉ
 * riêng điều đó chưa đủ.
 */
function getSnapshot(): Session | null {
  if (!daNapTuLuuTru) {
    daNapTuLuuTru = true;
    session = docLuuTru();
  }
  return session;
}

/** Máy chủ không có localStorage — luôn kết xuất ở trạng thái chưa đăng nhập. */
function getServerSnapshot(): Session | null {
  return null;
}

const khongDangKy = () => () => {};

/**
 * `false` trong lúc kết xuất phía máy chủ và trong LẦN KẾT XUẤT HYDRATE trên
 * client, `true` từ sau đó.
 *
 * Cần cái này vì một lỗi đã gặp thật: ở lần kết xuất hydrate, `useSession()` trả
 * `null` (React dùng `getServerSnapshot` để khớp HTML máy chủ). `AuthGuard` thấy
 * `null`, kết luận "chưa đăng nhập" và chuyển hướng NGAY — tức là **tải lại trang
 * là mất phiên**, dù token vẫn còn nguyên trong localStorage.
 *
 * Viết bằng `useSyncExternalStore` thay vì `useState` + `useEffect` vì đặt state
 * trong effect vừa thừa một lượt vẽ lại, vừa bị quy tắc lint `set-state-in-effect`
 * chặn. Hàm đăng ký rỗng là có chủ đích: giá trị này không bao giờ đổi sau đó.
 */
function useDaHydrate(): boolean {
  return useSyncExternalStore(
    khongDangKy,
    () => true,
    () => false,
  );
}

// ===========================================================================
// Hook
// ===========================================================================

/** Phiên hiện tại, hoặc `null` khi chưa đăng nhập. */
export function useSession(): Session | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/**
 * Người dùng đang đăng nhập, hoặc `null`.
 *
 * Trả `null` chứ không phải một người dùng mặc định: bản trước rơi về `demoUsers[0]`
 * khi chưa đăng nhập, nghĩa là giao diện luôn hiện tên một người có thật kể cả khi
 * không ai đăng nhập. Chỗ gọi phải xử lý `null` — `AuthGuard` lo việc đó cho các
 * trang trong `(app)`.
 */
export function useCurrentUser(): AuthUser | null {
  return useSession()?.user ?? null;
}

/** Các đơn vị người dùng thuộc về. Quyết định phạm vi tra cứu. */
export function useMemberships(): Membership[] {
  return useSession()?.memberships ?? [];
}

export function useAuth() {
  const router = useRouter();

  /**
   * Đăng nhập bằng mã số sinh viên HOẶC email trường.
   *
   * Máy chủ tự phân biệt hai dạng bằng dấu `@`, nên phía này không đoán gì cả —
   * gửi nguyên chuỗi người dùng nhập.
   */
  const login = useCallback(
    async (account: string, password: string): Promise<void> => {
      const data = await apiPost<LoginResponse>("/auth/login", { account, password });
      datPhien({ user: data.user, memberships: data.memberships }, data.token);

      // ADMIN vào thẳng màn quản lý tài liệu; còn lại vào hỏi đáp.
      router.push(data.user.roleCode === "ADMIN" ? "/documents" : "/chat");
    },
    [router],
  );

  const logout = useCallback((): void => {
    datPhien(null);
    router.push("/login");
  }, [router]);

  return { login, logout };
}

/**
 * Khôi phục phiên khi tải lại trang: hỏi lại máy chủ xem token còn dùng được không.
 *
 * Cần bước này vì hồ sơ trong localStorage có thể đã cũ — ADMIN đổi vai hoặc vô
 * hiệu hóa tài khoản trong lúc người dùng đang mở tab. Tin vào bản lưu là giữ
 * nguyên quyền cũ cho tới khi token hết hạn, tối đa bảy ngày.
 *
 * Trả `"dang-kiem"` cho tới khi có câu trả lời, để `AuthGuard` không đá người
 * dùng ra màn đăng nhập trong lúc còn đang hỏi.
 */
export function useRestoreSession(): "dang-kiem" | "co-phien" | "khong-co-phien" {
  const current = useSession();
  // Chỉ sau khi hydrate xong mới được kết luận là "chưa đăng nhập" — trước đó
  // store còn rỗng vì React chưa chuyển sang `getSnapshot`.
  const daHydrate = useDaHydrate();

  useEffect(() => {
    let huy = false;

    // Không có gì để khôi phục thì thôi, khỏi gọi API.
    if (!current) return;

    apiClient<Session>("/auth/me")
      .then((data) => {
        if (huy) return;
        // Ghi đè bằng bản mới nhất từ máy chủ.
        datPhien({ user: data.user, memberships: data.memberships });
      })
      .catch((error: unknown) => {
        if (huy) return;
        // Token hỏng, hết hạn, hoặc tài khoản bị vô hiệu hóa: dọn phiên.
        // Lỗi mạng thì GIỮ phiên — máy chủ tạm không phản hồi không có nghĩa là
        // người dùng bị đăng xuất.
        if (error instanceof ApiError && error.isAuthFailure) datPhien(null);
      });

    return () => {
      huy = true;
    };
    // Chỉ chạy lại khi danh tính đổi, không phải mỗi lần object phiên thay.
  }, [current?.user.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!daHydrate) return "dang-kiem";
  if (current === null) return "khong-co-phien";
  return "co-phien";
}

// ===========================================================================
// Tiện ích hiển thị
// ===========================================================================

/**
 * Chữ cái đầu để vẽ ảnh đại diện. Tên tiếng Việt viết họ trước tên sau, nên lấy
 * chữ đầu của tiếng ĐẦU và tiếng CUỐI: "Hồ Minh Đức" → "HĐ".
 */
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const dau = parts[0]![0] ?? "";
  const cuoi = parts.length > 1 ? (parts[parts.length - 1]![0] ?? "") : "";
  return (dau + cuoi).toUpperCase();
}

/** Dòng mô tả dưới tên: "Sinh viên · Khoa Công nghệ Thông tin". */
export function describeUser(user: AuthUser): string {
  return `${user.role} · ${user.scope}`;
}

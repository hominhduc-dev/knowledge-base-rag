"use client";

import { useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";

export type DemoRole = "Sinh viên" | "Giảng viên" | "Giáo vụ khoa" | "Quản trị viên";

export type DemoUser = {
  code: string;
  email: string;
  initials: string;
  name: string;
  description: string;
  scope: string;
  role: DemoRole;
};

/**
 * TẠM THỜI — bảng này phản chiếu `apps/backend/prisma/seed.ts`.
 *
 * Người dùng KHÔNG tự chọn vai. Vai và phạm vi được suy ra từ tài khoản, đúng
 * như hệ thống thật: chúng đến từ JWT do máy chủ ký, client không can thiệp được.
 *
 * XÓA TOÀN BỘ khối này khi `POST /auth/login` hoạt động — khi đó `login()` gọi
 * API, nhận token, và thông tin người dùng lấy từ phản hồi của máy chủ.
 */
const demoUsers: DemoUser[] = [
  // Sinh viên — trích từ danh sách lớp 23CT3. Cơ sở dữ liệu có đủ 57 người;
  // ở đây chỉ giữ 2 người mỗi khoa để đăng nhập thử, vì bảng này là tạm thời.
  {
    code: "2351220193",
    email: "duc_2351220193@dau.edu.vn",
    initials: "HĐ",
    name: "Hồ Minh Đức",
    description: "Sinh viên · Lớp 23CT3",
    scope: "Khoa Công nghệ Thông tin",
    role: "Sinh viên",
  },
  {
    code: "2351220208",
    email: "anh_2351220208@dau.edu.vn",
    initials: "TA",
    name: "Trương Xuân Anh",
    description: "Sinh viên · Lớp 23CT3",
    scope: "Khoa Công nghệ Thông tin",
    role: "Sinh viên",
  },
  {
    code: "2351220221",
    email: "hieu_2351220221@dau.edu.vn",
    initials: "VH",
    name: "Võ Minh Hiếu",
    description: "Sinh viên · Lớp 23CT3",
    scope: "Khoa Kiến trúc",
    role: "Sinh viên",
  },
  {
    code: "2351220168",
    email: "trang_2351220168@dau.edu.vn",
    initials: "ÂT",
    name: "Âu Thị Huyền Trang",
    description: "Sinh viên · Lớp 23CT3",
    scope: "Khoa Kiến trúc",
    role: "Sinh viên",
  },
  {
    code: "2351220145",
    email: "huyen_2351220145@dau.edu.vn",
    initials: "PH",
    name: "Phùng Thị Thanh Huyền",
    description: "Sinh viên · Lớp 23CT3",
    scope: "Khoa Xây dựng",
    role: "Sinh viên",
  },
  {
    code: "2351220121",
    email: "vuong_2351220121@dau.edu.vn",
    initials: "NV",
    name: "Nguyễn Minh Vương",
    description: "Sinh viên · Lớp 23CT3",
    scope: "Khoa Xây dựng",
    role: "Sinh viên",
  },
  {
    code: "CB0231",
    email: "khoa.da@dau.edu.vn",
    initials: "ĐK",
    name: "Đỗ Anh Khoa",
    description: "Giảng viên · Khoa CNTT",
    scope: "Khoa Công nghệ Thông tin",
    role: "Giảng viên",
  },
  {
    code: "CB0142",
    email: "hoa.tt@dau.edu.vn",
    initials: "TH",
    name: "Trần Thị Hoà",
    description: "Giáo vụ khoa · Khoa CNTT",
    scope: "Khoa Công nghệ Thông tin",
    role: "Giáo vụ khoa",
  },
  {
    code: "CB0388",
    email: "dat.pq@dau.edu.vn",
    initials: "PĐ",
    name: "Phạm Quốc Đạt",
    description: "Giáo vụ khoa · Khoa Xây dựng",
    scope: "Khoa Xây dựng",
    role: "Giáo vụ khoa",
  },
  {
    code: "CB0205",
    email: "bang.lv@dau.edu.vn",
    initials: "LB",
    name: "Lê Văn Bằng",
    description: "Giáo vụ khoa · Khoa Kiến trúc",
    scope: "Khoa Kiến trúc",
    role: "Giáo vụ khoa",
  },
  {
    code: "CB0417",
    email: "nam.vd@dau.edu.vn",
    initials: "VN",
    name: "Vũ Đình Nam",
    description: "Giáo vụ · Phòng Công tác Sinh viên",
    scope: "Phòng Công tác Sinh viên",
    role: "Giáo vụ khoa",
  },
  {
    code: "CB0006",
    email: "ha.nt@dau.edu.vn",
    initials: "NH",
    name: "Nguyễn Thu Hà",
    description: "Quản trị viên · Toàn trường",
    scope: "Toàn trường",
    role: "Quản trị viên",
  },
];

const STORAGE_KEY = "tang-thu-account";
const CHANGE_EVENT = "tang-thu-account-change";

/** Người dùng mặc định khi chưa đăng nhập hoặc khi kết xuất phía máy chủ. */
const fallbackUser = demoUsers[0];

/**
 * Tra tài khoản bằng mã số sinh viên HOẶC email trường, không phân biệt hoa
 * thường. Giống cách máy chủ sẽ làm: có dấu @ thì là email, không thì là mã.
 */
export function findDemoUser(account: string): DemoUser | null {
  const key = account.trim().toLowerCase();
  if (!key) return null;
  return (
    demoUsers.find((user) => user.code.toLowerCase() === key || user.email.toLowerCase() === key) ??
    null
  );
}

function subscribe(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(CHANGE_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(CHANGE_EVENT, onStoreChange);
  };
}

function getSnapshot(): DemoUser {
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return (stored && findDemoUser(stored)) || fallbackUser;
}

function getServerSnapshot(): DemoUser {
  return fallbackUser;
}

/** Người dùng đang đăng nhập, kèm vai và phạm vi tra cứu của họ. */
export function useCurrentUser(): DemoUser {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function useAuth() {
  const router = useRouter();

  /**
   * Đăng nhập bằng mã số sinh viên hoặc email trường.
   * Trả về false nếu tài khoản không tồn tại — giao diện hiển thị thông báo
   * chung, không cho biết mã hay email nào có thật.
   */
  function login(account: string): boolean {
    const user = findDemoUser(account);
    if (!user) return false;

    window.localStorage.setItem(STORAGE_KEY, user.code);
    window.dispatchEvent(new Event(CHANGE_EVENT));

    const destination =
      user.role === "Giáo vụ khoa"
        ? "/documents"
        : user.role === "Quản trị viên"
          ? "/admin/departments"
          : "/chat";
    router.push(destination);
    return true;
  }

  function logout() {
    window.localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event(CHANGE_EVENT));
    router.push("/login");
  }

  return { login, logout };
}

"use client";

import Link from "next/link";
import { useCurrentUser } from "@/features/auth/useAuth";

/**
 * Liên kết "Quản trị" — chỉ hiện với SYSTEM_ADMIN.
 *
 * Tách riêng thành component khách vì `Header` là component máy chủ, không đọc
 * được phiên trong localStorage.
 *
 * Ẩn liên kết KHÔNG phải là biện pháp bảo mật — mọi endpoint quản trị đều chặn
 * bằng `requireAdmin` ở máy chủ, và `AdminDashboard` cũng tự kiểm tra vai. Đây
 * chỉ là để sinh viên không bấm vào một màn hình chắc chắn báo lỗi cho họ.
 */
export function AdminNavLink({ active }: { active: boolean }) {
  const user = useCurrentUser();
  if (user?.roleCode !== "SYSTEM_ADMIN") return null;

  return (
    <Link
      href="/admin/users"
      className={
        active
          ? "rounded-[8px] bg-sunken px-3 py-2 text-sm font-medium no-underline"
          : "rounded-[8px] px-3 py-2 text-sm text-secondary no-underline hover:bg-sunken"
      }
    >
      Quản trị
    </Link>
  );
}

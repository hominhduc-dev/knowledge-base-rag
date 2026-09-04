"use client";

import Link from "next/link";
import { useCurrentUser } from "@/features/auth/useAuth";
import { cn } from "@/lib/utils";
import { DepartmentForm } from "./DepartmentForm";
import { PermissionMatrix } from "./PermissionMatrix";
import { UserTable } from "./UserTable";

export type AdminTab = "departments" | "users" | "permissions";

const tabs: { key: AdminTab; label: string; href: string }[] = [
  { key: "departments", label: "Cây đơn vị", href: "/admin/departments" },
  { key: "users", label: "Người dùng", href: "/admin/users" },
  { key: "permissions", label: "Ma trận quyền", href: "/admin/permissions" },
];

export function AdminDashboard({ activeTab }: { activeTab: AdminTab }) {
  const user = useCurrentUser();

  // Sinh viên gõ thẳng địa chỉ vẫn vào được trang này. Máy chủ trả 403 cho mọi
  // endpoint quản trị, nên không có rò rỉ — nhưng nếu cứ dựng giao diện thì họ
  // chỉ thấy một bảng trống kèm thông báo lỗi khó hiểu. Nói thẳng lý do.
  //
  // Riêng "Ma trận quyền" vẫn cho xem: nó là bảng tra cứu tĩnh, không gọi API,
  // và biết ai được làm gì là thông tin nên công khai.
  const laQuanTri = user?.roleCode === "ADMIN";
  const tabsHienThi = laQuanTri ? tabs : tabs.filter((t) => t.key === "permissions");
  const tabDangXem = laQuanTri || activeTab === "permissions" ? activeTab : null;

  return (
    <section className="mx-auto w-full max-w-[1120px] px-6 pb-20 pt-10 sm:px-8">
      <h1 className="font-serif text-[30px] font-semibold leading-[38px]">Đơn vị và phân quyền</h1>
      <p className="mt-2 max-w-[64ch] text-[15px] leading-[26px] text-secondary">
        Phạm vi tài liệu của mỗi người dùng được suy ra từ đơn vị và vai; tài liệu toàn trường luôn
        nằm trong phạm vi của mọi người.
      </p>
      <nav className="mt-7 flex gap-1 overflow-x-auto border-b border-border" aria-label="Quản trị">
        {tabsHienThi.map((tab) => (
          <Link
            key={tab.key}
            href={tab.href}
            className={cn(
              "-mb-px min-h-11 whitespace-nowrap border-b-2 px-3.5 py-2.5 text-[15px] leading-6 no-underline",
              activeTab === tab.key
                ? "border-primary font-semibold text-primary"
                : "border-transparent text-secondary hover:text-primary",
            )}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      {tabDangXem === null && (
        <p
          role="alert"
          className="mt-7 max-w-[64ch] rounded-[8px] border border-border bg-surface px-4 py-3.5 text-[15px] leading-[26px] text-secondary"
        >
          Mục này chỉ dành cho quản trị viên. Tài khoản của bạn là{" "}
          <strong className="font-medium text-primary">{user?.role ?? "sinh viên"}</strong> — bạn vẫn
          xem được <Link href="/admin/permissions">ma trận quyền</Link> để biết mỗi vai làm được gì.
        </p>
      )}
      {tabDangXem === "departments" && <DepartmentForm />}
      {tabDangXem === "users" && <UserTable />}
      {tabDangXem === "permissions" && <PermissionMatrix />}
    </section>
  );
}

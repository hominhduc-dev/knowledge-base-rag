import Link from "next/link";
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
  return (
    <section className="mx-auto w-full max-w-[1120px] px-6 pb-20 pt-10 sm:px-8">
      <h1 className="font-serif text-[30px] font-semibold leading-[38px]">Đơn vị và phân quyền</h1>
      <p className="mt-2 max-w-[64ch] text-[15px] leading-[26px] text-secondary">Phạm vi tài liệu của mỗi người dùng được suy ra từ đơn vị và vai; tài liệu toàn trường luôn nằm trong phạm vi của mọi người.</p>
      <nav className="mt-7 flex gap-1 overflow-x-auto border-b border-border" aria-label="Quản trị">
        {tabs.map((tab) => (
          <Link key={tab.key} href={tab.href} className={cn("-mb-px min-h-11 whitespace-nowrap border-b-2 px-3.5 py-2.5 text-[15px] leading-6 no-underline", activeTab === tab.key ? "border-primary font-semibold text-primary" : "border-transparent text-secondary hover:text-primary")}>{tab.label}</Link>
        ))}
      </nav>
      {activeTab === "departments" && <DepartmentForm />}
      {activeTab === "users" && <UserTable />}
      {activeTab === "permissions" && <PermissionMatrix />}
    </section>
  );
}

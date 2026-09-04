// ---------------------------------------------------------------------------
// Gọi API quản trị — docs/api-contract.md mục 8.
//
// Hai endpoint đơn vị, không phải một: `/departments` mở cho mọi vai nhưng
// KHÔNG kèm số đếm, `/departments/full` mới có và chỉ ADMIN gọi được. Màn quản
// trị dùng bản đầy đủ.
// ---------------------------------------------------------------------------
import { apiClient, apiPost } from "@/lib/api-client";

export type DepartmentBrief = {
  id: string;
  code: string;
  name: string;
  type: "FACULTY" | "OFFICE";
};

export type DepartmentItem = DepartmentBrief & {
  docs: number;
  members: number;
};

/** Vai gắn với TỪNG tư cách thành viên, không phải với người dùng. */
export type UserMembership = {
  departmentId: string;
  code: string;
  name: string;
  roleCode: "STUDENT" | "ADMIN";
};

export type UserItem = {
  id: string;
  code: string | null;
  name: string;
  email: string;
  isActive: boolean;
  lastLoginAt: string | null;
  memberships: UserMembership[];
};

export function danhSachDonVi() {
  return apiClient<{ items: DepartmentBrief[] }>("/departments");
}

export function danhSachDonViDayDu() {
  return apiClient<{ items: DepartmentItem[] }>("/departments/full");
}

export function danhSachNguoiDung(params: { q?: string; departmentId?: string; page?: number } = {}) {
  const qs = new URLSearchParams();
  if (params.q) qs.set("q", params.q);
  if (params.departmentId) qs.set("departmentId", params.departmentId);
  qs.set("page", String(params.page ?? 1));
  qs.set("pageSize", "100");
  return apiClient<{ items: UserItem[]; total: number; page: number; pageSize: number }>(
    `/users?${qs}`,
  );
}

/** Bật/tắt tài khoản. Máy chủ chặn tự tắt chính mình. */
export function batTat(id: string, isActive: boolean) {
  return apiClient<UserItem>(`/users/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ isActive }),
  });
}

/**
 * Đổi vai = sửa một dòng `department_members`, KHÔNG phải sửa người dùng.
 * Một người có thể là ADMIN ở phòng mình và STUDENT ở nơi khác, nên endpoint
 * nằm dưới đơn vị.
 */
export function doiVai(departmentId: string, userId: string, roleCode: "STUDENT" | "ADMIN") {
  return apiPost<{ departmentId: string; userId: string; roleCode: string }>(
    `/departments/${departmentId}/members`,
    { userId, roleCode },
  );
}

export function goThanhVien(departmentId: string, userId: string) {
  return apiClient<null>(`/departments/${departmentId}/members/${userId}`, { method: "DELETE" });
}

export function nhanVai(roleCode: "STUDENT" | "ADMIN"): string {
  return roleCode === "ADMIN" ? "Quản trị viên" : "Sinh viên";
}

export function nhanLoaiDonVi(type: DepartmentBrief["type"]): string {
  return type === "FACULTY" ? "Khoa" : "Phòng ban";
}

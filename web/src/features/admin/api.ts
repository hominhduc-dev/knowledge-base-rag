// ---------------------------------------------------------------------------
// Gọi API quản trị — docs/api-contract.md mục 8.
//
// Hai endpoint đơn vị, không phải một: `/departments` mở cho mọi vai nhưng
// KHÔNG kèm số đếm, `/departments/full` mới có và chỉ SYSTEM_ADMIN gọi được. Màn quản
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
  roleCode: "USER" | "CONTENT_ADMIN" | "SYSTEM_ADMIN";
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
 * Giữ endpoint cũ để tương thích; backend chỉ nhận tư cách CNTT.
 */
export function doiVai(departmentId: string, userId: string, roleCode: "USER" | "CONTENT_ADMIN" | "SYSTEM_ADMIN") {
  return apiPost<{ departmentId: string; userId: string; roleCode: string }>(
    `/departments/${departmentId}/members`,
    { userId, roleCode },
  );
}

export function goThanhVien(departmentId: string, userId: string) {
  return apiClient<null>(`/departments/${departmentId}/members/${userId}`, { method: "DELETE" });
}

export function nhanVai(roleCode: "USER" | "CONTENT_ADMIN" | "SYSTEM_ADMIN"): string {
  return roleCode === "SYSTEM_ADMIN" ? "Quản Trị Viên" : roleCode === "CONTENT_ADMIN" ? "Giáo vụ khoa CNTT" : "Sinh Viên CNTT";
}

export function nhanLoaiDonVi(type: DepartmentBrief["type"]): string {
  return type === "FACULTY" ? "Khoa" : "Phòng ban";
}

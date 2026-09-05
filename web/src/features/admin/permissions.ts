export type RoleCode = "USER" | "CONTENT_ADMIN" | "SYSTEM_ADMIN";
export const ROLE_COLUMNS: { code: RoleCode; label: string }[] = [
  { code: "USER", label: "Sinh Viên CNTT" },
  { code: "CONTENT_ADMIN", label: "Giáo vụ khoa CNTT" },
  { code: "SYSTEM_ADMIN", label: "Quản Trị Viên" },
];
export function canManageContent(role?: RoleCode): boolean {
  return role === "CONTENT_ADMIN" || role === "SYSTEM_ADMIN";
}
export type PermissionRow = { name: string; allowed: RoleCode[] };
export const PERMISSIONS: PermissionRow[] = [
  { name: "Hỏi đáp, xem nguồn và lịch sử hội thoại", allowed: ["USER", "CONTENT_ADMIN", "SYSTEM_ADMIN"] },
  { name: "Đọc tài liệu CNTT và quy định chung", allowed: ["USER", "CONTENT_ADMIN", "SYSTEM_ADMIN"] },
  { name: "Đổi mật khẩu của chính mình", allowed: ["USER", "CONTENT_ADMIN", "SYSTEM_ADMIN"] },
  { name: "Tải lên, sửa, gỡ và xử lý lại tài liệu", allowed: ["CONTENT_ADMIN", "SYSTEM_ADMIN"] },
  { name: "Xem và khóa / mở tài khoản", allowed: ["SYSTEM_ADMIN"] },
  { name: "Phân quyền người dùng", allowed: ["SYSTEM_ADMIN"] },
];
export function coQuyen(row: PermissionRow, role: RoleCode): boolean {
  return row.allowed.includes(role);
}

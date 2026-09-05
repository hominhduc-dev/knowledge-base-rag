import { MemberRole } from "@prisma/client";
import type { AuthenticatedUser } from "../types/express.js";
import { forbiddenRole } from "./errors.js";

export const PROGRAM_CODE = "CNTT";
export const PROGRAM_LABEL = "Ngành CNTT · Đại học Kiến trúc Đà Nẵng";

/** Chỉ gọi với tư cách CNTT đã được backend lọc từ CSDL. */
export function effectiveRole(roles: readonly MemberRole[]): MemberRole {
  if (roles.includes(MemberRole.SYSTEM_ADMIN)) return MemberRole.SYSTEM_ADMIN;
  if (roles.includes(MemberRole.CONTENT_ADMIN)) return MemberRole.CONTENT_ADMIN;
  return MemberRole.USER;
}

export const ROLE_LABEL: Record<MemberRole, string> = {
  USER: "Sinh Viên CNTT",
  CONTENT_ADMIN: "Giáo vụ khoa CNTT",
  SYSTEM_ADMIN: "Quản Trị Viên",
};

export function canManageContent(role: MemberRole): boolean {
  return role === MemberRole.CONTENT_ADMIN || role === MemberRole.SYSTEM_ADMIN;
}
export function assertContentAdmin(user: AuthenticatedUser): void {
  if (!canManageContent(user.role)) throw forbiddenRole();
}
export function assertSystemAdmin(user: AuthenticatedUser): void {
  if (user.role !== MemberRole.SYSTEM_ADMIN) throw forbiddenRole("Thao tác này cần quyền quản trị viên.");
}

import { MemberRole, Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma.js";
import { forbiddenRole, notFound, validationError } from "../../lib/errors.js";
import { assertSystemAdmin, PROGRAM_CODE } from "../../lib/roles.js";
import type { AuthenticatedUser } from "../../types/express.js";
import type { DoiVaiInput, SuaNguoiDungInput } from "./admin.schema.js";

const memberScope = { department: { code: PROGRAM_CODE } };
const userScope: Prisma.UserWhereInput = { memberships: { some: memberScope } };
const userSelect = {
  id: true, code: true, fullName: true, email: true, isActive: true, lastLoginAt: true,
  memberships: {
    where: memberScope,
    select: { role: true, department: { select: { id: true, code: true, name: true } } },
  },
} as const;

type UserRow = Prisma.UserGetPayload<{ select: typeof userSelect }>;
export type UserItem = ReturnType<typeof userDto>;
function userDto(user: UserRow) {
  return {
    id: user.id, code: user.code, name: user.fullName, email: user.email,
    isActive: user.isActive, lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    memberships: user.memberships.map((m) => ({
      departmentId: m.department.id, code: m.department.code, name: m.department.name, roleCode: m.role,
    })),
  };
}

export async function danhSachRutGon() {
  const items = await prisma.department.findMany({
    where: { code: PROGRAM_CODE }, select: { id: true, code: true, name: true, type: true },
  });
  return { items };
}

export async function danhSachDayDu(user: AuthenticatedUser) {
  assertSystemAdmin(user);
  const rows = await prisma.department.findMany({
    where: { code: PROGRAM_CODE },
    select: { id: true, code: true, name: true, type: true, _count: { select: { documents: true, members: true } } },
  });
  return { items: rows.map(({ _count, ...d }) => ({ ...d, docs: _count.documents, members: _count.members })) };
}

export type DepartmentItem = Awaited<ReturnType<typeof danhSachDayDu>>["items"][number];

export async function danhSachNguoiDung(
  query: { q?: string; departmentId?: string; page: number; pageSize: number },
  user: AuthenticatedUser,
) {
  assertSystemAdmin(user);
  const where: Prisma.UserWhereInput = { AND: [
    userScope,
    ...(query.departmentId ? [{ memberships: { some: { ...memberScope, departmentId: query.departmentId } } }] : []),
    ...(query.q ? [{ OR: [
      { fullName: { contains: query.q, mode: "insensitive" as const } },
      { email: { contains: query.q, mode: "insensitive" as const } },
      { code: { contains: query.q.toUpperCase() } },
    ] }] : []),
  ] };
  const [rows, total] = await Promise.all([
    prisma.user.findMany({ where, select: userSelect, orderBy: { code: "asc" }, skip: (query.page - 1) * query.pageSize, take: query.pageSize }),
    prisma.user.count({ where }),
  ]);
  return { items: rows.map(userDto), total, page: query.page, pageSize: query.pageSize };
}

/** Tuần tự hóa thay đổi quyền, kiểm lại quyền từ CSDL trong cùng transaction. */
async function managementTransaction<T>(user: AuthenticatedUser, fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  assertSystemAdmin(user);
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(731050901)`;
    const caller = await tx.user.findFirst({
      where: { id: user.id, isActive: true, memberships: { some: { ...memberScope, role: MemberRole.SYSTEM_ADMIN } } },
      select: { id: true },
    });
    if (!caller) throw forbiddenRole();
    return fn(tx);
  });
}

export async function suaNguoiDung(id: string, input: SuaNguoiDungInput, user: AuthenticatedUser): Promise<UserItem> {
  if (id === user.id && !input.isActive) throw validationError("Không thể tự vô hiệu hóa tài khoản của chính mình.");
  return managementTransaction(user, async (tx) => {
    const target = await tx.user.findFirst({ where: { id, AND: [userScope] }, select: { id: true } });
    if (!target) throw notFound("Không tìm thấy tài khoản trong hệ thống CNTT.");
    return userDto(await tx.user.update({ where: { id, AND: [userScope] }, data: input, select: userSelect }));
  });
}

export async function ganThanhVien(departmentId: string, input: DoiVaiInput, user: AuthenticatedUser) {
  if (input.userId === user.id) throw validationError("Không thể tự đổi vai của chính mình.");
  return managementTransaction(user, async (tx) => {
    const dept = await tx.department.findFirst({ where: { id: departmentId, code: PROGRAM_CODE }, select: { id: true } });
    if (!dept) throw notFound("Hệ thống chỉ quản lý ngành CNTT.");
    const target = await tx.user.findFirst({ where: { id: input.userId, AND: [userScope] }, select: { id: true } });
    if (!target) throw notFound("Không tìm thấy tài khoản trong hệ thống CNTT.");
    await tx.departmentMember.update({
      where: { userId_departmentId: { userId: input.userId, departmentId } },
      data: { role: input.roleCode },
    });
    return { departmentId, userId: input.userId, roleCode: input.roleCode };
  });
}

/** Tương thích endpoint cũ: gỡ tư cách CNTT đồng nghĩa thu hồi quyền dùng ứng dụng. */
export async function goThanhVien(departmentId: string, userId: string, user: AuthenticatedUser): Promise<void> {
  if (userId === user.id) throw validationError("Không thể tự thu hồi quyền của chính mình.");
  await managementTransaction(user, async (tx) => {
    const membership = await tx.departmentMember.findFirst({
      where: { userId, departmentId, ...memberScope }, select: { id: true },
    });
    if (!membership) throw notFound("Không tìm thấy tư cách CNTT.");
    await tx.departmentMember.delete({ where: { id: membership.id } });
  });
}

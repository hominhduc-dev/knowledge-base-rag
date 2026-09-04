// ---------------------------------------------------------------------------
// Quản trị đơn vị và người dùng — docs/api-contract.md mục 8.
//
// Toàn bộ ghi ở đây chỉ ADMIN gọi được, chặn ở tầng route bằng `requireAdmin`.
// Riêng `GET /departments` mở cho mọi vai vì giao diện cần tên đơn vị để hiển
// thị — nhưng nó KHÔNG trả số đếm, xem ghi chú ở `danhSachRutGon`.
// ---------------------------------------------------------------------------
import { MemberRole } from "@prisma/client";
import { prisma } from "../../config/prisma.js";
import { notFound, validationError } from "../../lib/errors.js";
import type { AuthenticatedUser } from "../../types/express.js";
import type { DoiVaiInput, SuaNguoiDungInput } from "./admin.schema.js";

// ===========================================================================
// ĐƠN VỊ
// ===========================================================================

/**
 * Danh sách rút gọn cho MỌI vai.
 *
 * Cố ý KHÔNG trả số tài liệu và số người dùng. Sinh viên cần tên đơn vị để hiển
 * thị phạm vi của mình, nhưng biết Khoa Kiến trúc có bao nhiêu tài liệu là một
 * rò rỉ nhỏ — đủ để suy ra quy mô kho của đơn vị khác. Đó là lý do contract mục
 * 8 tách làm hai endpoint.
 */
export async function danhSachRutGon() {
  const rows = await prisma.department.findMany({
    orderBy: [{ type: "asc" }, { code: "asc" }],
    select: { id: true, code: true, name: true, type: true },
  });
  return { items: rows };
}

export type DepartmentItem = {
  id: string;
  code: string;
  name: string;
  type: "FACULTY" | "OFFICE";
  docs: number;
  members: number;
};

/** Danh sách đầy đủ kèm số đếm — chỉ ADMIN. */
export async function danhSachDayDu(): Promise<{ items: DepartmentItem[] }> {
  const rows = await prisma.department.findMany({
    orderBy: [{ type: "asc" }, { code: "asc" }],
    select: {
      id: true,
      code: true,
      name: true,
      type: true,
      _count: { select: { documents: true, members: true } },
    },
  });

  // Tài liệu toàn trường (`departmentId = null`) không thuộc đơn vị nào nên
  // không nằm trong `_count` của bất kỳ dòng nào. Đếm riêng và báo ở một dòng
  // giả, nếu không tổng số tài liệu trên màn hình sẽ ít hơn thực tế mà không ai
  // hiểu vì sao.
  const soToanTruong = await prisma.document.count({ where: { departmentId: null } });

  return {
    items: [
      ...rows.map((d) => ({
        id: d.id,
        code: d.code,
        name: d.name,
        type: d.type,
        docs: d._count.documents,
        members: d._count.members,
      })),
      {
        id: "global",
        code: "—",
        name: "Tài liệu toàn trường",
        type: "OFFICE" as const,
        docs: soToanTruong,
        members: 0,
      },
    ],
  };
}

// ===========================================================================
// NGƯỜI DÙNG
// ===========================================================================

export type UserItem = {
  id: string;
  code: string | null;
  name: string;
  email: string;
  isActive: boolean;
  lastLoginAt: string | null;
  memberships: { departmentId: string; code: string; name: string; roleCode: MemberRole }[];
};

/**
 * Danh sách người dùng.
 *
 * KHÔNG có trường `role` phẳng: vai gắn với TỪNG tư cách thành viên, nên một
 * người có thể là ADMIN ở phòng ban mình và STUDENT ở nơi khác. Xem
 * docs/phan-quyen.md mục 2.
 */
export async function danhSachNguoiDung(query: {
  q?: string;
  departmentId?: string;
  page: number;
  pageSize: number;
}): Promise<{ items: UserItem[]; total: number; page: number; pageSize: number }> {
  const where = {
    ...(query.q
      ? {
          OR: [
            { fullName: { contains: query.q, mode: "insensitive" as const } },
            { email: { contains: query.q, mode: "insensitive" as const } },
            { code: { contains: query.q.toUpperCase() } },
          ],
        }
      : {}),
    ...(query.departmentId
      ? { memberships: { some: { departmentId: query.departmentId } } }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: [{ code: "asc" }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      select: {
        id: true,
        code: true,
        fullName: true,
        email: true,
        isActive: true,
        lastLoginAt: true,
        memberships: {
          select: { role: true, department: { select: { id: true, code: true, name: true } } },
        },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return {
    items: rows.map((u) => ({
      id: u.id,
      code: u.code,
      name: u.fullName,
      email: u.email,
      isActive: u.isActive,
      lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
      memberships: u.memberships.map((m) => ({
        departmentId: m.department.id,
        code: m.department.code,
        name: m.department.name,
        roleCode: m.role,
      })),
    })),
    total,
    page: query.page,
    pageSize: query.pageSize,
  };
}

/** Bật/tắt tài khoản. KHÔNG xóa — xóa làm gãy khóa ngoại. */
export async function suaNguoiDung(
  id: string,
  input: SuaNguoiDungInput,
  nguoiGoi: AuthenticatedUser,
): Promise<UserItem> {
  // Tự vô hiệu hóa chính mình là tự khóa cửa từ bên trong: phiên hiện tại chết ở
  // request kế tiếp, và nếu đây là ADMIN duy nhất thì không ai mở lại được.
  if (id === nguoiGoi.id && input.isActive === false) {
    throw validationError("Không thể tự vô hiệu hóa tài khoản của chính mình.");
  }

  const co = await prisma.user.findUnique({ where: { id }, select: { id: true } });
  if (!co) throw notFound("Không tìm thấy người dùng");

  const u = await prisma.user.update({
    where: { id },
    data: { isActive: input.isActive },
    select: {
      id: true,
      code: true,
      fullName: true,
      email: true,
      isActive: true,
      lastLoginAt: true,
      memberships: {
        select: { role: true, department: { select: { id: true, code: true, name: true } } },
      },
    },
  });

  return {
    id: u.id,
    code: u.code,
    name: u.fullName,
    email: u.email,
    isActive: u.isActive,
    lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
    memberships: u.memberships.map((m) => ({
      departmentId: m.department.id,
      code: m.department.code,
      name: m.department.name,
      roleCode: m.role,
    })),
  };
}

// ===========================================================================
// TƯ CÁCH THÀNH VIÊN — nơi thật sự quyết định vai
// ===========================================================================

/**
 * Gán hoặc đổi vai của một người trong một đơn vị.
 *
 * "Đổi vai" thật ra là sửa MỘT DÒNG `department_members`, không phải sửa người
 * dùng — vì một người có thể mang vai khác nhau ở các đơn vị khác nhau. Đó là lý
 * do endpoint nằm dưới `/departments/:id/members` chứ không phải `PATCH /users/:id`.
 */
export async function ganThanhVien(
  departmentId: string,
  input: DoiVaiInput,
  nguoiGoi: AuthenticatedUser,
): Promise<{ departmentId: string; userId: string; roleCode: MemberRole }> {
  const [donVi, nguoi] = await Promise.all([
    prisma.department.findUnique({ where: { id: departmentId }, select: { id: true } }),
    prisma.user.findUnique({ where: { id: input.userId }, select: { id: true } }),
  ]);
  if (!donVi) throw notFound("Không tìm thấy đơn vị");
  if (!nguoi) throw notFound("Không tìm thấy người dùng");

  // Tự hạ vai của chính mình sẽ khiến request kế tiếp bị 403, và nếu đây là
  // ADMIN duy nhất thì hệ thống không còn ai quản trị.
  if (input.userId === nguoiGoi.id && input.roleCode !== MemberRole.ADMIN) {
    throw validationError("Không thể tự hạ vai của chính mình.");
  }

  await prisma.departmentMember.upsert({
    where: { userId_departmentId: { userId: input.userId, departmentId } },
    update: { role: input.roleCode },
    create: { userId: input.userId, departmentId, role: input.roleCode },
  });

  return { departmentId, userId: input.userId, roleCode: input.roleCode };
}

/** Gỡ một người khỏi một đơn vị. */
export async function goThanhVien(
  departmentId: string,
  userId: string,
  nguoiGoi: AuthenticatedUser,
): Promise<void> {
  if (userId === nguoiGoi.id) {
    throw validationError("Không thể tự gỡ mình khỏi đơn vị.");
  }

  const co = await prisma.departmentMember.findUnique({
    where: { userId_departmentId: { userId, departmentId } },
    select: { id: true },
  });
  if (!co) throw notFound("Người dùng không thuộc đơn vị này");

  // Người không thuộc đơn vị nào chỉ còn đọc được tài liệu toàn trường — hệ
  // thống vẫn chạy đúng, `scopeSql` đã xử lý mảng rỗng.
  await prisma.departmentMember.delete({ where: { id: co.id } });
}

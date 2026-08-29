// ---------------------------------------------------------------------------
// Xác thực — phụ lục A của THIET-KE-HE-THONG.md, mục 2 của docs/phan-quyen.md.
//
// Hệ thống KHÔNG có đăng ký. Tài khoản do ADMIN cấp. Đừng thêm hàm register vào
// file này: cho tự đăng ký kèm tự chọn khoa là vô hiệu hóa cách ly phạm vi ngay
// tại cửa vào, trong khi bộ kiểm thử vẫn xanh vì nó dùng tài khoản seed.
// ---------------------------------------------------------------------------
import bcrypt from "bcryptjs";
import type { MemberRole } from "@prisma/client";
import { env } from "../../config/env.js";
import { prisma } from "../../config/prisma.js";
import { accountDisabled, unauthenticated, validationError } from "../../lib/errors.js";
import { effectiveRole, ROLE_LABEL } from "../../lib/roles.js";
import { signToken } from "../../middleware/auth.middleware.js";
import type { AuthenticatedUser } from "../../types/express.js";
import type { ChangePasswordInput, LoginInput } from "./auth.schema.js";

/** Một tư cách thành viên, đúng khóa `memberships[]` trong phụ lục A. */
export type MembershipDto = {
  departmentId: string;
  code: string;
  name: string;
  roleCode: MemberRole;
};

export type UserDto = {
  id: string;
  code: string | null;
  name: string;
  email: string;
  role: string; // nhãn hiển thị
  roleCode: MemberRole; // vai hiệu dụng, dùng cho logic
  /// Chuỗi hiển thị gọn: ADMIN là "Toàn trường", còn lại là tên các đơn vị.
  scope: string;
};

export function toUserDto(user: AuthenticatedUser): UserDto {
  return {
    id: user.id,
    code: user.code,
    name: user.fullName,
    email: user.email,
    role: ROLE_LABEL[user.role],
    roleCode: user.role,
    scope:
      user.role === "ADMIN"
        ? "Toàn trường"
        : (user.departments.map((d) => d.name).join(" · ") || "Chưa gán đơn vị"),
  };
}

export function toMembershipDtos(user: AuthenticatedUser): MembershipDto[] {
  return user.departments.map((d) => ({
    departmentId: d.id,
    code: d.code,
    name: d.name,
    roleCode: d.role,
  }));
}

/**
 * Phân biệt email với mã bằng dấu `@`.
 *
 * Chuẩn hóa phải khớp ĐÚNG cách seed.ts ghi vào cơ sở dữ liệu: email chữ thường,
 * mã chữ hoa. Lệch một chỗ là tài khoản seed không đăng nhập được, mà lỗi lại
 * báo "sai mật khẩu" nên rất khó lần ra.
 */
function buildAccountFilter(account: string) {
  const trimmed = account.trim();
  return trimmed.includes("@")
    ? { email: trimmed.toLowerCase() }
    : { code: trimmed.toUpperCase() };
}

const CHON_THANH_VIEN = {
  select: {
    role: true,
    department: { select: { id: true, code: true, name: true } },
  },
} as const;

export async function login(
  input: LoginInput,
): Promise<{ token: string; user: UserDto; memberships: MembershipDto[] }> {
  const user = await prisma.user.findUnique({
    where: buildAccountFilter(input.account),
    select: {
      id: true,
      code: true,
      email: true,
      fullName: true,
      isActive: true,
      passwordHash: true,
      memberships: CHON_THANH_VIEN,
    },
  });

  // Tài khoản không tồn tại: VẪN chạy một lần bcrypt.compare trên hash giả, để
  // thời gian phản hồi không tiết lộ mã hay email nào có thật. Hợp đồng yêu cầu
  // hai trường hợp trả thông báo GIỐNG HỆT nhau — thông báo giống nhau mà thời
  // gian lệch nhau thì vẫn đếm được.
  if (!user) {
    await bcrypt.compare(input.password, DUMMY_HASH);
    throw unauthenticated(WRONG_CREDENTIALS);
  }

  const matched = await bcrypt.compare(input.password, user.passwordHash);
  if (!matched) throw unauthenticated(WRONG_CREDENTIALS);

  // Kiểm isActive SAU khi đã xác nhận mật khẩu đúng. Kiểm trước thì bất kỳ ai
  // cũng dò được tài khoản nào đang bị khóa mà không cần biết mật khẩu.
  if (!user.isActive) throw accountDisabled();

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  const departments = user.memberships.map((m) => ({
    id: m.department.id,
    code: m.department.code,
    name: m.department.name,
    role: m.role,
  }));

  const authenticated: AuthenticatedUser = {
    id: user.id,
    code: user.code,
    email: user.email,
    fullName: user.fullName,
    role: effectiveRole(departments.map((d) => d.role)),
    departments,
    departmentIds: departments.map((d) => d.id),
  };

  return {
    token: signToken(user.id),
    user: toUserDto(authenticated),
    memberships: toMembershipDtos(authenticated),
  };
}

export async function changePassword(
  userId: string,
  input: ChangePasswordInput,
): Promise<{ changed: true }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true },
  });
  if (!user) throw unauthenticated();

  const matched = await bcrypt.compare(input.currentPassword, user.passwordHash);
  // 422 chứ không phải 401: người gọi ĐANG đăng nhập hợp lệ, chỉ điền sai một ô
  // trong biểu mẫu. Trả 401 sẽ khiến frontend đá họ ra màn đăng nhập.
  if (!matched) throw validationError("Mật khẩu hiện tại không đúng");

  const passwordHash = await bcrypt.hash(input.newPassword, env.BCRYPT_ROUNDS);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });

  return { changed: true };
}

const WRONG_CREDENTIALS = "Tài khoản hoặc mật khẩu không đúng";

// Hash bcrypt hợp lệ của một chuỗi ngẫu nhiên, chỉ để đốt thời gian cho bằng
// nhánh có thật. Không tài khoản nào dùng mật khẩu ứng với hash này.
const DUMMY_HASH = "$2b$10$C6UzMDM.H6dfI/f/IKcEe.5Zm9dm1cWZAnk3JHFdRoIWq0LWEBQ4W";

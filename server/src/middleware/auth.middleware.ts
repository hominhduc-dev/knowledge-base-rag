// ---------------------------------------------------------------------------
// Đọc `Authorization: Bearer <token>` → nạp người dùng → gán vào req.user.
//
// Token CHỈ mang `sub` là id người dùng. Vai và đơn vị đọc lại từ cơ sở dữ liệu
// ở mỗi request, có chủ đích: nếu nhét `role` vào token thì ADMIN hạ vai một
// người sẽ không có tác dụng cho tới khi token cũ hết hạn — tức là tối đa 7
// ngày còn nguyên quyền cũ. Vô hiệu hóa tài khoản cũng vậy. Cái giá là một
// truy vấn theo khóa chính mỗi request, chấp nhận được.
// ---------------------------------------------------------------------------
import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import type { SignOptions } from "jsonwebtoken";
import { env } from "../config/env.js";
import { prisma } from "../config/prisma.js";
import { accountDisabled, unauthenticated } from "../lib/errors.js";
import { effectiveRole } from "../lib/roles.js";

type TokenPayload = { sub: string };

export function signToken(userId: string): string {
  const options = { expiresIn: env.JWT_EXPIRES_IN } as SignOptions;
  return jwt.sign({ sub: userId } satisfies TokenPayload, env.JWT_SECRET, options);
}

/** Bóc token khỏi header. Trả null khi header vắng mặt hoặc sai khuôn. */
function readBearer(req: Request): string | null {
  const header = req.header("authorization");
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  if (!scheme || scheme.toLowerCase() !== "bearer" || !token) return null;
  return token.trim() || null;
}

/**
 * Bắt buộc đăng nhập. Đặt TRƯỚC `requireRole` trên mọi route không công khai.
 */
export async function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const token = readBearer(req);
    if (!token) throw unauthenticated("Thiếu token xác thực");

    let payload: TokenPayload;
    try {
      payload = jwt.verify(token, env.JWT_SECRET) as TokenPayload;
    } catch {
      // Gộp mọi lý do (hết hạn, chữ ký sai, khuôn hỏng) vào một thông báo —
      // phân biệt ra chỉ giúp người dò token biết mình sai ở đâu.
      throw unauthenticated();
    }

    if (!payload.sub) throw unauthenticated();

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        code: true,
        email: true,
        fullName: true,
        isActive: true,
        // Nạp luôn tư cách thành viên: đây là thứ quyết định phạm vi, và mọi
        // request đều cần tới nên tách ra truy vấn riêng chỉ tốn thêm một vòng.
        memberships: {
          select: {
            role: true,
            department: { select: { id: true, code: true, name: true } },
          },
        },
      },
    });

    // Token hợp lệ nhưng người dùng đã bị xóa: vẫn là UNAUTHENTICATED, không
    // phải NOT_FOUND — phía gọi chỉ cần biết là phải đăng nhập lại.
    if (!user) throw unauthenticated();
    if (!user.isActive) throw accountDisabled();

    const departments = user.memberships.map((m) => ({
      id: m.department.id,
      code: m.department.code,
      name: m.department.name,
      role: m.role,
    }));

    req.user = {
      id: user.id,
      code: user.code,
      email: user.email,
      fullName: user.fullName,
      role: effectiveRole(departments.map((d) => d.role)),
      departments,
      departmentIds: departments.map((d) => d.id),
    };
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Lấy req.user sau khi đã qua `requireAuth`.
 *
 * Ném lỗi thay vì trả undefined: tới được đây mà không có user nghĩa là route
 * quên gắn `requireAuth`, và đó là lỗi lập trình cần lộ ra ngay chứ không phải
 * tình huống cần xử lý mềm.
 */
export function currentUser(req: Request) {
  if (!req.user) throw unauthenticated();
  return req.user;
}

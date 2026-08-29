// ---------------------------------------------------------------------------
// Mở rộng Request của Express thêm `user`.
//
// Trường này do `auth.middleware.ts` gán và CHỈ nó được gán. Để optional vì các
// route công khai (/health, /auth/login) không có người dùng — nhờ vậy TypeScript
// bắt được chỗ nào quên `requireAuth` mà đã đụng tới req.user.
// ---------------------------------------------------------------------------
import type { MemberRole } from "@prisma/client";

export type UserDepartment = {
  id: string;
  code: string;
  name: string;
  role: MemberRole;
};

export type AuthenticatedUser = {
  id: string;
  code: string | null;
  email: string;
  fullName: string;

  /// Vai HIỆU DỤNG, gộp từ mọi tư cách thành viên — xem `lib/roles.ts`.
  role: MemberRole;

  /// Mọi đơn vị người này thuộc về. ĐÂY là thứ quyết định phạm vi nhìn thấy,
  /// không phải `role`. Đọc qua `lib/scope.ts`, đừng dùng trực tiếp.
  departments: UserDepartment[];
  departmentIds: string[];
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export {};

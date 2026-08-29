"use client";

import { LogOut } from "lucide-react";
import { describeUser, initialsOf, useAuth, useCurrentUser } from "@/features/auth/useAuth";

type UserMenuProps = { compact?: boolean };

export function UserMenu({ compact = false }: UserMenuProps) {
  const user = useCurrentUser();
  const { logout } = useAuth();

  // `AuthGuard` đã chặn trường hợp chưa đăng nhập ở các trang trong `(app)`,
  // nhưng component này vẫn phải tự lo — nó nằm trong Sidebar và Header, hai chỗ
  // có thể được kết xuất trước khi phiên kịp khôi phục.
  if (!user) return null;

  return (
    <div className="flex items-center gap-2.5">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-border text-xs font-semibold text-secondary">
        {initialsOf(user.name)}
      </div>
      {!compact && (
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-medium leading-[18px]">{user.name}</div>
          <div className="truncate text-[13px] leading-[18px] text-muted">{describeUser(user)}</div>
        </div>
      )}
      {!compact && (
        // Trước đây đây là một <Link href="/login">: nó chỉ ĐIỀU HƯỚNG chứ không
        // xóa gì. Với phiên thật thì token vẫn nằm nguyên trong localStorage và
        // người dùng vẫn đang đăng nhập — nút "Đăng xuất" không đăng xuất.
        <button
          type="button"
          onClick={logout}
          className="ml-auto rounded-[8px] p-2 text-muted no-underline hover:bg-surface hover:text-primary"
          aria-label="Đăng xuất"
        >
          <LogOut className="size-4" />
        </button>
      )}
    </div>
  );
}

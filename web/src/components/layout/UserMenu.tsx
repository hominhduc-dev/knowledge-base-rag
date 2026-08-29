"use client";

import Link from "next/link";
import { LogOut } from "lucide-react";
import { useCurrentUser } from "@/features/auth/useAuth";

type UserMenuProps = { compact?: boolean };

export function UserMenu({ compact = false }: UserMenuProps) {
  const profile = useCurrentUser();

  return (
    <div className="flex items-center gap-2.5">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-border text-xs font-semibold text-secondary">{profile.initials}</div>
      {!compact && (
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-medium leading-[18px]">{profile.name}</div>
          <div className="truncate text-[13px] leading-[18px] text-muted">{profile.description}</div>
        </div>
      )}
      {!compact && (
        <Link href="/login" className="ml-auto rounded-[8px] p-2 text-muted no-underline hover:bg-surface hover:text-primary" aria-label="Đăng xuất">
          <LogOut className="size-4" />
        </Link>
      )}
    </div>
  );
}

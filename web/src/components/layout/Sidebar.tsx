"use client";

import Image from "next/image";
import { X } from "lucide-react";
import { history } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { UserMenu } from "./UserMenu";

type SidebarProps = {
  open: boolean;
  scope: string;
  onNewChat: () => void;
  onClose: () => void;
};


export function Sidebar({ open, scope, onNewChat, onClose }: SidebarProps) {
  return (
    <>
      {open && <button type="button" aria-label="Đóng thanh điều hướng" className="fixed inset-0 z-40 bg-primary/20 md:hidden" onClick={onClose} />}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 flex w-[260px] shrink-0 flex-col overflow-hidden border-r border-border bg-sunken transition-transform md:static md:z-auto md:translate-x-0",
        open ? "translate-x-0 overlay-shadow" : "-translate-x-full",
      )}>
        <div className="flex h-[57px] items-center gap-2.5 border-b border-border px-4">
          <Image src="/logo-dau.png" alt="DAU" width={24} height={24} />
          <span className="font-serif text-[15px] font-semibold leading-5">Sổ Tay Sinh Viên CNTT</span>
          <button type="button" onClick={onClose} className="ml-auto flex size-11 items-center justify-center rounded-[8px] text-secondary hover:bg-surface md:hidden" aria-label="Đóng menu"><X className="size-5" /></button>
        </div>

        <div className="border-b border-border p-4">
          <div className="mb-2 font-mono text-[11px] uppercase tracking-[0.12em] text-muted">Phạm vi tra cứu</div>
          <div className="rounded-[4px] border border-[#dbd1bf] bg-indigo-soft px-2.5 py-2 text-[13px] font-medium text-indigo">{scope}</div>
          <p className="mb-0 mt-1.5 text-xs leading-[18px] text-muted">Tài liệu CNTT và quy định chung của trường</p>
        </div>

        <div className="p-4 pb-3.5">
          <button type="button" onClick={onNewChat} className="min-h-11 w-full rounded-[8px] border border-border-strong px-3.5 text-sm font-medium hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">Hội thoại mới</button>
        </div>
        <div className="px-4 pb-2 font-mono text-[11px] uppercase tracking-[0.12em] text-muted">Gần đây</div>
        <div className="flex-1 overflow-y-auto px-2 pb-4">
          {history.map((item) => (
            <button key={item.title} type="button" className="block min-h-11 w-full rounded-[8px] px-2.5 py-2 text-left hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
              <span className="block truncate text-sm leading-[21px]">{item.title}</span>
              <span className="mt-0.5 block text-[13px] leading-[18px] text-muted">{item.when}</span>
            </button>
          ))}
        </div>
        <div className="border-t border-border p-3.5 px-4"><UserMenu /></div>
      </aside>
    </>
  );
}

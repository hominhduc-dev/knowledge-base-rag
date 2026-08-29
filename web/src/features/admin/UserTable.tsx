"use client";

import { useState } from "react";
import { users as initialUsers } from "@/lib/mock-data";
import { RoleSelect } from "./RoleSelect";

export function UserTable() {
  const [rows, setRows] = useState(initialUsers);
  const [editing, setEditing] = useState<string | null>(null);

  return (
    <div className="mt-7 overflow-x-auto">
      <table className="w-full min-w-[820px] border-collapse">
        <thead>
          <tr className="border-b border-border-strong text-left text-[13px] leading-5 text-muted">
            <th className="pb-2.5 pr-3 font-medium">Họ tên</th>
            <th className="px-3 pb-2.5 font-medium">Email</th>
            <th className="px-3 pb-2.5 font-medium">Vai</th>
            <th className="px-3 pb-2.5 font-medium">Phạm vi</th>
            <th className="pb-2.5 pl-3 text-right font-medium">Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((user) => (
            <tr key={user.email} className="h-14 border-b border-border hover:bg-sunken">
              <td className="py-2 pr-3 text-[15px] font-medium leading-6">{user.name}</td>
              <td className="px-3 py-2 font-mono text-[13px] text-secondary">{user.email}</td>
              <td className="px-3 py-2 text-sm leading-[22px]">
                {editing === user.email ? <RoleSelect value={user.role} onChange={(role) => setRows((current) => current.map((item) => item.email === user.email ? { ...item, role } : item))} /> : user.role}
              </td>
              <td className="px-3 py-2"><span className="rounded-[4px] bg-indigo-soft px-2 py-1 text-[13px] font-medium leading-[18px] text-indigo">{user.scope}</span></td>
              <td className="py-2 pl-3 text-right">
                <button type="button" onClick={() => setEditing((current) => current === user.email ? null : user.email)} className="min-h-10 rounded-[8px] border border-border-strong px-3 text-sm hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">{editing === user.email ? "Xong" : "Đổi vai"}</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

"use client";

const roles = ["Sinh viên", "Giảng viên", "Giáo vụ khoa", "Quản trị viên"];

export function RoleSelect({ value, onChange }: { value: string; onChange: (role: string) => void }) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)} className="h-10 rounded-[8px] border border-border-strong bg-surface px-2.5 text-sm outline-none focus:ring-2 focus:ring-accent">
      {roles.map((role) => <option key={role}>{role}</option>)}
    </select>
  );
}

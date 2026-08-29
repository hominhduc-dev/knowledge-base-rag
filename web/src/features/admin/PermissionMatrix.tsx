import { permissions } from "@/lib/mock-data";

export function PermissionMatrix() {
  return (
    <div className="mt-7 overflow-x-auto">
      <table className="w-full min-w-[760px] border-collapse">
        <thead>
          <tr className="border-b border-border-strong text-[13px] leading-5 text-muted">
            <th className="pb-3 pr-4 text-left font-medium">Quyền</th>
            {['Sinh viên', 'Giảng viên', 'Giáo vụ khoa', 'Quản trị viên'].map((role) => <th key={role} className="px-3 pb-3 text-center font-medium">{role}</th>)}
          </tr>
        </thead>
        <tbody>
          {permissions.map(([name, ...values]) => (
            <tr key={name} className="h-[52px] border-b border-border">
              <td className="py-2 pr-4 text-[15px] leading-6">{name}</td>
              {values.map((value, index) => <td key={`${name}-${index}`} className="px-3 py-2 text-center text-[15px] text-secondary">{value}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-5 max-w-[64ch] text-sm leading-[22px] text-muted">Dấu ✓ là có quyền trong phạm vi đơn vị của người dùng; dấu — là không có quyền. Quản trị viên có quyền trên toàn trường.</p>
    </div>
  );
}

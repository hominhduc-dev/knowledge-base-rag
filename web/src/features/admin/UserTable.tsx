"use client";

import { users } from "@/lib/mock-data";

/**
 * Danh sách người dùng.
 *
 * CHƯA NỐI API. `GET /users` và `PATCH /users/:id` chưa được viết, nên bảng này
 * vẫn đọc dữ liệu giả và nút đổi vai bị vô hiệu hóa.
 *
 * Trước đây cột "Vai" là một ô chọn bốn giá trị (`RoleSelect`) và bấm "Đổi vai"
 * thì đổi được ngay trên màn hình. Nó KHÔNG gửi gì lên máy chủ — chỉ sửa state
 * cục bộ rồi mất khi tải lại trang. Một điều khiển trông như chạy được nhưng
 * không làm gì là thứ khiến người kiểm thử tưởng tính năng đã xong; thà vô hiệu
 * hóa và nói rõ còn hơn.
 *
 * Khi `PATCH /users/:id` xong: bỏ `disabled`, gọi API, và vì chỉ còn hai vai nên
 * dùng công tắc hai trạng thái, không cần ô chọn.
 */
export function UserTable() {
  return (
    <div className="mt-7">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] border-collapse">
          <thead>
            <tr className="border-b border-border-strong text-left text-[13px] leading-5 text-muted">
              <th scope="col" className="pb-2.5 pr-3 font-medium">Họ tên</th>
              <th scope="col" className="px-3 pb-2.5 font-medium">Email</th>
              <th scope="col" className="px-3 pb-2.5 font-medium">Vai</th>
              <th scope="col" className="px-3 pb-2.5 font-medium">Phạm vi</th>
              <th scope="col" className="pb-2.5 pl-3 text-right font-medium">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.email} className="h-14 border-b border-border hover:bg-sunken">
                <td className="py-2 pr-3 text-[15px] font-medium leading-6">{user.name}</td>
                <td className="px-3 py-2 font-mono text-[13px] text-secondary">{user.email}</td>
                <td className="px-3 py-2 text-sm leading-[22px]">{user.role}</td>
                <td className="px-3 py-2">
                  <span className="rounded-[4px] bg-indigo-soft px-2 py-1 text-[13px] font-medium leading-[18px] text-indigo">
                    {user.scope}
                  </span>
                </td>
                <td className="py-2 pl-3 text-right">
                  <button
                    type="button"
                    disabled
                    title="Cần PATCH /users/:id — chưa hiện thực"
                    className="min-h-10 rounded-[8px] border border-border-strong px-3 text-sm text-muted disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Đổi vai
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-5 max-w-[64ch] text-sm leading-[22px] text-muted">
        Dữ liệu mẫu. Danh sách thật cần <code className="font-mono text-[13px]">GET /users</code>, và
        đổi vai cần <code className="font-mono text-[13px]">PATCH /users/:id</code> — cả hai chưa
        được hiện thực.
      </p>
    </div>
  );
}

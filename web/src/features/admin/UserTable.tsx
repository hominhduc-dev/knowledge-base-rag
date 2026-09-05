"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { useCurrentUser } from "@/features/auth/useAuth";
import { ApiError } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { batTat, danhSachNguoiDung, doiVai, nhanVai, type UserItem } from "./api";

/**
 * Danh sách người dùng.
 *
 * Cột "Vai" là một cột theo TỪNG ĐƠN VỊ, không phải một giá trị của người dùng:
 * `department_members` giữ vai riêng cho mỗi tư cách thành viên, nên một người
 * có thể là quản trị ở phòng mình và sinh viên ở khoa khác. Đó là lý do bấm đổi
 * vai lại gọi `POST /departments/:id/members` chứ không phải `PATCH /users/:id`.
 *
 * Người không thuộc đơn vị nào chỉ đọc được tài liệu toàn trường — hợp lệ, hiển
 * thị đúng như vậy chứ không coi là dữ liệu hỏng.
 */
export function UserTable() {
  const me = useCurrentUser();
  const [items, setItems] = useState<UserItem[]>([]);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState("");
  const [dangTai, setDangTai] = useState(true);
  const [loi, setLoi] = useState<string | null>(null);
  /** Id đang có yêu cầu ghi dở — khóa nút để không bấm hai lần. */
  const [dangGhi, setDangGhi] = useState<string | null>(null);

  // Đánh số lượt gọi: phản hồi của lần gõ trước có thể về SAU lần gõ sau và ghi
  // đè kết quả mới bằng kết quả cũ.
  const luotGoi = useRef(0);

  const nap = useCallback(async () => {
    const luot = ++luotGoi.current;
    setDangTai(true);
    try {
      const kq = await danhSachNguoiDung({ q: query.trim() || undefined });
      if (luot !== luotGoi.current) return;
      setItems(kq.items);
      setTotal(kq.total);
      setLoi(null);
    } catch (e: unknown) {
      if (luot !== luotGoi.current) return;
      setLoi(e instanceof ApiError ? e.message : "Không tải được danh sách người dùng.");
    } finally {
      if (luot === luotGoi.current) setDangTai(false);
    }
  }, [query]);

  useEffect(() => {
    const t = setTimeout(nap, query ? 300 : 0);
    return () => clearTimeout(t);
  }, [nap, query]);

  async function xuLy(id: string, viec: () => Promise<unknown>) {
    setDangGhi(id);
    try {
      await viec();
      await nap();
      setLoi(null);
    } catch (e: unknown) {
      setLoi(e instanceof ApiError ? e.message : "Thao tác thất bại.");
    } finally {
      setDangGhi(null);
    }
  }

  return (
    <div className="mt-7">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm theo tên, email hoặc mã số"
          aria-label="Tìm người dùng"
          className="max-w-[320px]"
        />
        <span className="font-mono text-[13px] text-muted">
          {dangTai ? "Đang tải…" : `${total} người dùng`}
        </span>
      </div>

      {loi && (
        <p
          role="alert"
          className="mb-4 rounded-[8px] border border-danger/30 bg-danger/5 px-4 py-3 text-sm leading-[22px] text-danger"
        >
          {loi}
        </p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse">
          <thead>
            <tr className="border-b border-border-strong text-left text-[13px] leading-5 text-muted">
              <th scope="col" className="pb-2.5 pr-3 font-medium">
                Họ tên
              </th>
              <th scope="col" className="px-3 pb-2.5 font-medium">
                Email
              </th>
              <th scope="col" className="px-3 pb-2.5 font-medium">
                Phạm vi và vai
              </th>
              <th scope="col" className="px-3 pb-2.5 font-medium">
                Trạng thái
              </th>
              <th scope="col" className="pb-2.5 pl-3 text-right font-medium">
                Thao tác
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((user) => {
              const laToi = user.id === me?.id;
              const khoa = dangGhi === user.id;
              return (
                <tr
                  key={user.id}
                  className={cn(
                    "border-b border-border align-top hover:bg-sunken",
                    !user.isActive && "opacity-60",
                  )}
                >
                  <td className="py-3 pr-3 text-[15px] font-medium leading-6">
                    {user.name}
                    {user.code && (
                      <span className="ml-2 font-mono text-[12px] text-muted">{user.code}</span>
                    )}
                  </td>
                  <td className="px-3 py-3 font-mono text-[13px] text-secondary">{user.email}</td>
                  <td className="px-3 py-3">
                    {user.memberships.length === 0 ? (
                      <span className="text-[13px] leading-5 text-muted">
                        Không thuộc đơn vị nào · chỉ đọc tài liệu toàn trường
                      </span>
                    ) : (
                      <ul className="flex flex-col gap-1.5">
                        {user.memberships.map((m) => (
                          <li key={m.departmentId} className="flex flex-wrap items-center gap-2">
                            <span className="rounded-[4px] bg-indigo-soft px-2 py-1 text-[13px] font-medium leading-[18px] text-indigo">
                              {m.name}
                            </span>
                            <select
                              aria-label={`Vai của ${user.name}`}
                              value={m.roleCode}
                              disabled={khoa || laToi}
                              onChange={(event) => {
                                const role = event.target.value as typeof m.roleCode;
                                void xuLy(user.id, () => doiVai(m.departmentId, user.id, role));
                              }}
                              className="min-h-8 rounded-[6px] border border-border-strong px-2 text-[13px] disabled:opacity-50"
                            >
                              <option value="USER">{nhanVai("USER")}</option>
                              <option value="CONTENT_ADMIN">{nhanVai("CONTENT_ADMIN")}</option>
                              <option value="SYSTEM_ADMIN">{nhanVai("SYSTEM_ADMIN")}</option>
                            </select>
                          </li>
                        ))}
                      </ul>
                    )}
                  </td>
                  <td className="px-3 py-3 text-sm leading-[22px]">
                    <span className={user.isActive ? "text-success" : "text-danger"}>
                      {user.isActive ? "Đang hoạt động" : "Đã vô hiệu hóa"}
                    </span>
                  </td>
                  <td className="py-3 pl-3 text-right">
                    <button
                      type="button"
                      disabled={khoa || (laToi && user.isActive)}
                      title={
                        laToi && user.isActive
                          ? "Không thể tự vô hiệu hóa tài khoản của chính mình"
                          : undefined
                      }
                      onClick={() => xuLy(user.id, () => batTat(user.id, !user.isActive))}
                      className="min-h-10 rounded-[8px] border border-border-strong px-3 text-sm hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {user.isActive ? "Vô hiệu hóa" : "Kích hoạt"}
                    </button>
                  </td>
                </tr>
              );
            })}
            {!dangTai && items.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-[15px] leading-6 text-muted">
                  Không có người dùng nào khớp.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-5 max-w-[64ch] text-sm leading-[22px] text-muted">
        Vô hiệu hóa KHÔNG xóa tài khoản — lịch sử hội thoại và tài liệu đã tải lên vẫn tham chiếu tới
        người dùng. Tạo tài khoản mới cần <code className="font-mono text-[13px]">POST /users</code>,
        chưa được hiện thực; tài khoản hiện được tạo bằng{" "}
        <code className="font-mono text-[13px]">pnpm db:seed</code>.
      </p>
    </div>
  );
}

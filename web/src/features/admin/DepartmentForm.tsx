"use client";

import { useEffect, useState } from "react";
import { ApiError } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { danhSachDonViDayDu, nhanLoaiDonVi, type DepartmentItem } from "./api";

/**
 * Cây đơn vị.
 *
 * Đọc `/departments/full` nên số tài liệu và số người là số THẬT trong CSDL,
 * không phải dữ liệu mẫu. Dòng cuối "Tài liệu toàn trường" (`id === "global"`)
 * là dòng giả do máy chủ thêm: tài liệu `department_id = null` không thuộc đơn
 * vị nào nên sẽ biến mất khỏi mọi số đếm nếu không đếm riêng.
 *
 * CHƯA CÓ: thêm và sửa đơn vị. `POST /departments` và `PATCH /departments/:id`
 * chưa được viết, nên hai nút đó bị vô hiệu hóa thay vì trông như chạy được.
 */
export function DepartmentForm() {
  const [items, setItems] = useState<DepartmentItem[]>([]);
  const [selected, setSelected] = useState(0);
  const [loi, setLoi] = useState<string | null>(null);
  const [dangTai, setDangTai] = useState(true);

  useEffect(() => {
    let huy = false;
    danhSachDonViDayDu()
      .then((kq) => {
        if (huy) return;
        setItems(kq.items);
        setLoi(null);
      })
      .catch((e: unknown) => {
        if (huy) return;
        setLoi(e instanceof ApiError ? e.message : "Không tải được danh sách đơn vị.");
      })
      .finally(() => {
        if (!huy) setDangTai(false);
      });
    return () => {
      huy = true;
    };
  }, []);

  if (dangTai) {
    return <p className="mt-7 text-[15px] leading-6 text-muted">Đang tải cây đơn vị…</p>;
  }

  if (loi) {
    return (
      <p
        role="alert"
        className="mt-7 rounded-[8px] border border-danger/30 bg-danger/5 px-4 py-3 text-sm leading-[22px] text-danger"
      >
        {loi}
      </p>
    );
  }

  const department = items[Math.min(selected, items.length - 1)];
  if (!department) {
    return <p className="mt-7 text-[15px] leading-6 text-muted">Chưa có đơn vị nào.</p>;
  }

  // Dòng tổng hợp, không phải một đơn vị thật — không có người và không sửa được.
  const laToanTruong = department.id === "global";

  return (
    <div className="mt-7 grid gap-8 lg:grid-cols-[minmax(280px,1fr)_minmax(280px,340px)] lg:gap-10">
      <section>
        <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
          Trường Đại học Kiến trúc Đà Nẵng
        </h2>
        {items.map((item, index) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setSelected(index)}
            className="relative flex min-h-[66px] w-full items-center gap-3 border-b border-border px-3.5 py-3 text-left hover:bg-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
          >
            {selected === index && (
              <span className="absolute inset-y-0 left-0 w-0.5 bg-indigo" aria-hidden="true" />
            )}
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-medium leading-6">{item.name}</span>
              <span className="block text-[13px] leading-5 text-muted">
                {item.id === "global" ? "Không thuộc đơn vị nào" : `${nhanLoaiDonVi(item.type)} · ${item.code}`}
              </span>
            </span>
            <span className="font-mono text-[13px] text-secondary">{item.docs} tài liệu</span>
          </button>
        ))}
      </section>

      <aside className="self-start rounded-[12px] border border-border bg-surface p-[22px]">
        <h2 className="text-[17px] font-semibold leading-[26px]">{department.name}</h2>
        <p className="mt-0.5 text-[13px] leading-5 text-muted">
          {laToanTruong ? "Phạm vi chung của mọi người dùng" : `${nhanLoaiDonVi(department.type)} · ${department.code}`}
        </p>
        <dl className="mt-5 flex flex-col gap-3.5 border-t border-border pt-[18px]">
          {(
            [
              ["Tài liệu", String(department.docs)],
              ["Thành viên", laToanTruong ? "—" : String(department.members)],
              ["Phạm vi kế thừa", "Toàn trường"],
            ] as [string, string][]
          ).map(([label, value]) => (
            <div key={label} className="flex justify-between gap-4">
              <dt className="text-sm leading-[22px] text-secondary">{label}</dt>
              <dd
                className={cn(
                  "m-0 text-right text-sm leading-[22px]",
                  label === "Tài liệu" || label === "Thành viên" ? "font-mono text-[13px]" : "",
                )}
              >
                {value}
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-[22px] text-[13px] leading-5 text-muted">
          Thêm và sửa đơn vị cần <code className="font-mono">POST /departments</code> và{" "}
          <code className="font-mono">PATCH /departments/:id</code> — chưa được hiện thực. Đơn vị
          hiện được tạo bằng <code className="font-mono">pnpm db:seed</code>.
        </p>
      </aside>
    </div>
  );
}

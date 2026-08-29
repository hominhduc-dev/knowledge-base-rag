"use client";

import { useState } from "react";
import { departments } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function DepartmentForm() {
  const [selected, setSelected] = useState(0);
  const department = departments[selected];

  return (
    <div className="mt-7 grid gap-8 lg:grid-cols-[minmax(280px,1fr)_minmax(280px,340px)] lg:gap-10">
      <section>
        <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.12em] text-muted">Trường Đại học Kiến trúc Đà Nẵng</h2>
        {departments.map((item, index) => (
          <button key={item.name} type="button" onClick={() => setSelected(index)} className="relative flex min-h-[66px] w-full items-center gap-3 border-b border-border px-3.5 py-3 text-left hover:bg-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent">
            {selected === index && <span className="absolute inset-y-0 left-0 w-0.5 bg-indigo" aria-hidden="true" />}
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-medium leading-6">{item.name}</span>
              <span className="block text-[13px] leading-5 text-muted">{item.kind}</span>
            </span>
            <span className="font-mono text-[13px] text-secondary">{item.docs} tài liệu</span>
          </button>
        ))}
      </section>

      <aside className="self-start rounded-[12px] border border-border bg-surface p-[22px]">
        <h2 className="text-[17px] font-semibold leading-[26px]">{department.name}</h2>
        <p className="mt-0.5 text-[13px] leading-5 text-muted">{department.kind}</p>
        <dl className="mt-5 flex flex-col gap-3.5 border-t border-border pt-[18px]">
          {[
            ["Tài liệu", department.docs], ["Người dùng", department.users], ["Giáo vụ phụ trách", department.staff], ["Phạm vi kế thừa", "Toàn trường"],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between gap-4">
              <dt className="text-sm leading-[22px] text-secondary">{label}</dt>
              <dd className={cn("m-0 text-right text-sm leading-[22px]", label === "Tài liệu" || label === "Người dùng" ? "font-mono text-[13px]" : "")}>{value}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-[22px] flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm">Sửa đơn vị</Button>
          <Button type="button" variant="ghost" size="sm" className="font-normal">Thêm đơn vị con</Button>
        </div>
      </aside>
    </div>
  );
}

"use client";

import type { KnowledgeDocument } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "./StatusBadge";

type DocumentTableProps = {
  documents: KnowledgeDocument[];
  onOpen: (document: KnowledgeDocument) => void;
};

export function DocumentTable({ documents, onOpen }: DocumentTableProps) {
  if (!documents.length) return <p className="my-6 text-[15px] leading-[26px] text-muted">Không có tài liệu nào khớp với bộ lọc hiện tại.</p>;

  return (
    <div className="mt-5 overflow-x-auto">
      <table className="w-full min-w-[840px] border-collapse">
        <thead>
          <tr className="border-b border-border-strong text-left text-[13px] font-medium leading-5 text-muted">
            <th className="pb-2.5 pr-3 font-medium">Tên</th>
            <th className="px-3 pb-2.5 font-medium">Đơn vị</th>
            <th className="px-3 pb-2.5 font-medium">Trạng thái</th>
            <th className="px-3 pb-2.5 text-right font-medium">Số đoạn</th>
            <th className="px-3 pb-2.5 font-medium">Cập nhật</th>
            <th className="pb-2.5 pl-3 text-right font-medium">Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {documents.map((document) => (
            <tr key={document.code} className="h-14 border-b border-border hover:bg-sunken">
              <td className="max-w-[340px] py-2 pr-3 text-[15px] font-medium leading-6">{document.name}</td>
              <td className="px-3 py-2 text-sm leading-[22px] text-secondary">{document.unit}</td>
              <td className="px-3 py-2"><StatusBadge status={document.status} /></td>
              <td className="px-3 py-2 text-right font-mono text-[13px]">{document.status === "ready" ? document.chunks : "—"}</td>
              <td className="px-3 py-2 text-sm leading-[22px] text-secondary">{document.updated}</td>
              <td className="py-2 pl-3 text-right">
                <div className="inline-flex gap-1">
                  <Button type="button" variant="outline" size="sm" onClick={() => onOpen(document)}>Xem</Button>
                  <Button type="button" variant="ghost" size="sm" className="font-normal hover:text-danger">Xóa</Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

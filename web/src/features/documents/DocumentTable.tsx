"use client";

import { Button } from "@/components/ui/button";
import { dinhDangNgay, type KnowledgeDocument } from "./api";
import { StatusBadge } from "./StatusBadge";

type DocumentTableProps = {
  documents: KnowledgeDocument[];
  onOpen: (document: KnowledgeDocument) => void;
  onDelete: (document: KnowledgeDocument) => void;
  dangXoa: string | null;
};

export function DocumentTable({ documents, onOpen, onDelete, dangXoa }: DocumentTableProps) {
  if (!documents.length) {
    return (
      <p className="my-6 text-[15px] leading-[26px] text-muted">
        Không có tài liệu nào khớp với bộ lọc hiện tại.
      </p>
    );
  }

  return (
    <div className="mt-5 overflow-x-auto">
      <table className="w-full min-w-[840px] border-collapse">
        <thead>
          <tr className="border-b border-border-strong text-left text-[13px] font-medium leading-5 text-muted">
            <th scope="col" className="pb-2.5 pr-3 font-medium">Tên</th>
            <th scope="col" className="px-3 pb-2.5 font-medium">Đơn vị</th>
            <th scope="col" className="px-3 pb-2.5 font-medium">Trạng thái</th>
            <th scope="col" className="px-3 pb-2.5 text-right font-medium">Số đoạn</th>
            <th scope="col" className="px-3 pb-2.5 font-medium">Cập nhật</th>
            <th scope="col" className="pb-2.5 pl-3 text-right font-medium">Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {documents.map((doc) => (
            // Khóa là `id`, không phải số hiệu văn bản: lược đồ v2 không còn cột
            // đó, và `id` là thứ mọi URL dùng.
            <tr key={doc.id} className="h-14 border-b border-border hover:bg-sunken">
              <td className="max-w-[340px] py-2 pr-3 text-[15px] font-medium leading-6">{doc.name}</td>
              <td className="px-3 py-2 text-sm leading-[22px] text-secondary">{doc.unit}</td>
              <td className="px-3 py-2"><StatusBadge status={doc.status} /></td>
              <td className="px-3 py-2 text-right font-mono text-[13px]">
                {doc.status === "ready" ? doc.chunks : "—"}
              </td>
              <td className="px-3 py-2 text-sm leading-[22px] text-secondary">
                {dinhDangNgay(doc.updated)}
              </td>
              <td className="py-2 pl-3 text-right">
                <div className="inline-flex gap-1">
                  <Button type="button" variant="outline" size="sm" onClick={() => onOpen(doc)}>
                    Xem
                  </Button>
                  {/* `canEdit` do máy chủ tính — giao diện không tự suy từ vai. */}
                  {doc.canEdit && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={dangXoa === doc.id}
                      onClick={() => onDelete(doc)}
                      className="font-normal hover:text-danger"
                    >
                      {dangXoa === doc.id ? "Đang xóa…" : "Xóa"}
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

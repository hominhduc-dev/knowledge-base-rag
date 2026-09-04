import type { DocumentStatus } from "./api";
import { cn } from "@/lib/utils";

// Bốn trạng thái của máy chủ. Bản trước chỉ có ba và dùng `error`; lược đồ v2
// dùng `failed`, và có thêm `pending` cho tài liệu vừa tải lên chưa tới lượt xử lý.
const labels: Record<DocumentStatus, string> = {
  pending: "Chờ xử lý",
  processing: "Đang xử lý",
  ready: "Sẵn sàng",
  failed: "Lỗi",
};

const colors: Record<DocumentStatus, string> = {
  pending: "bg-muted",
  processing: "bg-warning",
  ready: "bg-success",
  failed: "bg-danger",
};

export function StatusBadge({ status }: { status: DocumentStatus }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm leading-[22px] text-secondary">
      <span className={cn("size-1.5 rounded-full", colors[status])} aria-hidden="true" />
      {labels[status]}
    </span>
  );
}

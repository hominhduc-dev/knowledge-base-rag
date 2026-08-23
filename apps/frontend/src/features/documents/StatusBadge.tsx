import type { DocumentStatus } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const labels: Record<DocumentStatus, string> = { ready: "Sẵn sàng", processing: "Đang xử lý", error: "Lỗi" };
const colors: Record<DocumentStatus, string> = { ready: "bg-success", processing: "bg-warning", error: "bg-danger" };

export function StatusBadge({ status }: { status: DocumentStatus }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm leading-[22px] text-secondary">
      <span className={cn("size-1.5 rounded-full", colors[status])} aria-hidden="true" />
      {labels[status]}
    </span>
  );
}

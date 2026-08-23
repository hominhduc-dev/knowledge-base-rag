"use client";

import { useState } from "react";
import { FileUp } from "lucide-react";
import { cn } from "@/lib/utils";

export function UploadDropzone({ onFiles }: { onFiles: (files: File[]) => void }) {
  const [dragging, setDragging] = useState(false);

  function pick(files: FileList | null) {
    if (files?.length) onFiles(Array.from(files));
  }

  return (
    <div
      className={cn(
        "relative mt-7 flex h-[180px] flex-col items-center justify-center rounded-[12px] border border-dashed bg-sunken px-4 text-center focus-within:ring-2 focus-within:ring-accent",
        dragging ? "border-accent bg-accent-soft" : "border-border-strong",
      )}
      onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => { event.preventDefault(); setDragging(false); pick(event.dataTransfer.files); }}
    >
      <FileUp className="pointer-events-none mb-3 size-6 text-secondary" aria-hidden="true" />
      <div className="pointer-events-none text-[15px] font-medium leading-[26px]">Kéo tệp vào đây để tải lên</div>
      <div className="pointer-events-none mt-1 text-sm leading-[22px] text-secondary">PDF, DOCX · tối đa 40 MB mỗi tệp</div>
      <input type="file" accept=".pdf,.docx" multiple aria-label="Chọn tài liệu để tải lên" className="absolute inset-0 cursor-pointer opacity-0" onChange={(event) => pick(event.target.files)} />
    </div>
  );
}

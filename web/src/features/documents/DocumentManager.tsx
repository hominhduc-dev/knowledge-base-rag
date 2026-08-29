"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { documentChunks, documents, type KnowledgeDocument } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { DocumentTable } from "./DocumentTable";
import { UploadDropzone } from "./UploadDropzone";

type UploadItem = { id: string; name: string; progress: number; phase: "upload" | "process" | "done" };
type Filter = "Tất cả" | "Của khoa" | "Toàn trường";

export function DocumentManager() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("Tất cả");
  const [openDocument, setOpenDocument] = useState<KnowledgeDocument | null>(null);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (!uploads.some((item) => item.phase !== "done")) {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      intervalRef.current = null;
      return;
    }
    if (intervalRef.current) return;
    intervalRef.current = window.setInterval(() => {
      setUploads((items) => items.map((item) => {
        if (item.phase === "done") return item;
        const next = Math.min(100, item.progress + (item.phase === "upload" ? 14 : 9));
        if (next < 100) return { ...item, progress: next };
        if (item.phase === "upload") return { ...item, progress: 0, phase: "process" };
        return { ...item, progress: 100, phase: "done" };
      }));
    }, 220);
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    };
  }, [uploads]);

  function addFiles(files: File[]) {
    setUploads((items) => [...items, ...files.map((file) => ({ id: crypto.randomUUID(), name: file.name, progress: 0, phase: "upload" as const }))]);
  }

  const filtered = useMemo(() => documents.filter((document) => {
    const matchesFilter = filter === "Tất cả" || (filter === "Của khoa" ? document.unit !== "Toàn trường" : document.unit === "Toàn trường");
    return matchesFilter && document.name.toLocaleLowerCase("vi").includes(query.trim().toLocaleLowerCase("vi"));
  }), [filter, query]);

  if (openDocument) {
    const chunks = documentChunks[openDocument.code] ?? [];
    return (
      <section className="mx-auto w-full max-w-[1120px] px-6 pb-20 pt-10 sm:px-8">
        <button type="button" onClick={() => setOpenDocument(null)} className="mb-5 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-indigo"><ArrowLeft className="size-4" /> Tất cả tài liệu</button>
        <h1 className="max-w-[24em] font-serif text-[30px] font-semibold leading-[38px]">{openDocument.name}</h1>
        <dl className="mt-3.5 flex flex-wrap gap-x-8 gap-y-4 border-b border-border pb-6">
          {[
            ["Đơn vị", openDocument.unit], ["Số hiệu", openDocument.code], ["Số đoạn", String(openDocument.chunks)], ["Cập nhật", openDocument.updated],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-[13px] font-medium leading-5 text-muted">{label}</dt>
              <dd className={cn("m-0 text-[15px] leading-[26px]", label === "Số hiệu" || label === "Số đoạn" ? "font-mono text-[13px]" : "")}>{value}</dd>
            </div>
          ))}
        </dl>
        <h2 className="mb-1 mt-7 font-serif text-[22px] font-semibold leading-[30px]">Các đoạn đã tách</h2>
        <p className="mb-5 max-w-[60ch] text-sm leading-[22px] text-secondary">Mỗi đoạn giữ nguyên số hiệu điều khoản và số trang trong văn bản gốc để trích dẫn chính xác.</p>
        {chunks.length ? chunks.map((chunk) => (
          <article key={chunk.id} className="grid gap-3 border-b border-border py-[18px] sm:grid-cols-[200px_1fr] sm:gap-6">
            <div>
              <div className="font-mono text-[13px] leading-5 text-muted">{chunk.id}</div>
              <div className="mt-1 font-mono text-[13px] leading-5">{chunk.locator}</div>
            </div>
            <p className="reading-width m-0 text-[15px] leading-[26px]">{chunk.text}</p>
          </article>
        )) : <p className="mt-6 text-[15px] leading-[26px] text-muted">Bản dựng chưa nạp nội dung đoạn cho tài liệu này.</p>}
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-[1120px] px-6 pb-20 pt-10 sm:px-8">
      <div className="flex flex-wrap items-end gap-5">
        <div>
          <h1 className="font-serif text-[30px] font-semibold leading-[38px]">Tài liệu</h1>
          <p className="mt-2 text-[15px] leading-[26px] text-secondary">Giáo vụ Khoa Công nghệ Thông tin · quản lý tài liệu của khoa</p>
        </div>
        <Button className="ml-auto" onClick={() => document.getElementById("mock-upload")?.click()}><Upload className="size-4" /> Tải tài liệu lên</Button>
        <input id="mock-upload" type="file" accept=".pdf,.docx" multiple className="hidden" onChange={(event) => addFiles(Array.from(event.target.files ?? []))} />
      </div>

      <UploadDropzone onFiles={addFiles} />

      {uploads.length > 0 && (
        <div className="mt-5 overflow-hidden rounded-[12px] border border-border bg-surface">
          {uploads.map((item) => (
            <div key={item.id} className="border-b border-sunken px-[18px] py-3.5 last:border-0">
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1 truncate text-[15px] font-medium leading-6">{item.name}</div>
                <div className="font-mono text-[13px] text-secondary">{item.phase === "upload" ? `Đang tải ${item.progress}%` : item.phase === "process" ? `Đang tách đoạn ${item.progress}%` : "Sẵn sàng · 41 đoạn"}</div>
              </div>
              <div className="mt-2.5 h-[3px] overflow-hidden rounded-sm bg-sunken"><div className={cn("h-full transition-[width] duration-200", item.phase === "done" ? "bg-success" : "bg-warning")} style={{ width: `${item.phase === "done" ? 100 : item.progress}%` }} /></div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm theo tên tài liệu…" className="min-w-[220px] flex-1" />
        <div className="flex gap-1.5">
          {(["Tất cả", "Của khoa", "Toàn trường"] as Filter[]).map((item) => (
            <button key={item} type="button" onClick={() => setFilter(item)} className={cn("min-h-11 rounded-[8px] border px-3.5 text-sm", filter === item ? "border-primary bg-sunken font-medium" : "border-border bg-transparent")}>{item}</button>
          ))}
        </div>
      </div>

      <DocumentTable documents={filtered} onOpen={setOpenDocument} />
    </section>
  );
}

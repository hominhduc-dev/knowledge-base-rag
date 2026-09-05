"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCurrentUser, useMemberships } from "@/features/auth/useAuth";
import { canManageContent } from "@/features/admin/permissions";
import { ApiError } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import {
  chiTiet,
  danhSach,
  danhSachDoan,
  dinhDangNgay,
  taiLen,
  tienDo,
  xoa,
  type ChunkItem,
  type DocumentDetail,
  type KnowledgeDocument,
} from "./api";
import { DocumentTable } from "./DocumentTable";
import { UploadDropzone } from "./UploadDropzone";

type Filter = "all" | "department" | "global";

const NHAN_LOC: Record<Filter, string> = {
  all: "Tất cả",
  department: "Ngành CNTT",
  global: "Quy định chung",
};

/**
 * Một tệp đang được nạp.
 *
 * `progress` chỉ có ý nghĩa ở pha `process`, và là con số THẬT máy chủ báo qua
 * `/documents/:id/status`. Bản trước chạy một thanh tiến trình giả bằng
 * `setInterval` — nó luôn chạy đều đặn tới 100% kể cả khi việc xử lý đã hỏng.
 */
type UploadItem = {
  key: string;
  name: string;
  documentId: string | null;
  phase: "upload" | "process" | "done" | "error";
  progress: number;
  chunks: number;
  message: string | null;
};

export function DocumentManager() {
  const user = useCurrentUser();
  const laAdmin = canManageContent(user?.roleCode);
  const memberships = useMemberships();
  const [category, setCategory] = useState("cntt");
  const cnttId = memberships.find((m) => m.code === "CNTT")?.departmentId;

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [items, setItems] = useState<KnowledgeDocument[]>([]);
  const [dangTai, setDangTai] = useState(true);
  const [loi, setLoi] = useState<string | null>(null);
  const [dangXoa, setDangXoa] = useState<string | null>(null);
  const [uploads, setUploads] = useState<UploadItem[]>([]);

  const [moTaiLieu, setMoTaiLieu] = useState<DocumentDetail | null>(null);
  const [doanVan, setDoanVan] = useState<ChunkItem[]>([]);
  const [dangTaiChiTiet, setDangTaiChiTiet] = useState(false);

  // --- Danh sách ------------------------------------------------------------
  //
  // Đánh số thứ tự mỗi lần gọi, và chỉ nhận kết quả của lần MỚI NHẤT.
  //
  // Không có chốt này thì đổi bộ lọc nhanh sẽ hỏng: bấm "Của khoa" rồi bấm ngay
  // "Toàn trường", nếu phản hồi của lần đầu về SAU thì nó ghi đè lên kết quả
  // đúng — màn hình hiện tài liệu của khoa trong khi nút "Toàn trường" đang
  // sáng. Lỗi không ném exception nào và chỉ xuất hiện khi mạng chậm, nên rất
  // khó tái hiện trên máy phát triển.
  const luotGoi = useRef(0);

  const nap = useCallback(async () => {
    const luot = ++luotGoi.current;
    setLoi(null);
    try {
      const kq = await danhSach({ q: query.trim() || undefined, scope: filter });
      if (luot !== luotGoi.current) return; // đã có lần gọi mới hơn
      setItems(kq.items);
    } catch (error) {
      if (luot !== luotGoi.current) return;
      setLoi(error instanceof ApiError ? error.message : "Không tải được danh sách tài liệu.");
    } finally {
      if (luot === luotGoi.current) setDangTai(false);
    }
  }, [query, filter]);

  useEffect(() => {
    // Chờ một nhịp trước khi gọi, để gõ từng ký tự trong ô tìm kiếm không bắn
    // một request mỗi phím.
    const hen = window.setTimeout(() => void nap(), 250);
    return () => window.clearTimeout(hen);
  }, [nap]);

  // --- Theo dõi tiến trình xử lý -------------------------------------------
  useEffect(() => {
    const dangChay = uploads.filter((u) => u.documentId && (u.phase === "process" || u.phase === "upload"));
    if (dangChay.length === 0) return;

    const hen = window.setInterval(async () => {
      let coHoanTat = false;

      for (const u of dangChay) {
        if (!u.documentId) continue;
        try {
          const t = await tienDo(u.documentId);
          setUploads((cur) =>
            cur.map((x) =>
              x.key !== u.key
                ? x
                : {
                    ...x,
                    phase: t.status === "ready" ? "done" : t.status === "failed" ? "error" : "process",
                    progress: t.progress,
                    chunks: t.chunks,
                    message: t.error,
                  },
            ),
          );
          if (t.status === "ready" || t.status === "failed") coHoanTat = true;
        } catch {
          // Một lần hỏi hụt không đáng dừng cả vòng theo dõi.
        }
      }

      // Xong một tài liệu thì nạp lại danh sách để thấy nó xuất hiện.
      if (coHoanTat) void nap();
    }, 1500);

    return () => window.clearInterval(hen);
  }, [uploads, nap]);

  async function themTep(files: File[]) {
    if (category === "cntt" && !cnttId) { setLoi("Không xác định được kho CNTT. Hãy đăng nhập lại."); return; }
    for (const file of files) {
      const key = crypto.randomUUID();
      // Tiêu đề mặc định lấy từ tên tệp, bỏ phần đuôi.
      const title = file.name.replace(/\.(pdf|docx)$/i, "").trim() || file.name;

      setUploads((cur) => [
        ...cur,
        { key, name: file.name, documentId: null, phase: "upload", progress: 0, chunks: 0, message: null },
      ]);

      try {
        const kq = await taiLen(file, title, category === "cntt" ? cnttId : null);
        setUploads((cur) =>
          cur.map((x) => (x.key === key ? { ...x, documentId: kq.documentId, phase: "process" } : x)),
        );
      } catch (error) {
        setUploads((cur) =>
          cur.map((x) =>
            x.key === key
              ? {
                  ...x,
                  phase: "error",
                  message: error instanceof ApiError ? error.message : "Tải lên thất bại.",
                }
              : x,
          ),
        );
      }
    }
  }

  async function moChiTiet(doc: KnowledgeDocument) {
    setDangTaiChiTiet(true);
    try {
      const [ct, doan] = await Promise.all([chiTiet(doc.id), danhSachDoan(doc.id)]);
      setMoTaiLieu(ct);
      setDoanVan(doan.items);
    } catch (error) {
      setLoi(error instanceof ApiError ? error.message : "Không mở được tài liệu.");
    } finally {
      setDangTaiChiTiet(false);
    }
  }

  async function xoaTaiLieu(doc: KnowledgeDocument) {
    if (!window.confirm(`Xóa "${doc.name}"? Thao tác này không hoàn tác được.`)) return;
    setDangXoa(doc.id);
    try {
      await xoa(doc.id);
      await nap();
    } catch (error) {
      setLoi(error instanceof ApiError ? error.message : "Không xóa được tài liệu.");
    } finally {
      setDangXoa(null);
    }
  }

  // ==========================================================================
  // MÀN CHI TIẾT
  // ==========================================================================
  if (moTaiLieu) {
    const d = moTaiLieu.document;
    return (
      <section className="mx-auto w-full max-w-[1120px] px-6 pb-20 pt-10 sm:px-8">
        <button
          type="button"
          onClick={() => { setMoTaiLieu(null); setDoanVan([]); }}
          className="mb-5 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-indigo"
        >
          <ArrowLeft className="size-4" /> Tất cả tài liệu
        </button>

        <h1 className="max-w-[24em] font-serif text-[30px] font-semibold leading-[38px]">{d.name}</h1>

        <dl className="mt-3.5 flex flex-wrap gap-x-8 gap-y-4 border-b border-border pb-6">
          {(
            [
              ["Đơn vị", d.unit, false],
              ["Định dạng", d.sourceType, true],
              ["Số trang", d.pageCount === null ? "—" : String(d.pageCount), true],
              ["Số đoạn", String(moTaiLieu.chunkCount), true],
              ["Người tải lên", d.uploadedBy, false],
              ["Cập nhật", dinhDangNgay(d.updated), false],
            ] as [string, string, boolean][]
          ).map(([nhan, giaTri, mono]) => (
            <div key={nhan}>
              <dt className="text-[13px] font-medium leading-5 text-muted">{nhan}</dt>
              <dd className={cn("m-0 text-[15px] leading-[26px]", mono && "font-mono text-[13px]")}>
                {giaTri}
              </dd>
            </div>
          ))}
        </dl>

        {d.errorMessage && (
          <p role="alert" className="mt-5 rounded-[8px] border border-danger/30 bg-danger/5 px-4 py-3 text-sm leading-[22px] text-danger">
            {d.errorMessage}
          </p>
        )}

        <h2 className="mb-1 mt-7 font-serif text-[22px] font-semibold leading-[30px]">Các đoạn đã tách</h2>
        <p className="mb-5 max-w-[60ch] text-sm leading-[22px] text-secondary">
          Mỗi đoạn giữ nguyên vị trí trong cấu trúc văn bản và số trang gốc, để trích dẫn chỉ đúng chỗ.
        </p>

        {doanVan.length ? (
          doanVan.map((c) => (
            <article key={c.id} className="grid gap-3 border-b border-border py-[18px] sm:grid-cols-[220px_1fr] sm:gap-6">
              <div>
                <div className="font-mono text-[13px] leading-5 text-muted">#{c.index}</div>
                <div className="mt-1 font-mono text-[13px] leading-5">{c.locator}</div>
              </div>
              <p className="reading-width m-0 text-[15px] leading-[26px]">{c.text}</p>
            </article>
          ))
        ) : (
          <p className="mt-6 text-[15px] leading-[26px] text-muted">
            Tài liệu này chưa có đoạn nào — có thể việc xử lý chưa xong hoặc đã thất bại.
          </p>
        )}
      </section>
    );
  }

  // ==========================================================================
  // MÀN DANH SÁCH
  // ==========================================================================
  return (
    <section className="mx-auto w-full max-w-[1120px] px-6 pb-20 pt-10 sm:px-8">
      <div className="flex flex-wrap items-end gap-5">
        <div>
          <h1 className="font-serif text-[30px] font-semibold leading-[38px]">Tài liệu</h1>
          <p className="mt-2 text-[15px] leading-[26px] text-secondary">
            {/* Lấy từ phiên đăng nhập, không cứng hóa một khoa như bản trước. */}
            {user ? `${user.role} · ${user.scope}` : ""}
            {laAdmin ? " · quản lý tài liệu" : " · chỉ xem"}
          </p>
        </div>

        {/* Chỉ SYSTEM_ADMIN mới tải lên được. Máy chủ chặn bằng `requireAdmin`; ẩn ở đây
            chỉ để sinh viên không bấm vào rồi nhận 403. */}
        {laAdmin && (
          <>
            <Button className="ml-auto" onClick={() => document.getElementById("chon-tep")?.click()}>
              <Upload className="size-4" /> Tải tài liệu lên
            </Button>
            <input
              id="chon-tep"
              type="file"
              accept=".pdf,.docx"
              multiple
              className="hidden"
              onChange={(event) => {
                void themTep(Array.from(event.target.files ?? []));
                event.target.value = "";
              }}
            />
          </>
        )}
      </div>

      {laAdmin && (
        <label className="mt-5 flex flex-wrap items-center gap-3 text-sm">
          Nhóm tài liệu tải lên
          <select aria-label="Nhóm tài liệu tải lên" value={category} onChange={(e) => setCategory(e.target.value)} className="min-h-10 rounded-[8px] border border-border px-3">
            <option value="cntt">Tài liệu ngành CNTT</option>
            <option value="common">Quy định chung áp dụng cho sinh viên CNTT</option>
          </select>
        </label>
      )}
      {laAdmin && <UploadDropzone onFiles={(files) => void themTep(files)} />}

      {uploads.length > 0 && (
        <div className="mt-5 overflow-hidden rounded-[12px] border border-border bg-surface">
          {uploads.map((item) => (
            <div key={item.key} className="border-b border-sunken px-[18px] py-3.5 last:border-0">
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1 truncate text-[15px] font-medium leading-6">{item.name}</div>
                <div className={cn("font-mono text-[13px]", item.phase === "error" ? "text-danger" : "text-secondary")}>
                  {item.phase === "upload"
                    ? "Đang tải lên…"
                    : item.phase === "process"
                      ? `Đang tách đoạn ${item.progress}%`
                      : item.phase === "done"
                        ? `Sẵn sàng · ${item.chunks} đoạn`
                        : "Thất bại"}
                </div>
              </div>
              <div className="mt-2.5 h-[3px] overflow-hidden rounded-sm bg-sunken">
                <div
                  className={cn(
                    "h-full transition-[width] duration-300",
                    item.phase === "done" ? "bg-success" : item.phase === "error" ? "bg-danger" : "bg-warning",
                  )}
                  style={{ width: `${item.phase === "done" || item.phase === "error" ? 100 : item.progress}%` }}
                />
              </div>
              {item.message && (
                <p className="mt-2 text-[13px] leading-5 text-danger">{item.message}</p>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Tìm theo tên tài liệu…"
          className="min-w-[220px] flex-1"
        />
        <div className="flex gap-1.5">
          {(Object.keys(NHAN_LOC) as Filter[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cn(
                "min-h-11 rounded-[8px] border px-3.5 text-sm",
                filter === f ? "border-primary bg-sunken font-medium" : "border-border bg-transparent",
              )}
            >
              {NHAN_LOC[f]}
            </button>
          ))}
        </div>
      </div>

      {loi && (
        <p role="alert" className="mt-5 text-sm leading-[22px] text-danger">{loi}</p>
      )}

      {dangTai || dangTaiChiTiet ? (
        <p className="my-6 text-[15px] leading-[26px] text-muted">Đang tải…</p>
      ) : (
        <>
          <DocumentTable
            documents={items}
            onOpen={(d) => void moChiTiet(d)}
            onDelete={(d) => void xoaTaiLieu(d)}
            dangXoa={dangXoa}
          />
          <p className="mt-5 text-[13px] leading-5 text-muted">
            {items.length} tài liệu trong phạm vi của bạn.
            {!laAdmin && " Chỉ quản trị viên mới tải lên hoặc gỡ tài liệu."}
          </p>
        </>
      )}
    </section>
  );
}

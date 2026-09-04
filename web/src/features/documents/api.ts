// ---------------------------------------------------------------------------
// Gọi API tài liệu — docs/api-contract.md mục 6.
//
// Tách khỏi component để chỗ nào cần cũng dùng chung một định nghĩa, và để khi
// dựng `packages/shared/` thì chỉ phải chuyển file này.
// ---------------------------------------------------------------------------
import { apiClient, TOKEN_KEY } from "@/lib/api-client";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

/** Bốn trạng thái của máy chủ. Khác mock cũ: `failed`, không phải `error`. */
export type DocumentStatus = "pending" | "processing" | "ready" | "failed";

export type KnowledgeDocument = {
  id: string;
  name: string;
  unit: string;
  status: DocumentStatus;
  chunks: number;
  /** ISO 8601 — giao diện tự định dạng, xem `dinhDangNgay`. */
  updated: string;
  isGlobal: boolean;
  /** Máy chủ tính sẵn. Giao diện KHÔNG tự suy từ vai. */
  canEdit: boolean;
};

export type ChunkItem = {
  id: string;
  index: number;
  text: string;
  locator: string;
  headingPath: string | null;
  pageFrom: number | null;
  pageTo: number | null;
};

export type DocumentDetail = {
  document: KnowledgeDocument & {
    sourceType: string;
    pageCount: number | null;
    createdAt: string;
    uploadedBy: string;
    errorMessage: string | null;
  };
  chunkCount: number;
  job: { status: string; retryCount: number; lastError: string | null } | null;
};

export type DocumentProgress = {
  status: DocumentStatus;
  phase: "upload" | "process" | "done";
  progress: number;
  chunks: number;
  error: string | null;
};

export type ListParams = {
  q?: string;
  scope?: "all" | "department" | "global";
  page?: number;
  pageSize?: number;
};

export function danhSach(params: ListParams = {}) {
  const qs = new URLSearchParams();
  if (params.q) qs.set("q", params.q);
  if (params.scope && params.scope !== "all") qs.set("scope", params.scope);
  qs.set("page", String(params.page ?? 1));
  qs.set("pageSize", String(params.pageSize ?? 50));
  return apiClient<{ items: KnowledgeDocument[]; total: number; page: number; pageSize: number }>(
    `/documents?${qs}`,
  );
}

export function chiTiet(id: string) {
  return apiClient<DocumentDetail>(`/documents/${id}`);
}

export function danhSachDoan(id: string) {
  return apiClient<{ items: ChunkItem[]; total: number }>(`/documents/${id}/chunks?pageSize=200`);
}

export function tienDo(id: string) {
  return apiClient<DocumentProgress>(`/documents/${id}/status`);
}

export function xoa(id: string) {
  return apiClient<null>(`/documents/${id}`, { method: "DELETE" });
}

/**
 * Tải tài liệu lên.
 *
 * KHÔNG dùng `apiClient` được: nó luôn đặt `Content-Type: application/json`, mà
 * `multipart/form-data` cần trình duyệt tự sinh header kèm `boundary`. Đặt tay
 * là hỏng phần phân tách và máy chủ không đọc được tệp.
 */
export async function taiLen(file: File, title: string, departmentId?: string | null) {
  let token: string | null = null;
  try {
    token = window.localStorage.getItem(TOKEN_KEY);
  } catch {
    token = null;
  }

  const form = new FormData();
  form.append("file", file);
  form.append("title", title);
  if (departmentId) form.append("departmentId", departmentId);

  const res = await fetch(`${apiUrl}/documents`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });

  const body = await res.json().catch(() => null);
  if (!res.ok || body?.success === false) {
    const { ApiError } = await import("@/lib/api-client");
    throw new ApiError(
      body?.error?.code ?? "UNKNOWN",
      body?.error?.message ?? `Tải lên thất bại (HTTP ${res.status}).`,
      res.status,
    );
  }
  return body.data as { documentId: string; status: string; jobId: string };
}

/**
 * ISO 8601 → `dd/MM/yyyy`.
 *
 * Máy chủ trả ISO vì chuỗi `dd/MM/yyyy` không sắp xếp được và mơ hồ về múi giờ;
 * việc định dạng là của giao diện.
 */
export function dinhDangNgay(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

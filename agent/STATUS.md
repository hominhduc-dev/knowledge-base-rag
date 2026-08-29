# Trạng thái dự án Tàng Thư

**Cập nhật:** 29/08/2026
**Giai đoạn:** Sprint 1 — đang chạy, vừa chuyển sang thiết kế v2.0
**Stack:** pnpm workspace · Next.js (`web/`) · Express (`server/`) · Postgres 16 + pgvector trong Docker

> **Đổi trọng tâm.** Dự án nay là đồ án **môn Lập trình mạng máy tính**, không phải
> một ứng dụng web thuần. Nguồn sự thật là `THIET-KE-HE-THONG.md` v2.0 và
> `TONG-QUAN-DU-AN.md` — hai tài liệu này **chưa được chuyển vào `docs/`**, và sáu
> tài liệu đang nằm trong `docs/` vẫn mô tả thiết kế v1 đã bị thay thế.

## Tổng quan

| Khu vực | Trạng thái | Ghi chú |
|---|---|---|
| Cấu trúc | **Đã đổi sang `server/` + `web/`** | Theo mục 2.4 tài liệu thiết kế |
| Cơ sở dữ liệu | **Postgres 16 local, đã migrate và seed** | `db:check` 25/25 · vector 1536 chiều |
| Xác thực | **Chạy thật, đã kiểm bằng curl** | 2 vai, phạm vi qua `department_members` |
| Cách ly phạm vi | **6/6 test đạt trên dữ liệu thật** | `lib/scope.ts` là nơi duy nhất giữ quy tắc |
| Module `netlab` | **Xong, 16/16 test đạt** | TCP 9999 · HTTP tự viết 8080 |
| Docker | `db` chạy được; `api`/`web` **chưa build thử** | 4 dịch vụ + Caddy đã viết |
| Truy hồi | Bản tạm — 3 kết quả cứng | Chờ khóa Gemini để sinh vector |
| Frontend | **Chưa đụng tới** | Vẫn mock, vẫn 4 vai |
| Tài liệu | **Lệch hẳn với code** | 6 file trong `docs/` mô tả v1 |
| CI/CD | Chưa có `.github/` | Test rò rỉ phạm vi phải là điều kiện chặn merge |

## Hạ tầng

- [x] Đổi `apps/backend` → `server`, `apps/frontend` → `web`.
- [x] `docker-compose.yml` — `db` · `api` · `web` · `caddy`; chỉ Caddy mở cổng ra LAN.
- [x] Hai Dockerfile build nhiều tầng; `web` dùng `output: "standalone"`.
- [x] `Caddyfile` gộp giao diện và API về cùng gốc, `flush_interval -1` cho SSE.
- [x] Postgres 16.15 + pgvector, `maintenance_work_mem=512MB`.
- [ ] Chưa chạy `docker compose build` cho `api` và `web`.
- [ ] Chưa thử demo LAN từ máy khác.

## Cơ sở dữ liệu

- [x] `schema.prisma` v2 — 15 model, 5 enum, `chunk_embeddings` tách riêng, vector 1536.
- [x] Migration `20260829031547_init` — 404 dòng, đã áp dụng.
- [x] Năm khối SQL viết tay: `content_tsv` sinh tự động · HNSW · GIN · `lower(email)` ·
      trigger đồng bộ phạm vi.
- [x] `db:check` — **25/25 đạt**.
- [x] `db:seed` — 5 đơn vị · 6 cán bộ · 57 sinh viên · 7 tài liệu · 13 đoạn văn.
- [x] Cặp đối chứng đổi sang CNTT (105 tín chỉ) ↔ Kiến trúc (90 tín chỉ).
- [ ] Sinh vector nhúng cho 13 đoạn văn — **cần `GEMINI_API_KEY`**.

## Backend

- [x] Express 5 + TypeScript tại `server/src`, bind `0.0.0.0`.
- [x] `lib/scope.ts` — nơi DUY NHẤT giữ quy tắc phạm vi, hai bản Prisma và SQL thô.
- [x] `lib/roles.ts` — 2 vai, `effectiveRole` gộp nhiều tư cách thành viên.
- [x] `middleware/auth` — JWT chỉ mang `sub`, vai và đơn vị đọc lại mỗi request.
- [x] `middleware/role` — `requireRole` / `requireAdmin`.
- [x] `modules/auth/` — `POST /auth/login` · `GET /auth/me` · `PUT /auth/password`,
      trả kèm `memberships[]`.
- [x] `GET /health` — `{status, uptime, pendingJobs}`.
- [x] `modules/retrieval/` — `POST /search`, bản tạm 3 kết quả cứng.
- [ ] `modules/documents/` — `/documents/*` (TV2).
- [ ] `modules/chat/` — `POST /chat` SSE và `/conversations/*` (TV3).
- [ ] `/departments/*` và `/departments/:id/members` (TV4).
- [ ] `retrieval.sql.ts` — truy vấn lai thật.
- [ ] `rag/` — `chunk.ts` · `embed.ts` · `retrieve.ts` · `generate.ts` · `prompt.ts`.
- [ ] `worker/` — vòng lặp đọc `ingest_jobs`.
- [ ] `eval/` — bộ 30 câu hỏi vàng, 9 thí nghiệm.

## Module netlab — môn Lập trình mạng

- [x] `framing.ts` — `LineFramer` (delimiter) và `LengthPrefixFramer` (length-prefix).
- [x] `tcp-server.ts` cổng 9999 — nhiều client, tắt an toàn SIGINT, có bảng đối chiếu
      vòng đời socket C# ↔ Node viết ngay trong mã.
- [x] `tcp-client.ts` — cờ `--split` trình diễn chuyện framing.
- [x] `http-server.ts` cổng 8080 — HTTP/1.1 tự viết trên `net`, keep-alive.
- [x] 16 test đạt, gồm request cắt làm ba giữa tên header và giữa thân JSON.
- [x] Số đo đã có: `Content-Length` khai 225 = thực nhận 225; `string.length` sẽ ra 189.
- [ ] Bắt gói Wireshark.
- [ ] Ngân sách độ trễ, thí nghiệm tải `autocannon`, so keep-alive với close.

## Frontend

Giao diện đã hoàn thiện từ trước và **chưa được đụng tới trong bản chuyển đổi này**.

- [ ] `api-client.ts` — thêm `ApiError`, bóc lớp vỏ `data`.
- [ ] `LoginForm.tsx` nối vào API thật, đổi state `email` → `account`.
- [ ] **Xóa khối `demoUsers`** trong `features/auth/useAuth.ts`.
- [ ] `PermissionMatrix.tsx` xuống 2 cột; bỏ `RoleSelect.tsx`.
- [ ] Bỏ mock cho tài liệu, hội thoại, quản trị.

## Tài liệu

- [ ] **Chuyển `THIET-KE-HE-THONG.md` và `TONG-QUAN-DU-AN.md` từ `~/Downloads` vào `docs/`.**
- [ ] Viết lại `docs/phan-quyen.md` — 2 vai, `department_members`.
- [ ] Viết lại `docs/erd.md` theo lược đồ v2.
- [ ] Sửa `docs/api-contract.md` — bổ sung `INTERNAL_ERROR`, ghi nhận đăng nhập bằng mã,
      đổi shape `/health`, đổi tên sự kiện SSE thành `sources → token* → done`.
- [ ] Viết lại `docs/cau-truc-thu-muc.md` cho `server/` + `web/` + `netlab/`.
- [ ] Xóa hoặc gộp `docs/phan-tich-thiet-ke-he-thong.md` — đã bị v2.0 thay thế.
- [ ] `README.md` — bỏ Supabase/Vercel/Hostinger, thay bằng `docker compose up`.
- [ ] Sửa mục 3.2 và 9.1 tài liệu thiết kế: vector **1536** chiều, không phải 768.
- [ ] Sửa mục 11: "chuyển model không downtime" chỉ đúng với model cùng số chiều.

## Kiểm tra gần nhất

```bash
docker compose up -d db
corepack pnpm --filter @tang-thu/server run db:check     # 25/25 đạt
corepack pnpm --filter @tang-thu/server run db:seed      # đạt
corepack pnpm --filter @tang-thu/server run test         # 22/22 đạt
corepack pnpm run typecheck                              # cả hai package, đạt
```

Endpoint hiện có:

```text
GET  /api/health
POST /api/auth/login          đã chạy thật
GET  /api/auth/me             đã chạy thật
PUT  /api/auth/password
POST /api/search              bản tạm: 3 kết quả cứng
```

## Blocker hiện tại

- **Chưa có `GEMINI_API_KEY`** — chặn sinh vector, do đó chặn nhánh vector của truy hồi.
  Nhánh từ khóa đã chạy và đủ để kiểm chứng cách ly phạm vi.

Supabase đã bị loại khỏi thiết kế nên blocker cũ không còn.

## Thứ tự công việc tiếp theo

1. Chuyển hai tài liệu v2.0 vào `docs/`, viết lại `phan-quyen.md` và `erd.md`.
2. Sửa `api-client.ts`, nối `LoginForm` vào API thật, xóa `demoUsers`.
3. Sửa giao diện xuống 2 vai.
4. `docker compose build` để kiểm hai Dockerfile chưa từng chạy.
5. Dựng `modules/documents/` — upload → parse → chunk → lưu CSDL.
6. Viết `retrieval.sql.ts` thật, thay bản tạm.

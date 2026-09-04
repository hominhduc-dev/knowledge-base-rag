# Trạng thái dự án Tàng Thư

**Cập nhật:** 29/08/2026
**Giai đoạn:** Sprint 1 — đang chạy, vừa chuyển sang thiết kế v2.0
**Stack:** pnpm workspace · Next.js (`web/`) · Express (`server/`) · Postgres 16 + pgvector trong Docker

> **Đổi trọng tâm.** Dự án nay là đồ án **môn Lập trình mạng máy tính**, không phải
> một ứng dụng web thuần. Nguồn sự thật là `docs/THIET-KE-HE-THONG.md` v2.0 và
> `docs/TONG-QUAN-DU-AN.md`.
>
> **Cảnh báo:** còn `cau-truc-thu-muc.md` mô tả bản cũ (`apps/backend`, chưa có `netlab`).
> `phan-quyen.md`, `erd.md` và `api-contract.md` đã khớp v2.
> `phan-tich-thiet-ke-he-thong.md` đã xóa — bị `THIET-KE-HE-THONG.md` thay thế hẳn.

## Tổng quan

| Khu vực | Trạng thái | Ghi chú |
|---|---|---|
| Cấu trúc | **Đã đổi sang `server/` + `web/`** | Theo mục 2.4 tài liệu thiết kế |
| Cơ sở dữ liệu | **Postgres 16 local, đã migrate và seed** | `db:check` 25/25 · vector 1536 chiều |
| Xác thực | **Chạy thật, đã kiểm bằng curl** | 2 vai, phạm vi qua `department_members` |
| Cách ly phạm vi | **6/6 test đạt trên dữ liệu thật** | `lib/scope.ts` là nơi duy nhất giữ quy tắc |
| Module `netlab` | **Xong, 16/16 test đạt** | TCP 9999 · HTTP tự viết 8080 |
| Docker | `db` chạy được; `api`/`web` **chưa build thử** | 4 dịch vụ + Caddy đã viết |
| Truy hồi | **Đã có truy vấn lai thật** | RRF vector + toàn văn, lọc phạm vi trong SQL |
| Frontend | **Đăng nhập và chat box đã nối API thật** | `demoUsers` đã xóa; chat gọi `/search`; documents/admin còn mock |
| Tài liệu | **Gần khớp** | Chỉ còn `cau-truc-thu-muc.md` chưa cập nhật |
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
- [x] `db:check` — **27/27 đạt**, có kiểm cả chuẩn L2 của vector.
- [x] `db:seed` — 5 đơn vị · 6 cán bộ · 57 sinh viên · 7 tài liệu · 13 đoạn văn.
- [x] Cặp đối chứng đổi sang CNTT (105 tín chỉ) ↔ Kiến trúc (90 tín chỉ).
- [x] **Sinh vector nhúng cho 13 đoạn mồi + 2 PDF thật** — `db:embed`/pipeline chạy
      đạt, `gemini-embedding-2` hiện có 30 vector, chuẩn L2 = 1.000000.
- [x] Đổi sang **`gemini-embedding-2`**. Bảng hiện giữ CẢ HAI bộ vector (13 của
      `-001`, 30 của `-2`) — đúng thiết kế đa model, phục vụ so sánh ở Sprint 4.
- [!] **Trước Sprint 4:** `seed.ts` xóa-rồi-tạo lại `chunks`, mà `eval_gold_chunks.chunk_id`
      có `ON DELETE CASCADE` — chạy lại seed sẽ xóa sạch liên kết câu hỏi vàng, không báo
      gì. Chưa hại vì bộ `golden-30` còn rỗng. Xem `docs/erd.md` mục 5.1.

## Backend

- [x] Express 5 + TypeScript tại `server/src`, bind `0.0.0.0`.
- [x] `lib/scope.ts` — nơi DUY NHẤT giữ quy tắc phạm vi, hai bản Prisma và SQL thô.
- [x] `lib/roles.ts` — 2 vai, `effectiveRole` gộp nhiều tư cách thành viên.
- [x] `middleware/auth` — JWT chỉ mang `sub`, vai và đơn vị đọc lại mỗi request.
- [x] `middleware/role` — `requireRole` / `requireAdmin`.
- [x] `modules/auth/` — `POST /auth/login` · `GET /auth/me` · `PUT /auth/password`,
      trả kèm `memberships[]`.
- [x] Quy ước mật khẩu seed: sinh viên dùng chính MSSV; cán bộ/admin dùng
      `Tangthu@123`.
- [x] `GET /health` — `{status, uptime, pendingJobs}`.
- [x] `modules/retrieval/` — `POST /search`, truy hồi lai thật.
- [x] `modules/documents/` — 9 endpoint: liệt kê · chi tiết · chunks · trạng thái ·
      tệp gốc · tải lên · sửa · xóa · chạy lại.
- [x] `rag/chunk.ts` — cắt theo Điều/Khoản, 40 test đạt.
- [x] `worker/ingest.worker.ts` — `FOR UPDATE SKIP LOCKED`, thu hồi job treo, dừng
      sau 3 lần thử; lỗi định dạng thì không thử lại.
- [x] `middleware/upload.middleware.ts` — multer, trần 20 MB, chỉ PDF/DOCX.
- [ ] `modules/chat/` — `POST /chat` SSE và `/conversations/*` (TV3).
- [ ] `/departments/*` và `/departments/:id/members` (TV4).
- [x] `retrieval.sql.ts` — truy vấn lai thật: RRF vector + toàn văn, lọc phạm vi trong
      `WHERE`, JOIN embedding có `e.model = MODEL_HIEN_TAI`. Đã sửa regression
      “chuẩn đầu ra sinh viên công nghệ thông tin” để top 1 về `Chương 2 > Điều 2`.
- [x] `rag/embed.ts` — chuẩn hóa L2, cache theo `content_hash`, lô 64, lùi có nhiễu.
- [ ] `rag/` — còn `retrieve.ts` · `generate.ts` · `prompt.ts`.
- [!] **Bẫy đa model:** có 2 model trong `chunk_embeddings`. Truy vấn JOIN mà quên
      `AND e.model = ...` sẽ trả mỗi đoạn HAI lần, không báo lỗi. Dùng hằng số
      `MODEL_HIEN_TAI` trong `rag/embed.ts`. `db:check` đã cảnh báo việc này.
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

- [x] `api-client.ts` viết lại — `ApiError` giữ mã lỗi, bóc lớp vỏ `data`, xử lý
      lỗi mạng và phản hồi không phải JSON.
- [x] **Đã xóa hẳn khối `demoUsers`** — không còn đường đăng nhập nào không qua máy chủ.
- [x] `useAuth.ts` viết lại — phiên thật, token trong localStorage, khôi phục bằng
      `GET /auth/me`.
- [x] `AuthGuard` mới, gắn vào `(app)/layout.tsx`.
- [x] `LoginForm` gọi `POST /auth/login` thật, có trạng thái đang gửi.
- [x] `UserMenu` — nút Đăng xuất giờ **thật sự** xóa phiên (trước là `<Link>` chỉ
      điều hướng, token vẫn nằm nguyên).
- [x] `ChatBox` — khóa phạm vi theo `roleCode`, chỉ ADMIN đổi được; câu hỏi gửi tới
      `POST /search` và hiện nguồn trả về từ retrieval thật.
- [x] `PermissionMatrix.tsx` xuống 2 cột, đọc từ hằng số `features/admin/permissions.ts`
      thay vì `mock-data.ts`; đã xóa `RoleSelect.tsx`.
- [x] `UserTable` bỏ ô chọn vai giả — nút "Đổi vai" vô hiệu hóa kèm ghi chú, vì
      `PATCH /users/:id` chưa có.
- [ ] Bỏ mock cho tài liệu, hội thoại, quản trị.

## Tài liệu

- [x] Chuyển `THIET-KE-HE-THONG.md` và `TONG-QUAN-DU-AN.md` vào `docs/`.
- [x] Viết lại `docs/phan-quyen.md` — 2 vai, `department_members`, 6 test cách ly.
- [x] Viết lại `docs/erd.md` — 15 bảng, đã đối chiếu với CSDL đang chạy.
- [x] Viết lại `docs/api-contract.md` — 12 mục, đã đối chiếu từng khẳng định với API
      đang chạy. Chốt camelCase, đổi `articleRef` → `headingPath`, SSE còn 4 sự kiện.
- [ ] Viết lại `docs/cau-truc-thu-muc.md` cho `server/` + `web/` + `netlab/`.
- [x] Xóa `docs/phan-tich-thiet-ke-he-thong.md` — đã bị `THIET-KE-HE-THONG.md` thay thế.
- [ ] `README.md` — bỏ Supabase/Vercel/Hostinger, thay bằng `docker compose up`.
- [ ] Sửa mục 3.2 và 9.1 tài liệu thiết kế: vector **1536** chiều, không phải 768.
- [ ] Sửa mục 11: "chuyển model không downtime" chỉ đúng với model cùng số chiều.

## Kiểm tra gần nhất

```bash
docker compose up -d db
corepack pnpm --filter @tang-thu/server run db:check     # 27/27 đạt
corepack pnpm --filter @tang-thu/server run db:seed      # đạt
corepack pnpm --filter @tang-thu/server run test         # 41/41 đạt
corepack pnpm run typecheck                              # cả hai package, đạt
```

Endpoint hiện có:

```text
GET  /api/health
POST /api/auth/login          đã chạy thật
GET  /api/auth/me             đã chạy thật
PUT  /api/auth/password
POST /api/search              truy hồi lai thật
```

## Blocker hiện tại

- Không có blocker trong phạm vi truy hồi/search hiện tại.
- Lưu ý: hai PDF thật là bản scan, parser thường trả 0 ký tự. Đợt nạp vừa rồi đã dùng
  OCR bằng Gemini rồi mới cắt chunk và embed; nếu chạy lại worker thường khi chưa tích
  hợp OCR vào pipeline chính, hai loại PDF scan tương tự vẫn có thể fail parse.

Supabase đã bị loại khỏi thiết kế nên blocker cũ không còn.

## Thứ tự công việc tiếp theo

1. Dựng `modules/chat/` — SSE `sources → token* → done`, nếu cần câu trả lời sinh
   bằng LLM thay vì bản tóm tắt nguồn hiện tại của `ChatBox`.
2. Tích hợp OCR vào pipeline ingest chính cho PDF scan.
3. `docker compose build` để kiểm hai Dockerfile chưa từng chạy.
4. Hoàn thiện frontend documents/admin đang còn mock.

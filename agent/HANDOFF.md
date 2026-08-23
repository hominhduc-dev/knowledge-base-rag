# Handoff — Cơ sở dữ liệu, phân quyền và dữ liệu mồi

## Thông tin

- Agent: Claude Opus 5
- Ngày: 22/08/2026
- Nhánh: `main`
- Commit cuối: `e20d814` (commit khởi tạo) — toàn bộ công việc bên dưới **chưa được commit**
- Phạm vi được giao: chốt stack, thiết kế dữ liệu, đặc tả phân quyền, API contract, migrate và seed

## Đã hoàn thành

- [x] Chốt stack: Supabase Postgres + pgvector, Prisma, Gemini 1536 chiều, JWT tự viết, Vercel + Hostinger VPS.
- [x] `docs/phan-quyen.md` — 4 vai, ánh xạ 7 chức danh thật, ma trận quyền, 7 kịch bản kiểm thử cách ly.
- [x] `docs/erd.md` — ERD Mermaid 11 bảng, chỉ mục, ràng buộc, và hai cảnh báo vận hành.
- [x] `docs/api-contract.md` — hợp đồng đầy đủ, đồng bộ với shape frontend đang dùng.
- [x] `docs/phan-tich-thiet-ke-he-thong.md` — chương Phân tích & Thiết kế cho báo cáo.
- [x] `docs/thuat-ngu.md` — bảng thuật ngữ Anh–Việt và danh mục từ viết tắt.
- [x] `docs/cau-truc-thu-muc.md` — cấu trúc và quyền sở hữu theo lát cắt dọc.
- [x] `schema.prisma` 11 model, 9 enum. **Đã migrate thật lên Supabase.**
- [x] `prisma/check.ts` — 13 kiểm chứng lược đồ, tất cả đạt.
- [x] `prisma/seed.ts` — 5 đơn vị, 6 cán bộ, **57 sinh viên thật**, 7 tài liệu, 13 đoạn văn.
- [x] Frontend: đăng nhập bằng mã số sinh viên hoặc email; **đã gỡ ô chọn vai demo**.

## File đã thay đổi

| File | Thay đổi |
|---|---|
| `apps/backend/prisma/schema.prisma` | Mới — 11 model, 9 enum |
| `apps/backend/prisma/migrations/20260822000000_init/` | Mới — 326 dòng SQL, đã áp dụng |
| `apps/backend/prisma/migrations/20260822010000_user_login_code/` | Mới — cột `users.code` |
| `apps/backend/prisma/migrations-sql/01_vector_fulltext.sql` | Mới — nguồn của phần SQL viết tay |
| `apps/backend/prisma/seed.ts` | Mới — dữ liệu mồi, chạy lại được nhiều lần |
| `apps/backend/prisma/check.ts` | Mới — kiểm chứng lược đồ sau migrate |
| `apps/backend/scripts/extract-pdf.ts` | Mới — trích văn bản PDF bằng `unpdf` |
| `apps/backend/package.json` · `.env.example` | Mới |
| `apps/frontend/src/features/auth/useAuth.ts` | Viết lại — vai suy từ tài khoản, không do người dùng chọn |
| `apps/frontend/src/features/auth/LoginForm.tsx` | Viết lại — bỏ ô chọn vai, vô hiệu hóa nút SSO |
| `apps/frontend/src/components/layout/UserMenu.tsx` | Dùng `useCurrentUser()` |
| `apps/frontend/src/features/chat/ChatBox.tsx` | Phạm vi mặc định theo đơn vị người đăng nhập |
| `pnpm-workspace.yaml` | Thêm `allowBuilds` cho Prisma và esbuild |
| `docs/` | 7 tài liệu mới hoặc cập nhật |

## Quyết định kỹ thuật

1. **Không có chức năng đăng ký.** Cho tự đăng ký kèm tự chọn khoa là vô hiệu hóa cách ly phạm vi ngay tại cửa vào, trong khi bộ kiểm thử vẫn xanh vì nó dùng tài khoản seed.
2. **Đăng nhập bằng `code` hoặc `email`.** `code` là mã số sinh viên với VIEWER, mã cán bộ với vai khác. Phân biệt bằng dấu `@`. Chuẩn hóa email về chữ thường, mã về chữ hoa.
3. **Mã sinh viên vào cột `code`, KHÔNG vào `id`.** `id` là UUID khóa chính, mọi khóa ngoại trỏ vào đó; nếu trường cấp lại mã thì liên kết hỏng.
4. **Một người = một đơn vị + một vai.** `departmentId` luôn bắt buộc.
5. **Vector 1536 chiều**, không phải 3072 mặc định của Gemini — HNSW của pgvector chỉ hỗ trợ tối đa 2000. Bản 1536 không được chuẩn hóa sẵn nên `embed.ts` phải tự chuẩn hóa L2.
6. **Lặp `department_id` và `scope` xuống `chunks`**, kèm ràng buộc CHECK chống mâu thuẫn hai cột.
7. **`citations` giữ bản sao `page` và `quote`**, khóa ngoại cho phép NULL với `SetNull` — gỡ tài liệu không làm hỏng lịch sử hội thoại cũ.
8. **API giữ tên khóa JSON của frontend**, chỉ bổ sung trường thiếu. SSE dùng event có tên. Giữ marker `[1]` trong câu trả lời.
9. **Không bật preview feature `postgresqlExtensions`** — bật là Prisma coi 5 extension có sẵn của Supabase là drift rồi đòi reset sạch schema `public`.
10. **Không dùng TypedSQL, không dùng `@prisma-next/extension-pgvector`.** TypedSQL đòi kết nối cơ sở dữ liệu lúc sinh code, thêm điểm gãy cho bước build Docker. Gói `prisma-next` còn ở 0.16.0 và query builder của nó che mất mệnh đề `WHERE` lọc phạm vi.
11. **Phân 57 sinh viên theo nhóm học tập**, luân phiên CNTT → KTR → XD. Tất định, giữ các bạn cùng nhóm chung khoa, tỉ lệ 21 / 18 / 18.

## Kiểm tra đã chạy

```bash
corepack pnpm exec tsx prisma/check.ts        # trong apps/backend
corepack pnpm exec tsx prisma/seed.ts
corepack pnpm --filter @tang-thu/frontend run typecheck
corepack pnpm --filter @tang-thu/frontend run lint
corepack pnpm --filter @tang-thu/frontend run build
```

Kết quả:

- `db:check`: **13/13 đạt** — 11 bảng, cột `tsv` sinh tự động, HNSW, GIN, 3 ràng buộc CHECK, chèn dữ liệu sai bị từ chối, toán tử `<=>` chạy được
- `db:seed`: đạt — 5 đơn vị · 6 cán bộ · 57 sinh viên · 7 tài liệu · 13 đoạn văn
- Typecheck: đạt · Lint: đạt · Build: đạt, 9 route
- Kiểm chứng cách ly phạm vi bằng tìm kiếm toàn văn: **đạt cả hai chiều**

## Chưa hoàn thành

- [ ] `apps/backend/src` — chưa có dòng mã Express nào.
- [ ] Sinh vector nhúng cho 13 đoạn văn (cần khóa Gemini).
- [ ] Frontend vẫn dùng mock data; API contract đã sẵn sàng để bỏ mock.
- [ ] `docs/data-survey.md` — khảo sát tài liệu học vụ thật.
- [ ] Không có test tự động nào tồn tại.

## Blocker

Không có blocker kỹ thuật. Ba việc chờ quyết định:

1. **Tên miền** — hiện dùng `Authorization: Bearer` với token trong `localStorage`; chuyển sang cookie `httpOnly` khi có `app.` và `api.` cùng domain gốc.
2. **`DELETE /documents/:id`** xóa mềm hay xóa cứng — đề xuất xóa mềm bằng cột `deletedAt`, cần thêm cột vào lược đồ.
3. **Khóa Gemini** chưa có trong `.env`.

## Việc agent tiếp theo cần làm

1. Dựng Express 5 tại `apps/backend/src`: `server.ts`, `app.ts`, `routes.ts`, `config/env.ts` validate bằng zod theo `.env.example`.
2. `middleware/auth.middleware.ts` và `role.middleware.ts` theo `docs/phan-quyen.md`.
3. `modules/identity/` — `POST /auth/login` nhận `account` là mã hoặc email, `GET /auth/me`, `PUT /auth/password`.
4. `modules/retrieval/` trả 3 kết quả cứng theo `docs/api-contract.md` mục 6, để frontend bỏ mock được ngay.
5. Frontend: sửa `apiClient` theo `docs/api-contract.md` mục 1, rồi **xóa khối `demoUsers`** trong `features/auth/useAuth.ts`.

## Cách tiếp tục

```bash
corepack pnpm install
cd apps/backend
corepack pnpm exec tsx prisma/check.ts     # xác nhận cơ sở dữ liệu còn nguyên
corepack pnpm exec tsx prisma/seed.ts      # nạp lại dữ liệu mồi nếu cần
```

Đăng nhập thử: `2351220193` hoặc `CB0142`, mật khẩu `Tangthu@123`.

## Lưu ý rủi ro

- **Ghim `prisma` ở 6.16.3.** CLI sẽ mời nâng lên 7.x — đừng nâng. Bản 7.1.0 báo schema drift sai trên cột `Unsupported("vector")`: https://github.com/prisma/prisma/issues/28867
- **Từ migration thứ hai trở đi phải VIẾT TAY.** Đã kiểm chứng: `prisma migrate diff` sinh ra `DROP INDEX chunks_embedding_hnsw`, `chunks_tsv_gin`, `embedding_cache_embedding_hnsw` vì Prisma không biết ba chỉ mục viết tay đó. Áp dụng là mất chỉ mục vector mà **không có lỗi nào báo** — truy vấn vẫn chạy, chỉ chậm dần. Chạy `migrate diff` chỉ để XEM, rồi tự viết file.
- **Không đặt file `.sql` vào `prisma/sql/`** — thư mục đó do TypedSQL chiếm dụng.
- **Nhánh từ khóa của tìm kiếm lai phải dùng OR.** `plainto_tsquery` nối mọi từ bằng AND; đã kiểm chứng là trả về rỗng với câu hỏi tự nhiên. Dùng `replace(plainto_tsquery(...)::text, '&', '|')::tsquery`.
- **Xóa khối `demoUsers` trong `useAuth.ts`** khi auth thật xong. Còn nó là còn một đường vào không qua máy chủ.
- **Bucket Supabase Storage phải để private.** File gốc chưa được tải lên; `storagePath` trong seed là chỗ giữ chỗ.
- **`apps/backend/.env` chứa mật khẩu cơ sở dữ liệu.** Đã được `.gitignore` loại — kiểm tra lại bằng `git check-ignore -v apps/backend/.env` trước mỗi lần commit.
- **57 sinh viên trong `seed.ts` là người thật.** Cân nhắc trước khi đưa repo ra công khai.

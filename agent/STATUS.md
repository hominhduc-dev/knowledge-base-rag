# Trạng thái dự án Tàng Thư

**Cập nhật:** 22/08/2026  
**Giai đoạn:** Chuẩn bị Sprint 1  
**Stack:** pnpm workspace · Next.js frontend · Express backend

## Tổng quan

| Khu vực | Trạng thái | Ghi chú |
|---|---|---|
| Frontend | Đã hoàn thiện UI mockup | Đang chạy bằng mock data |
| Backend | Đã có lược đồ và Prisma, chưa có Express | `apps/backend/` — `prisma@6.16.3` đã cài |
| Database | **Đã migrate lên Supabase** | 11 bảng, HNSW + GIN, ràng buộc CHECK — `db:check` đạt 10/10 |
| API contract | **Đã chốt** | `docs/api-contract.md` — frontend có thể bỏ mock |
| CI/CD | Chưa triển khai | Sprint 1 dùng service `pgvector/pgvector:pg16` |

## Frontend

- [x] Khởi tạo `apps/frontend` bằng Next.js App Router và TypeScript.
- [x] Cấu hình Tailwind CSS và shadcn/ui.
- [x] Áp dụng design system từ Claude Design handoff.
- [x] Màn đăng nhập bằng mã số sinh viên hoặc email trường.
- [x] **Đã gỡ ô chọn vai trò demo.** Vai và phạm vi suy ra từ tài khoản, không do
      người dùng chọn — đúng nguyên tắc kiểm soát không nằm ở tầng giao diện.
- [x] Đã vô hiệu hóa nút SSO: trước đây nó bỏ qua hoàn toàn bước nhập tài khoản.
- [x] Màn đăng nhập dùng ảnh lễ tốt nghiệp làm layer nền và form nằm trên layer nội dung.
- [x] Màn đăng nhập cố định trong `100dvh`, không tạo cuộn ở desktop hoặc mobile.
- [x] Sinh viên và Giảng viên cùng đăng nhập vào luồng hỏi đáp `/chat`.
- [x] Phạm vi tra cứu của Giảng viên bị khóa theo khoa/đơn vị công tác trên giao diện.
- [x] Màn chat desktop/mobile.
- [x] Citation tương tác và source panel/drawer.
- [x] Trạng thái đang tra cứu và không tìm thấy nguồn.
- [x] Màn quản lý tài liệu, tìm kiếm và bộ lọc.
- [x] Upload/drag-drop và tiến trình xử lý giả lập.
- [x] Màn chi tiết chunks của tài liệu.
- [x] Quản trị cây đơn vị.
- [x] Quản trị người dùng và đổi vai trò demo.
- [x] Ma trận quyền.
- [x] `api-client.ts` hỗ trợ Bearer token.
- [x] SSE parser và hook đọc stream cơ bản.
- [ ] Kết nối API backend thật.
- [ ] Auth guard và session thật.
- [ ] Signed URL mở tài liệu gốc.

## Backend

- [ ] Khởi tạo Express 5 + TypeScript tại `apps/backend`.
- [ ] Cấu hình Zod environment validation. Danh sách biến đã có ở `.env.example`.
- [ ] Khởi tạo Prisma và Supabase clients.
- [x] Viết `schema.prisma` — 11 model, 9 enum.
- [x] Viết phần SQL Prisma không sinh được: `prisma/migrations-sql/01_vector_fulltext.sql`.
- [x] Chạy migration lần đầu lên Supabase — `20260822000000_init`, 326 dòng SQL.
- [x] Kiểm chứng migration bằng `db:check` — 10/10 đạt.
- **Ghim `prisma@6.16.3`**, không dùng 7.x.
- **Không bật preview feature `postgresqlExtensions`** — bật là Prisma coi extension
  có sẵn của Supabase là drift rồi đòi reset sạch schema `public`.
- **Không dùng `prisma migrate dev` với Supabase.** Quy trình đã dùng và chạy được:
  `migrate diff --from-empty` sinh SQL → sửa tay → `migrate deploy`.
- **Từ migration thứ hai trở đi phải VIẾT TAY.** Đã kiểm chứng: `migrate diff` sinh ra
  `DROP INDEX chunks_embedding_hnsw`, `chunks_tsv_gin`, `embedding_cache_embedding_hnsw`
  vì Prisma không biết ba chỉ mục viết tay đó. Áp dụng là mất chỉ mục vector không báo lỗi.
  Chạy `migrate diff` chỉ để XEM, rồi tự viết file migration.
- [x] Thêm cột `users.code` — đăng nhập bằng mã số sinh viên hoặc email trường.
- [x] Seed đơn vị, người dùng, tài liệu — 5 đơn vị, 8 tài khoản, 7 tài liệu, 13 đoạn văn.
      Chạy lại được nhiều lần, không nhân bản dữ liệu.
- [x] Kiểm chứng cách ly phạm vi bằng tìm kiếm toàn văn trên dữ liệu mồi — đạt cả hai chiều.
- [ ] Sinh vector nhúng cho 13 đoạn văn (cần khóa Gemini).
- [ ] Authentication JWT + bcrypt.
- [ ] Upload và parse PDF/DOCX.
- [ ] API retrieval giả lập.
- [ ] SSE chat endpoint.
- [ ] Hybrid retrieval và scope isolation.

## Tài liệu

- [x] Có `docs/cau-truc-thu-muc.md`.
- [x] Chuẩn hóa tên thư mục `apps/frontend` và `apps/backend`.
- [x] Tạo `docs/api-contract.md` — đã đồng bộ với shape frontend đang dùng.
- [x] Tạo `docs/erd.md`.
- [x] Tạo `docs/phan-quyen.md` — 4 vai, ma trận quyền, 7 kịch bản kiểm thử cách ly.
- [x] Tạo `docs/phan-tich-thiet-ke-he-thong.md` — chương Phân tích & Thiết kế cho báo cáo.
- [ ] Tạo `docs/data-survey.md` — khảo sát 15 tài liệu thật, cần làm trước khi viết `chunk.ts`.
- [ ] Cập nhật `docs/TONG-QUAN-DU-AN.md` theo stack đã chốt.

## Kiểm tra gần nhất

Các lệnh dưới đây đã đạt sau khi đổi tên thư mục:

```bash
pnpm typecheck
pnpm lint
pnpm build
```

Các route frontend hiện có:

```text
/login
/chat
/documents
/admin/departments
/admin/users
/admin/permissions
```

## Blocker hiện tại

- Frontend chưa thể bỏ mock data vì backend chưa tồn tại. API contract đã chốt.
- Auth hiện chỉ phục vụ demo UI, chưa bảo vệ route hoặc dữ liệu. Bảng `demoUsers`
  trong `features/auth/useAuth.ts` phản chiếu `prisma/seed.ts` — **xóa toàn bộ khối
  đó khi `POST /auth/login` hoạt động**, lúc ấy vai và phạm vi lấy từ JWT.
- Nút mở tài liệu gốc chưa có signed URL từ Supabase Storage.

## Thứ tự công việc tiếp theo

1. Viết `docs/api-contract.md` cho auth, documents, retrieval và chat SSE.
2. Khởi tạo Express tại `apps/backend`.
3. Thiết kế `schema.prisma` và `docs/erd.md`.
4. Triển khai auth và seed.
5. Triển khai upload → parse → chunks.
6. Thay mock frontend bằng API thật theo từng vertical slice.

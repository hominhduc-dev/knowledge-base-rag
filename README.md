# Tàng Thư

**Hệ thống hỏi đáp tri thức học vụ ứng dụng RAG với cơ chế phân quyền theo đơn vị**

Hỏi bằng tiếng Việt tự nhiên, nhận câu trả lời kèm trích dẫn mở được đến đúng điều khoản trong văn bản gốc — và **chỉ trong phạm vi đơn vị mà người hỏi thuộc về**. Sinh viên Khoa Công nghệ Thông tin không bao giờ nhận được nội dung của Khoa Xây dựng.

> Đồ án môn học · Nhóm 4 người · 8 tuần · Đang ở Sprint 1

---

## Vấn đề

Thông tin học vụ nằm rải rác: website trường, website từng khoa, file PDF quy chế, thông báo trên mạng xã hội. Hệ quả là sinh viên hỏi lặp lại, giáo vụ trả lời thủ công những câu đã có sẵn đáp án trong văn bản, và mỗi khoa lại có quy định riêng chồng lên quy chế chung — nên một câu trả lời đúng với khoa này có thể sai với khoa khác.

Các trợ lý AI phổ thông không giải được bài toán này: chúng không có dữ liệu nội bộ, không biết người hỏi thuộc đơn vị nào, và **bịa thông tin khi không biết** — điều đặc biệt nguy hiểm với dữ liệu học vụ, nơi một câu sai về điều kiện tốt nghiệp gây hậu quả thật.

## Bốn năng lực lõi

**Cách ly phạm vi ở tầng truy vấn.** Đơn vị của người dùng lấy từ JWT đã ký, không từ tham số client. Bộ lọc nằm trong mệnh đề `WHERE` và chạy **trước** bước xếp hạng — không phải lọc lại sau khi đã lấy top-k. Cột `department_id` được lặp xuống bảng `chunks` chính là để làm được điều này.

**Tìm kiếm lai.** Kết hợp tìm kiếm ngữ nghĩa (pgvector) và tìm kiếm toàn văn (`ts_rank`) trên cùng một câu truy vấn. Embedding tiếng Việt hay trượt số hiệu văn bản như `1234/QĐ-ĐHKTĐN`; nhánh toàn văn bù đúng phần đó.

**Trích dẫn bắt buộc.** Mỗi câu trả lời kèm trích dẫn bấm được, mở đúng trang tài liệu gốc. Không tìm được nguồn thì trả lời "không có trong tài liệu" và **không gọi mô hình sinh** — tránh bịa thông tin.

**Đo lường được.** Bộ 30 câu hỏi vàng, đo `recall@k` trên nhiều cấu hình cắt đoạn, kết quả ghi vào bảng `eval_runs` để so sánh bằng số liệu.

## Công nghệ

| Lớp | Công nghệ |
|---|---|
| Giao diện | Next.js App Router · TypeScript · Tailwind CSS · shadcn/ui |
| Máy chủ ứng dụng | Express 5 · TypeScript · REST + SSE |
| ORM | Prisma `6.16.3` — truy vấn truy hồi dùng raw SQL |
| Cơ sở dữ liệu | PostgreSQL 16 + pgvector (Supabase) |
| Nhúng vector và sinh câu trả lời | Gemini — `gemini-embedding-2`, 1536 chiều |
| Đọc tài liệu | `unpdf` · `mammoth` |
| Hàng đợi | Bảng `jobs` trong Postgres, không dùng Redis |
| Triển khai | Vercel (giao diện) · Hostinger VPS + Docker (máy chủ) |

**Không dùng framework RAG trung gian.** Toàn bộ lõi khoảng 200 dòng: cắt đoạn, nhúng vector, truy hồi, sinh câu trả lời. Các framework loại này trừu tượng hóa mất tầng truy vấn SQL — đúng chỗ phải chèn bộ lọc phân quyền trước bước xếp hạng.

## Bắt đầu

Cần Node.js 22+ và một dự án Supabase.

```bash
corepack pnpm install
```

```bash
cp apps/backend/.env.example apps/backend/.env
```

Điền `DATABASE_URL`, `DIRECT_URL`, `GEMINI_API_KEY` và `JWT_SECRET`, rồi:

```bash
corepack pnpm --filter @tang-thu/backend exec prisma migrate deploy
```

```bash
corepack pnpm --filter @tang-thu/backend exec tsx prisma/seed.ts
```

```bash
corepack pnpm dev
```

Giao diện chạy ở `http://localhost:3000`.

### Kiểm chứng cơ sở dữ liệu

```bash
corepack pnpm --filter @tang-thu/backend exec tsx prisma/check.ts
```

Kiểm 13 điểm: đủ 11 bảng, cột `tsv` là cột sinh tự động, chỉ mục HNSW và GIN tồn tại, ba ràng buộc CHECK hoạt động, và toán tử `<=>` của pgvector chạy được.

### Tài khoản mẫu

Cán bộ/admin dùng mật khẩu `Tangthu@123`. Sinh viên dùng mật khẩu là chính mã số
sinh viên. Đăng nhập bằng **mã hoặc email**.

| Mã | Vai | Đơn vị |
|---|---|---|
| `CB0142` | Giáo vụ khoa | Khoa Công nghệ Thông tin |
| `CB0388` | Giáo vụ khoa | Khoa Xây dựng |
| `CB0231` | Giảng viên | Khoa Công nghệ Thông tin |
| `CB0006` | Quản trị viên | Phòng Đào tạo |

Sinh viên do `prisma/seed.ts` nạp, đăng nhập bằng mã số sinh viên; mật khẩu mặc
định trùng mã số sinh viên.

### Thử cách ly phạm vi

Đăng nhập bằng hai tài khoản sinh viên ở hai khoa khác nhau, hỏi cùng một câu *"điều kiện nhận đồ án tốt nghiệp"*. Dữ liệu mồi có một cặp đối chứng: quy định của Khoa CNTT ghi **105 tín chỉ**, của Khoa Xây dựng ghi **90 tín chỉ**. Nhận được con số của khoa kia nghĩa là cách ly đã rò rỉ.

## Cấu trúc

```
apps/
  frontend/    Next.js  → Vercel
  backend/     Express  → Hostinger VPS
    prisma/      lược đồ, migration, dữ liệu mồi, kiểm chứng
    src/rag/     lõi ~200 dòng: chunk · embed · retrieve · generate
    src/modules/ identity · ingest · chat · retrieval
packages/shared/  type và DTO dùng chung
docs/             tài liệu thiết kế và báo cáo
agent/            trạng thái dự án và handoff giữa các phiên làm việc
```

## Tài liệu

| Tài liệu | Nội dung |
|---|---|
| [`docs/TONG-QUAN-DU-AN.md`](docs/TONG-QUAN-DU-AN.md) | **Bắt đầu từ đây** — bối cảnh, phạm vi, lộ trình 8 tuần |
| [`docs/THIET-KE-HE-THONG.md`](docs/THIET-KE-HE-THONG.md) | Phân tích và thiết kế hệ thống, ba khung nhìn kiến trúc |
| [`docs/erd.md`](docs/erd.md) | Sơ đồ thực thể – quan hệ, chỉ mục, ràng buộc |
| [`docs/phan-quyen.md`](docs/phan-quyen.md) | Hai vai, ma trận quyền, kịch bản kiểm thử cách ly |
| [`docs/cau-truc-thu-muc.md`](docs/cau-truc-thu-muc.md) | Cấu trúc thư mục và phân chia quyền sở hữu ⚠ còn mô tả bản cũ |
| [`docs/api-contract.md`](docs/api-contract.md) | Hợp đồng giữa giao diện và máy chủ |
| [`docs/thuat-ngu.md`](docs/thuat-ngu.md) | Bảng thuật ngữ Anh–Việt cho báo cáo |
| [`agent/STATUS.md`](agent/STATUS.md) | Trạng thái hiện tại của từng phần |

## Trạng thái

| Phần | Trạng thái |
|---|---|
| Giao diện | Hoàn thiện, đang chạy bằng dữ liệu giả lập |
| Cơ sở dữ liệu | Đã migrate lên Supabase, 13/13 kiểm chứng đạt |
| Dữ liệu mồi | 5 đơn vị · 6 cán bộ · sinh viên · 7 tài liệu · 13 đoạn văn |
| API contract | Đã chốt |
| Máy chủ ứng dụng | Chưa bắt đầu |
| Nhúng vector và truy hồi | Chưa bắt đầu |

## Đội ngũ

Chia theo **lát cắt dọc** — mỗi người sở hữu một luồng từ cơ sở dữ liệu đến giao diện, không chia ngang frontend/backend.

| Thành viên | Lát cắt |
|---|---|
| Hồ Minh Đức *(Tech Lead)* | Truy hồi lai, cách ly phạm vi, bộ đánh giá, hạ tầng |
| Thành viên 2 | Nạp tài liệu: upload, trích xuất, cắt đoạn, sinh vector |
| Thành viên 3 | Giao diện hội thoại, streaming, trích dẫn |
| Thành viên 4 | Xác thực, phân quyền, quản lý đơn vị và người dùng |

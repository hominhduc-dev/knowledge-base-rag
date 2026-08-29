# Handoff — Chuyển sang thiết kế v2.0: Docker, lược đồ 2 vai, module netlab

## Thông tin

- Agent: Claude Opus 5
- Ngày: 29/08/2026
- Nhánh: `main`
- Commit cuối: `d0f7799` — toàn bộ công việc bên dưới **chưa được commit**
- Phạm vi được giao: chuyển repo sang thiết kế v2.0 (`docs/THIET-KE-HE-THONG.md`,
  `docs/TONG-QUAN-DU-AN.md`), luồng A (hạ tầng + dữ liệu) và luồng B (`netlab`) song song

## Bối cảnh — vì sao có bản chuyển đổi này

Dự án đổi trọng tâm sang **môn Lập trình mạng máy tính**. Thiết kế v2.0 khác v1 ở
năm chỗ nền tảng: bỏ Supabase sang Postgres trong Docker; 4 vai xuống 2 vai với
phạm vi tách khỏi vai qua bảng nhiều–nhiều; vector tách sang bảng riêng; thêm
module `netlab` bắt buộc; bỏ luồng duyệt tài liệu.

Việc chuyển sang Docker cũng gỡ luôn blocker Supabase đã chặn cả phiên trước.

## Đã hoàn thành

### Cấu trúc và hạ tầng
- [x] `apps/backend` → `server`, `apps/frontend` → `web`; cập nhật workspace và tên package.
- [x] Script gốc gọi qua `corepack pnpm` — `pnpm` trần không có trên PATH máy này.
- [x] `docker-compose.yml` — 4 dịch vụ: `db` · `api` · `web` · `caddy`.
- [x] `server/Dockerfile` và `web/Dockerfile` — build nhiều tầng từ gốc workspace.
- [x] `Caddyfile` — gộp giao diện và API về cùng một gốc.
- [x] `.dockerignore`, `.env` + `.env.example` ở gốc (hạ tầng), `server/.env` (ứng dụng).
- [x] Postgres 16.15 + pgvector chạy, `maintenance_work_mem=512MB`.

### Cơ sở dữ liệu
- [x] `schema.prisma` viết lại — 15 model, 5 enum, vector **1536 chiều**.
- [x] Migration `20260829031547_init` — 404 dòng, đã áp dụng thật.
- [x] Bốn khối SQL viết tay: cột `content_tsv` sinh tự động · chỉ mục HNSW · chỉ mục
      GIN · chỉ mục duy nhất `lower(email)` · trigger đồng bộ phạm vi.
- [x] `prisma/check.ts` viết lại — **25/25 đạt**.
- [x] `prisma/seed.ts` viết lại — 5 đơn vị · 6 cán bộ · **57 sinh viên thật** · 7 tài
      liệu · 13 đoạn văn. Chạy lại được nhiều lần.

### Tầng ứng dụng
- [x] `lib/scope.ts` **MỚI** — nơi DUY NHẤT biết quy tắc phạm vi, có cả bản Prisma
      (`scopeWhere`) và bản SQL thô (`scopeSql`) cho truy vấn lai.
- [x] `lib/roles.ts` viết lại — 2 vai, hàm `effectiveRole` gộp nhiều tư cách thành viên.
- [x] `middleware/auth.middleware.ts` — nạp `memberships` thay vì một đơn vị.
- [x] `middleware/role.middleware.ts` — bỏ thứ hạng, còn `requireRole` + `requireAdmin`.
- [x] `modules/identity/` → `modules/auth/`, trả thêm `memberships[]` theo phụ lục A.
- [x] `config/env.ts` — bỏ `DIRECT_URL` và `SUPABASE_*`, thêm `RETRIEVAL_ALPHA`,
      `UPLOAD_DIR`, hai cổng netlab.
- [x] `GET /health` đổi shape thành `{status, uptime, pendingJobs}`.
- [x] `server.ts` bind `0.0.0.0` tường minh.

### Module netlab — phần đặc thù môn học
- [x] `framing.ts` — `LineFramer` (delimiter) và `LengthPrefixFramer` (length-prefix).
- [x] `tcp-server.ts` cổng 9999 — nhiều client, tắt an toàn khi SIGINT, bảng đối chiếu
      vòng đời socket C# ↔ Node viết ngay trong mã.
- [x] `tcp-client.ts` — có cờ `--split` để trình diễn chuyện framing.
- [x] `http-server.ts` cổng 8080 — HTTP/1.1 tự viết trên `net`, keep-alive, không dùng
      module `http`, không dùng Express.
- [x] `netlab.test.ts` — 16 test.
- [x] `scope-isolation.test.ts` — 6 test trên dữ liệu mồi thật.

## Quyết định kỹ thuật

1. **Vector 1536 chiều thay vì 768 như tài liệu ghi.** Chất lượng truy hồi tốt hơn, vẫn
   dưới trần HNSW 2000 của pgvector. Chi phí ở quy mô 50.000 đoạn: vector ~300 MB thay
   vì 150, chỉ mục ~500 MB thay vì 250, thời gian tính khoảng cách gấp đôi (≈40 ms so
   với ngân sách 300 ms). **Cần sửa mục 3.2 và 9.1 của tài liệu thiết kế cho khớp.**
2. **`NEXT_PUBLIC_API_URL` để đường dẫn TƯƠNG ĐỐI `/api`.** Next nhúng biến này vào gói
   trình duyệt lúc build, nên ghi tuyệt đối là phải build lại mỗi khi đổi địa chỉ máy
   chủ. Để tương đối thì trình duyệt tự dùng đúng máy nó vừa tải trang — **gỡ tận gốc
   lỗi demo LAN mà cả hai tài liệu gọi là "lỗi phổ biến nhất"**, thay vì chỉ cảnh báo.
3. **`lib/scope.ts` giữ HAI bản của cùng một quy tắc** — bản Prisma và bản SQL thô. Truy
   hồi cần `<=>` và `ts_rank` nên không dùng Prisma được. Hai bản bắt buộc cùng nghĩa;
   `scope-isolation.test.ts` chạy qua bản SQL.
4. **Nhánh ADMIN trong `scopeSql` trả `TRUE`, tách hẳn khỏi biểu thức lọc**, không phải
   `OR role = 'ADMIN'` nhét chung — đúng ràng buộc số 3 của `docs/phan-quyen.md`.
5. **`scopeOf` trả `null` cho ADMIN, không phải mảng rỗng.** Hai thứ khác nghĩa: `null`
   là "không giới hạn", mảng rỗng là "không đơn vị nào". Lẫn lộn là ADMIN không thấy gì.
6. **Giảng viên nhận vai `STUDENT`.** Mô hình 2 vai: vai quyết định *làm được gì*, giảng
   viên chỉ cần đọc tài liệu của khoa mình nên đúng bằng quyền STUDENT. Bốn giáo vụ và
   Phòng Đào tạo thành `ADMIN`.
7. **Trigger đồng bộ phạm vi trong CSDL, không phải trong mã.** Hai cột `department_id`
   và `visibility` lặp xuống `chunks` để lọc được trước khi xếp hạng; trigger trả cái
   giá đó thay vì trông chờ lập trình viên nhớ cập nhật cả hai nơi.
8. **Bộ đệm framing tích lũy bằng `Buffer`, không phải chuỗi.** Ký tự tiếng Việt chiếm
   2–3 byte; nếu ranh giới gói TCP rơi vào giữa một ký tự thì `chunk.toString()` giải mã
   nửa ký tự thành U+FFFD và **hỏng vĩnh viễn**. Đã kiểm chứng bằng số, xem bên dưới.
9. **Cặp đối chứng chuyển từ CNTT↔XD sang CNTT↔KTR** cho khớp kịch bản demo ở mục 12
   của `TONG-QUAN-DU-AN.md`.
10. **Giữ đăng nhập bằng mã HOẶC email.** Phụ lục A chỉ ghi email, nhưng cột `users.code`
    và logic phân biệt bằng dấu `@` đã có và chạy được — bỏ đi là mất tính năng mà không
    được gì. **Cần bổ sung vào phụ lục A.**

## Kiểm tra đã chạy

```bash
docker compose up -d db
corepack pnpm --filter @tang-thu/server run db:check     # 25/25 đạt
corepack pnpm --filter @tang-thu/server run db:seed      # 5 · 6 · 57 · 7 · 13
corepack pnpm --filter @tang-thu/server run test         # 22/22 đạt
corepack pnpm run typecheck                              # cả server và web, đạt
```

### Xác thực — chạy thật, không phải giả lập

| Yêu cầu | Kết quả |
|---|---|
| `GET /api/health` | 200 `{status, uptime, pendingJobs}` |
| Đăng nhập bằng mã `2351220193` | 200 · Hồ Minh Đức · STUDENT · Khoa CNTT |
| Đăng nhập bằng email viết HOA | 200 — chuẩn hóa đúng |
| Sai mật khẩu | 401 "Tài khoản hoặc mật khẩu không đúng" |
| Tài khoản không tồn tại | 401 — **thông báo giống hệt dòng trên** |
| ADMIN `ha.nt@dau.edu.vn` | 200 · Nguyễn Thu Hà · ADMIN · Toàn trường |
| `GET /auth/me` với token | 200, khôi phục đúng phiên |
| `POST /search` với token STUDENT | 200, `unit` đúng đơn vị người gọi |

### Cách ly phạm vi — 6/6 đạt trên dữ liệu mồi thật

Cặp đối chứng: `88/QĐ-CNTT` (105 tín chỉ) so với `77/QĐ-KTR` (90 tín chỉ).

1. Sinh viên CNTT hỏi về đồ án — không đoạn nào của Kiến trúc lọt vào
2. Sinh viên Kiến trúc hỏi đúng câu đó — không đoạn nào của CNTT lọt vào
3. Hai khoa cùng nhận được quy chế toàn trường, cùng bộ đoạn
4. ADMIN thấy được cả hai
5. **Truy vấn không lọc trả về nhiều hơn** — chứng minh bộ lọc thật sự có tác dụng,
   chặn trường hợp `scopeSql` vô tình trả `TRUE` mà bốn test trên vẫn xanh
6. Người chưa gán đơn vị chỉ đọc được tài liệu toàn trường

### netlab — 16/16 đạt, kèm số đo thật

Chạy `node dist/netlab/tcp-client.js --split`, gửi `"Điều kiện xét tốt nghiệp là gì?"`
(31 ký tự, **43 byte**) chia làm 3 mảnh 1/3/39 byte, cắt giữa chữ "Đ" và giữa chữ "ề":

```
cách SAI (giải mã từng mảnh)          : "��i���u kiện"…
cách ĐÚNG (ghép Buffer rồi giải mã)   : "Điều kiện xé"…
```

Server nhận 4 sự kiện `data` cho MỘT thông điệp, tích lũy 1 → 4 → 43 byte rồi mới cắt
khi delimiter tới. Hai thông điệp dính trong một lần ghi cũng tách đúng thành hai.

`Content-Length` với thân tiếng Việt: khai báo **225**, số byte thực nhận **225** — khớp.
Nếu dùng `string.length` sẽ ra **189**, tức trình duyệt mất 36 byte cuối.

## Chưa hoàn thành

- [ ] **Sáu tài liệu trong `docs/` vẫn mô tả v1** — `phan-quyen.md`, `erd.md`,
      `api-contract.md`, `cau-truc-thu-muc.md`, `phan-tich-thiet-ke-he-thong.md`.
      Hai tài liệu v2.0 còn nằm ở `~/Downloads`, **chưa chuyển vào `docs/`**.
- [ ] `README.md` vẫn ghi Supabase / Vercel / Hostinger.
- [ ] **Frontend chưa đụng tới**: vẫn dùng mock, `apiClient` chưa bóc lớp vỏ `data`,
      khối `demoUsers` chưa xóa, `PermissionMatrix` và `RoleSelect` vẫn 4 vai.
- [ ] `modules/documents/` (TV2), `modules/chat/` (TV3), `/departments/*` (TV4).
- [ ] `retrieval.sql.ts` — truy vấn lai thật; hiện `/search` vẫn trả 3 kết quả cứng.
- [ ] `rag/` — `chunk.ts`, `embed.ts`, `retrieve.ts`, `generate.ts`, `prompt.ts`.
- [ ] `worker/` — vòng lặp đọc bảng `ingest_jobs`.
- [ ] Chưa dựng thử image `api` và `web` bằng Docker; mới chạy `db`.
- [ ] Chưa có `.github/` — mà kiểm thử rò rỉ phạm vi là điều kiện chặn merge.
- [ ] `eval/` — bộ 30 câu hỏi vàng. Bảng `eval_sets` mới có một dòng rỗng `golden-30`.

## Blocker

1. **Chưa có `GEMINI_API_KEY`** — chặn sinh vector cho 13 đoạn mồi, do đó chặn nhánh
   vector của truy hồi. Nhánh từ khóa đã chạy được và đủ để kiểm chứng cách ly phạm vi.

Không còn blocker nào khác. Supabase đã bị loại khỏi thiết kế.

## Việc agent tiếp theo cần làm

1. **Chuyển hai tài liệu v2.0 từ `~/Downloads` vào `docs/`**, rồi viết lại `phan-quyen.md`
   và `erd.md` cho khớp lược đồ mới. Sửa `api-contract.md`: bổ sung `INTERNAL_ERROR`,
   ghi nhận đăng nhập bằng mã, đổi shape `/health`.
2. **Sửa `web/src/lib/api-client.ts`** — thêm lớp `ApiError`, bóc lớp vỏ `data`.
3. **Nối `LoginForm.tsx` vào `POST /api/auth/login`**, đổi state `email` thành `account`,
   rồi **xóa khối `demoUsers`** trong `web/src/features/auth/useAuth.ts`.
4. **Sửa giao diện xuống 2 vai** — `PermissionMatrix.tsx` còn 2 cột, bỏ `RoleSelect.tsx`.
5. `docker compose build` để kiểm hai Dockerfile chưa từng chạy.
6. Dựng `modules/documents/` hoặc `modules/chat/` — chỗ gắn đã ghi trong `src/routes.ts`.

## Cách tiếp tục

```bash
corepack pnpm install
docker compose up -d db
corepack pnpm --filter @tang-thu/server run db:check
corepack pnpm --filter @tang-thu/server run db:seed
corepack pnpm run dev
```

Thử đăng nhập:

```bash
curl -X POST http://localhost:4000/api/auth/login -H "Content-Type: application/json" -d "{\"account\":\"2351220193\",\"password\":\"Tangthu@123\"}"
```

Chạy netlab:

```bash
corepack pnpm --filter @tang-thu/server run netlab:tcp
corepack pnpm --filter @tang-thu/server exec tsx src/netlab/tcp-client.ts --split
```

## Lưu ý rủi ro

- **`pnpm db:migrate` giờ là `prisma migrate dev` và AN TOÀN với Postgres local** —
  cảnh báo "phải viết tay" của v1 chỉ áp dụng cho Supabase. **Nhưng** năm khối SQL viết
  tay vẫn nằm ngoài tầm hiểu của Prisma, nên **chạy `db:check` sau MỌI lần migrate**.
  Mất chỉ mục HNSW không gây lỗi nào — truy vấn vẫn đúng, chỉ chậm dần.
- **Nhánh từ khóa của tìm kiếm lai phải dùng OR.** `plainto_tsquery` nối mọi từ bằng AND
  và trả rỗng với câu hỏi tự nhiên. Dùng
  `replace(plainto_tsquery('simple', $q)::text, '&', '|')::tsquery` — đã dùng trong
  `scope-isolation.test.ts`, sao chép nguyên vào `retrieval.sql.ts`.
- **Ghim `prisma@6.16.3`.** CLI mời nâng lên 8.x — đừng nâng.
- **Cột `vector(1536)` cố định làm hẹp lời hứa ở mục 11 tài liệu thiết kế.** Câu "nạp
  song song vector của model mới, chuyển đổi không downtime" chỉ đúng với model **cùng
  số chiều**. Cần sửa câu đó.
- **57 sinh viên trong `seed.ts` là người thật**, trong khi sản phẩm bàn giao A yêu cầu
  repo công khai. Hai điều này xung đột — cần chốt ẩn danh hóa hay không.
- **`.env` ở gốc chứa mật khẩu Postgres, `server/.env` chứa `JWT_SECRET`.** Cả hai đã
  được `.gitignore` loại; kiểm lại bằng `git check-ignore -v .env server/.env` trước
  mỗi lần commit.
- **Toàn bộ thay đổi chưa commit và rất lớn** (83 mục trong `git status`, gồm cả việc
  đổi tên hai thư mục gốc). Nên commit sớm để `git mv` được ghi nhận là đổi tên.

# Khởi tạo Sổ Tay Sinh Viên CNTT trên máy mới

Dành cho người vừa clone repo về. Đọc hết mất 5 phút, làm theo mất 15.

> Tài liệu này chỉ nói về **hạ tầng và dữ liệu**. Kiến trúc hệ thống xem
> `THIET-KE-HE-THONG.md`, phân quyền xem `phan-quyen.md`.

---

## 1. Cần có sẵn

| | Vì sao |
|---|---|
| **Docker Desktop** | chạy toàn bộ hệ thống — CSDL, API, giao diện, Caddy |
| **Node.js 22+** | chạy `seed` và `embed`, xem mục 4 để biết vì sao không chạy trong container được |
| **corepack** | đi kèm Node, bật bằng `corepack enable`. Quản lý pnpm theo đúng phiên bản đã ghim |
| **Khóa API Gemini** | mỗi người **một khóa riêng**. Lấy ở [Google AI Studio](https://aistudio.google.com/apikey) |

---

## 2. Hai tệp `.env`

Repo cố ý **không** commit `.env`. Tạo từ mẫu:

```bash
cp .env.example .env && cp server/.env.example server/.env
```

**`.env` ở gốc** — biến hạ tầng, chỉ Docker Compose đọc:

- `POSTGRES_PASSWORD` — bắt buộc, không có mặc định. Sinh chuỗi ngẫu nhiên:
  `node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"`
- `COMPOSE_PROFILES=local` — quyết định dùng Postgres trong Docker hay trên cloud, xem mục 3.
- `HTTP_PORT` — cổng duy nhất mở ra LAN. Đổi sang `8000` nếu cổng 80 đã bị chiếm.

**`server/.env`** — biến ứng dụng:

- `GEMINI_API_KEY` — khóa của riêng bạn.
- `JWT_SECRET` — sinh giống cách trên. Khác nhau giữa các máy cũng không sao, chỉ
  làm token cũ hết hiệu lực.
- `DATABASE_URL` — dành cho lúc chạy script **trên máy** (mục 4). Trong Docker,
  Compose ghi đè giá trị này vì trong mạng Docker máy chủ CSDL tên là `db`, không
  phải `localhost`.

---

## 3. Chọn chế độ CSDL

### Local — mặc định, dùng cho demo LAN

Để nguyên `COMPOSE_PROFILES=local` trong `.env`. Postgres chạy trong Docker,
dữ liệu nằm ở volume `pgdata`, và **không mở ra LAN** — chỉ `127.0.0.1:5432`.

```bash
docker compose up -d
```

### Cloud — dùng chung một CSDL cho cả nhóm

Trong `.env` ở gốc: **xóa** dòng `COMPOSE_PROFILES=local`, rồi đặt `DATABASE_URL`.
Dịch vụ `db` sẽ không khởi động — nhưng **vẫn phải giữ `POSTGRES_PASSWORD`**, vì
Compose nội suy toàn bộ tệp bất kể hồ sơ nào đang bật. Giá trị không được dùng
tới, điền gì cũng được.

```
DATABASE_URL=postgresql://NGUOI_DUNG:MAT_KHAU@HOST:5432/postgres?connect_timeout=30&sslmode=require
```

Ba điều bắt buộc, mỗi điều đều đã từng làm hỏng dự án này một lần:

1. **`connect_timeout=30`.** Thiếu nó, Prisma báo `P1001 Can't reach database
   server` trong khi lỗi thật là sai mật khẩu — che mất nguyên nhân hoàn toàn.
2. **Nhà cung cấp phải có `pgvector`.** Neon và Supabase có sẵn; nơi khác phải tự bật.
3. **Với Supabase, dùng *pooler* chứ không phải *direct connection*.** Host trực
   tiếp `db.<ref>.supabase.co` chỉ có bản ghi **IPv6** nên máy dùng IPv4 không bao
   giờ nối tới được. Pooler `aws-N-<region>.pooler.supabase.com` có IPv4. Tên đăng
   nhập cũng phải là `postgres.<project-ref>`, không phải `postgres` — sai chỗ này
   ra thông báo `Tenant or user not found`.

Đổi chế độ thì chạy lại `docker compose up -d`.

---

## 4. Dựng lược đồ và nạp dữ liệu

```bash
docker compose exec api npx prisma migrate deploy
```

Hai bước sau **phải chạy trên máy, không chạy trong container**: `tsx` là
`devDependency` nên ảnh `api` dựng bằng `--prod` không có nó.

```bash
corepack pnpm --filter @tang-thu/server run db:seed
```

```bash
corepack pnpm --filter @tang-thu/server run db:embed
```

`db:seed` dựng đơn vị, người dùng và bộ tài liệu mồi. `db:embed` gọi Gemini để
sinh vector — **tốn quota**, nhưng chạy lại được nhiều lần: đoạn nào đã có vector
cho model hiện tại thì bỏ qua, không gọi thêm lệnh nào.

Cả hai nối tới CSDL qua `DATABASE_URL` trong `server/.env`, không qua Compose. Ở
chế độ local, giá trị mặc định `localhost:5432` là đúng vì dịch vụ `db` có mở cổng
đó ra máy chủ.

### Kiểm chứng

```bash
corepack pnpm --filter @tang-thu/server run db:check
```

Nó kiểm những thứ **Prisma không quản lý** và vì thế hay âm thầm biến mất sau mỗi
lần `prisma migrate dev`: cột sinh `content_tsv`, chỉ mục HNSW, chỉ mục GIN,
trigger đồng bộ phạm vi, và toán tử khoảng cách cosine `<=>`.

Trên Postgres cloud gói miễn phí, mục `maintenance_work_mem` thường **không đạt**
(32 MB thay vì 512 MB). Ở quy mô vài chục đoạn thì không ảnh hưởng; ở quy mô hàng
chục nghìn đoạn thì việc dựng chỉ mục HNSW sẽ tràn ra đĩa và chậm hàng chục lần.

---

## 5. Dùng thử

Mở `http://localhost`. Tài khoản do `server/prisma/seed.ts` sinh ra — xem trực
tiếp trong tệp đó; mật khẩu sinh viên trùng mã số, mật khẩu cán bộ nằm ở hằng
`STAFF_SEED_PASSWORD`.

Kịch bản đáng thử nhất là **cặp đối chứng phạm vi**: hỏi cùng một câu bằng hai tài
khoản thuộc hai khoa khác nhau và đối chiếu bộ nguồn trả về.

---

## 6. Demo LAN

Máy chạy Docker là server, máy khác trong cùng mạng là client.

```bash
docker compose up -d
```

Tìm IP LAN của máy chủ (`ipconfig` trên Windows, `ip addr` trên Linux) rồi mở
`http://<IP-LAN>` từ máy kia. Không cần đổi cấu hình: giao diện gọi API bằng
đường dẫn **tương đối** `/api`, nên trình duyệt tự dùng đúng máy nó vừa tải trang.

Vào không được thì gần như chắc chắn là **tường lửa chặn cổng 80**, không phải lỗi
Docker — Caddy đã bind `0.0.0.0`.

---

## 7. Mang dữ liệu sang máy khác

Git **không** chứa CSDL. Dữ liệu nằm ở ba chỗ và chỉ một chỗ nằm trong repo:

| Thứ | Ở đâu | Git mang theo? |
|---|---|---|
| Mã nguồn, migration, `seed.ts` | repo | có |
| Đơn vị, người dùng, tài liệu mồi, vector | volume `pgdata` | không — **tái tạo được** bằng mục 4 |
| Tệp PDF đã tải lên qua giao diện | volume `uploads` | không, và **không tái tạo được** |

Cách thường dùng là để mỗi người tự chạy mục 4. Khi cần trạng thái **y hệt** —
gồm cả hội thoại và kết quả đánh giá — thì dump:

```bash
mkdir -p backup && docker compose exec -T db pg_dump -U tangthu -d tangthu --clean --if-exists --no-owner > backup/tangthu.sql
```

Nạp lại ở máy kia:

```bash
docker compose exec -T db psql -U tangthu -d tangthu < backup/tangthu.sql
```

Tệp PDF thì chép riêng, dump không chứa chúng:

```bash
docker compose cp api:/app/uploads ./backup/uploads
```

Chép ngược lại bằng `docker compose cp ./backup/uploads/. api:/app/uploads`. Nếu
sau đó mở tài liệu gốc bị lỗi thì sửa quyền:
`docker compose exec -u root api chown -R node:node /app/uploads`.

> Bản dump chứa **họ tên, email và mã số của sinh viên thật**. Cân nhắc trước khi
> đưa vào một repo công khai — lịch sử Git giữ lại vĩnh viễn kể cả sau khi xóa tệp.

---

## 8. Bẫy đã gặp

| Triệu chứng | Nguyên nhân thật |
|---|---|
| `P1001 Can't reach database server` với CSDL cloud | thiếu `connect_timeout`, lỗi thật là sai mật khẩu |
| `Tenant or user not found` (Supabase) | dùng `postgres` thay vì `postgres.<project-ref>`, hoặc sai pooler |
| Kết nối Supabase treo rồi hỏng | dùng direct host, host đó chỉ có IPv6 |
| `type "vector" does not exist` khi migrate | extension `vector` nằm ở schema `extensions`, thiếu nó trong `search_path` |
| `db:seed` báo thiếu trường | client Prisma đã sinh không khớp `schema.prisma` — chạy `prisma generate` |
| Máy khác trong LAN không vào được | tường lửa chặn cổng 80 |
| `service db is required but not enabled by profile` | Compose cũ hơn 2.20, chưa hỗ trợ `required: false` |

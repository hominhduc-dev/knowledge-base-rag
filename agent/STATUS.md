# Trạng thái — Sổ Tay Sinh Viên CNTT

**Cập nhật: 05/09/2026, sau khi triển khai.** Học phần Lập trình mạng máy tính. Đối tượng duy nhất: sinh viên ngành CNTT, Trường Đại học Kiến trúc Đà Nẵng.

Nguồn yêu cầu hiện hành: [PHAM-VI-CNTT.md](../docs/PHAM-VI-CNTT.md). Ba vai đã chốt, không triển khai phạm vi đa khoa.

> Bản trước ghi *"chưa migrate DB đang dùng"*, *"chưa commit hoặc push"*, *"chưa kiểm giao diện với từng vai bằng trình duyệt"*. **Cả ba đã xong.** Mục "Chưa triển khai" cũ đã bị bỏ.

---

## 1. Đang chạy ở đâu

| | |
|---|---|
| Nhánh | `feat/thiet-ke-v2-docker-netlab`, **đã push**, `origin` khớp `local` |
| Vượt `main` | 25 commit — chưa mở pull request |
| CSDL | **Supabase** `aws-0-ap-southeast-2` (Sydney), lược đồ ba vai, dữ liệu đầy đủ |
| Dịch vụ | `api` · `web` · `caddy`. Postgres local **đã tắt** — hệ thống chạy hoàn toàn trên cloud |
| Cấu hình | **một** tệp `.env` ở gốc repo |

Đổi về Postgres local: bỏ chú thích `COMPOSE_PROFILES=local` và xóa `DATABASE_URL` trong `.env`. Dữ liệu local vẫn nguyên trong volume `pgdata`.

---

## 2. Hạng mục

| Hạng mục | Trạng thái |
|---|---|
| Vai trò | `USER` / `CONTENT_ADMIN` / `SYSTEM_ADMIN` — enum, backend, frontend |
| Kho tri thức | cả ba vai cùng phạm vi: CNTT + quy định chung |
| Xác thực | JWT đọc lại vai và trạng thái từ CSDL mỗi request; chỉ nhận tư cách CNTT |
| Tài liệu | `CONTENT_ADMIN` và `SYSTEM_ADMIN` ghi được; `USER` chỉ đọc |
| Tài khoản | chỉ `SYSTEM_ADMIN`; chặn tự khóa, tự hạ vai, tự gỡ mình |
| Giao diện | bỏ chọn khoa và cây đơn vị; chọn ba vai và nhóm tài liệu; bỏ SSO giả lập |
| Migration | `20260905090000_cntt_three_roles` — đổi tên enum, **không xóa dữ liệu** |
| Lập trình mạng | `netlab/` TCP + HTTP tự viết, framing, nhiều client |
| Hạ tầng | Docker Compose 4 dịch vụ, chuyển local ↔ cloud bằng một biến |
| Sơ đồ sequence | `docs/use-cases/sequences/`, tạo bằng Archify, mỗi use case một folder riêng |

---

## 3. Kiểm chứng — số đo trên hệ thống đang chạy

Toàn bộ chạy trên Supabase, Postgres local đã tắt.

| Phép đo | Kết quả |
|---|---|
| `pnpm test` (backend) | **69/69 đạt**, 0 lỗi |
| Trong đó `netlab` | **16/16 đạt** |
| `db:check` | **26/27** — chỉ trượt `maintenance_work_mem` (32 MB, gói free Supabase) |
| typecheck server · web | 0 lỗi |
| ESLint web | sạch |

**Ma trận ba vai, đo bằng HTTP thật:**

```
                     USER   CONTENT_ADMIN   SYSTEM_ADMIN
GET  /documents       200        200            200
GET  /users           403        403            200
POST /documents       403        422            422
```

`403` là chặn ở cửa vai. `422` là đã qua cửa vai, chỉ thiếu tệp — đúng ranh giới cần chứng minh.

**Cách ly phạm vi.** CSDL có 9 tài liệu (3 CNTT + 1 KTR + 5 chung). Cả ba vai **đều chỉ thấy 8**; tài liệu Kiến trúc bị loại **kể cả với `SYSTEM_ADMIN`**. Không có nhánh quản trị bỏ qua bộ lọc. Sinh viên không có tư cách CNTT không đăng nhập được.

**JWT không mang quyền.** Cùng một token không đổi một byte:

```
CONTENT_ADMIN → POST /documents → 422
   (hạ vai xuống USER trong CSDL)
cùng token đó → POST /documents → 403
   (khôi phục CONTENT_ADMIN)
cùng token đó → POST /documents → 422
```

Server đọc lại vai từ CSDL mỗi request. Đây là bằng chứng client–server sạch cho học phần: **client giữ token, server giữ quyền**.

**Giao diện, kiểm bằng trình duyệt đủ ba vai.** `CONTENT_ADMIN` không thấy mục Quản trị; `SYSTEM_ADMIN` thấy bảng 60 người dùng với ô chọn ba vai, dòng của chính mình bị khóa. Hỏi đáp: 10 nguồn truy hồi, panel thu về đúng nguồn được trích.

**Độ trễ, đo trực tiếp:**

| | Postgres local | Supabase (Sydney) |
|---|---|---|
| `/api/health` | 0,009 s | 0,54 s |
| `GET /documents` | — | 1,31 s |
| `/chat` toàn lượt | 3,07 s | 9,14 s |

Chênh lệch này là **dữ liệu đo được cho phần ngân sách độ trễ**: cùng mã nguồn, đổi một dòng `.env`, độ trễ gấp ba. Demo LAN nên chạy local.

---

## 4. Khoảng trống thật

| | Mức | Ghi chú |
|---|---|---|
| **Chưa có `.github/`** | cao | Hai tài liệu thiết kế đều ghi kiểm thử rò rỉ phạm vi là **điều kiện chặn merge**. Hiện không có CI nào |
| **Chưa mở pull request** | trung bình | 25 commit vẫn nằm ngoài `main` |
| **Chưa chạy đánh giá `cntt-v1`** | trung bình | 27 câu hỏi vàng đã có, chưa có số recall@k/MRR |
| **Demo LAN, Wireshark, đo tải** | trung bình | phải làm trên môi trường thật trước bảo vệ |
| Tệp PDF gốc chỉ có trên một máy | thấp | nằm ở volume `uploads`; máy khác dùng chung CSDL vẫn hỏi đáp được nhưng không mở được tệp gốc |
| Chưa có `POST /users` | thấp | cấp tài khoản bằng seed/provisioning, đúng phạm vi đã chốt |

---

## 5. Rủi ro vận hành đã gặp

**Hai agent cùng ghi một cây làm việc.** Trong phiên 05/09, Codex chạy song song đã ba lần `git checkout main`. Lần đầu xóa sạch 133 tệp v2 khỏi đĩa; lần hai khiến một lệnh cài ghi nhầm vào `package.json` của v1. Không mất dữ liệu vì mọi thứ đã commit, nhưng Git chỉ bảo vệ được phần **đã commit**. Đừng chạy hai agent cùng lúc trên cùng thư mục.

**Dữ liệu sinh viên thật trên repo công khai.** `prisma/seed.ts` chứa họ tên, email và mã số của 57 sinh viên. Repo đang **PUBLIC**, và dữ liệu này đã có trên `origin/main` từ 23/08. Cần quyết định: chuyển repo sang private, hay ẩn danh hóa seed và viết lại lịch sử.

**Khóa Gemini cần xoay.** Khóa hiện tại đã bị lộ dạng rõ trong một phiên làm việc.

## 6. Sơ đồ sequence 3 lớp

Đã tạo sequence diagram bằng Archify tại `docs/use-cases/sequences/`. Mỗi use case có một folder riêng dạng `uc01_usecase_dang_nhap/`, bên trong có `diagram.sequence.json` và `diagram.html`. Trang tổng hợp là `docs/use-cases/sequences/index.html`. Cấu trúc giữ ba lớp Boundary/Presentation, Control/Business Logic và Entity/Data Access.

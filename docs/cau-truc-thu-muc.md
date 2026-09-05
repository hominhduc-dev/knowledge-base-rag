# Cấu trúc thư mục — Sổ Tay Sinh Viên CNTT

**Cập nhật 05/09/2026.** Tài liệu này mô tả cây thư mục **thật** trong repo, đã đối chiếu với `git ls-files`.

> Bản trước mô tả `apps/backend` + `apps/frontend` + `packages/shared`, triển khai lên Vercel và Hostinger. Cấu trúc đó **không còn tồn tại**: v2 đổi sang `server/` + `web/` chạy bằng Docker Compose trên máy cá nhân, và `packages/` chưa bao giờ được dựng.

---

## 1. Tổng thể

Monorepo `pnpm workspaces` với **hai** gói thật. `pnpm-workspace.yaml` còn khai
`packages/*`, nhưng thư mục đó chưa bao giờ tồn tại nên glob khớp rỗng.

```
knowledge-base-rag/
├── .env                     # TỆP CẤU HÌNH DUY NHẤT — không commit
├── .env.example             # mẫu, copy sang .env rồi điền
├── docker-compose.yml       # 4 dịch vụ: db · api · web · caddy
├── Caddyfile                # lối vào duy nhất ra LAN, cổng 80
├── pnpm-workspace.yaml      # server · web · packages/* (glob rỗng)
├── server/                  # Express 5 + TypeScript
├── web/                     # Next.js App Router
├── docs/                    # thiết kế, hợp đồng API, use case
├── agent/                   # trạng thái và bàn giao giữa các phiên
└── backup/                  # dump CSDL — bị .gitignore chặn
```

**Bốn dịch vụ Docker.** Chỉ `caddy` mở cổng ra LAN; `api` và `web` chỉ `expose` trong mạng nội bộ Docker; `db` chỉ bind `127.0.0.1:5432`, không bao giờ ra mạng lớp. Dịch vụ `db` nằm trong hồ sơ `local`, nên khi dùng Postgres cloud thì nó không khởi động — xem `khoi-tao.md`.

---

## 2. `server/` — Express 5

```
server/
├── Dockerfile
├── prisma.config.ts         # nạp .env ở GỐC repo cho Prisma CLI
├── package.json
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   │   ├── 20260829031547_init/
│   │   └── 20260905090000_cntt_three_roles/
│   ├── seed.ts              # dữ liệu mồi demo
│   ├── check.ts             # kiểm 27 bất biến lược đồ
│   └── embed.ts             # nạp vector cho đoạn còn thiếu
├── scripts/
│   ├── bootstrap-admin.ts   # chỉ định SYSTEM_ADMIN đầu tiên, mặc định dry-run
│   ├── extract-pdf.ts
│   └── test-cntt-db.mjs     # chạy migration + seed + test trên DB thử nghiệm riêng
└── src/
    ├── server.ts            # điểm vào, lắng nghe cổng
    ├── app.ts               # lắp middleware
    ├── routes.ts            # gắn mọi router
    ├── config/              # env.ts (nơi DUY NHẤT đọc process.env) · prisma.ts
    ├── lib/                 # errors · http · logger · roles · scope
    ├── middleware/          # auth · role · error · upload
    ├── modules/             # xem mục 2.1
    ├── rag/                 # chunk · embed · generate · prompt · citation-guard
    ├── netlab/              # xem mục 2.2
    ├── eval/                # bộ câu hỏi vàng và chỉ số đo
    ├── worker/              # ingest.worker.ts — vòng lặp nạp tài liệu
    └── types/express.d.ts   # AuthenticatedUser
```

### 2.1 `modules/` — mỗi module một lát cắt nghiệp vụ

Năm module, mỗi cái theo cùng một khuôn: `*.route.ts` → `*.controller.ts` → `*.service.ts`, kèm `*.schema.ts` cho zod và `index.ts` để lộ ra ngoài.

| Module | Việc |
|---|---|
| `auth/` | đăng nhập, đọc lại vai từ CSDL mỗi request |
| `documents/` | tải lên, danh sách, trạng thái xử lý, gỡ, chạy lại |
| `retrieval/` | truy hồi lai vector + toàn văn, hợp nhất bằng RRF |
| `chat/` | hỏi đáp qua SSE, ràng buộc trích dẫn |
| `admin/` | quản lý tài khoản và phân vai — chỉ `SYSTEM_ADMIN` |

Ranh giới quan trọng: `chat.controller.ts` là nơi **duy nhất** biết SSE là gì. `chat.service.ts` chỉ sinh ra một chuỗi sự kiện, nhờ vậy bộ đánh giá gọi thẳng service được, không phải dựng HTTP.

### 2.2 `netlab/` — phần đặc thù học phần Lập trình mạng

Không import gì từ `modules/`, không chạm CSDL. Chạy độc lập được.

| Tệp | Nội dung |
|---|---|
| `framing.ts` | ghép/tách thông điệp trên luồng byte |
| `tcp-server.ts` | server TCP cổng 9999, chỉ dùng module `net` |
| `tcp-client.ts` | client đối chiếu, kết nối qua LAN |
| `http-server.ts` | HTTP server tự viết cổng 8080 — **không** dùng module `http`, không Express |
| `netlab.test.ts` | 16 test, gồm bài gửi một request cắt làm ba lần `write()` |

Bài test cắt ba mảnh là **bằng chứng**, không phải test cho vui: nó cắt ngay giữa tên header và giữa thân JSON, chứng minh hiểu "TCP là luồng byte, không phải luồng thông điệp".

---

## 3. `web/` — Next.js App Router

```
web/
├── Dockerfile
├── .env.local.example
└── src/
    ├── app/
    │   ├── layout.tsx
    │   ├── (auth)/login/           # ngoài AuthGuard, tránh vòng lặp chuyển hướng
    │   └── (app)/                  # mọi trang đòi đăng nhập
    │       ├── chat/
    │       ├── documents/
    │       └── admin/{users,permissions,departments}/
    ├── components/
    │   ├── layout/                 # Header · Sidebar · UserMenu · AdminNavLink
    │   └── ui/                     # button · input · textarea
    ├── features/
    │   ├── auth/                   # useAuth · AuthGuard · LoginForm
    │   ├── chat/                   # ChatBox · MessageList · CitationDrawer
    │   ├── documents/              # DocumentManager · UploadDropzone
    │   └── admin/                  # UserTable · PermissionMatrix
    └── lib/                        # api-client · chat-stream · sse · utils · mock-data
```

`admin/departments/` chỉ còn một dòng `redirect("/admin/users")` — giữ cho liên kết cũ không gãy, đồ án hiện không có màn quản trị nhiều khoa.

Quy ước: `app/` chỉ định tuyến và lắp ráp; mọi logic nằm ở `features/`. `lib/api-client.ts` là **cầu nối duy nhất** tới API — không component nào gọi `fetch` trực tiếp, trừ phần tải tệp vì `multipart/form-data` cần trình duyệt tự sinh `boundary`.

---

## 4. Cấu hình nằm ở đâu

Chỉ **một** tệp `.env` ở gốc repo, dùng chung cho ba nơi:

| Ai đọc | Bằng cách nào |
|---|---|
| Docker Compose | tự đọc `.env` ở gốc để nội suy `${...}` |
| Container `api` | `env_file: ./.env` |
| Script chạy trên máy | `tsx --env-file=../.env`, và `src/config/env.ts` tự nạp |
| Prisma CLI | `server/prisma.config.ts` nạp bằng `dotenv` |

Prisma cần tệp cấu hình riêng vì CLI của nó **chỉ tìm `.env` ở thư mục hiện tại và cạnh `schema.prisma`**, không tìm ngược lên thư mục cha.

---

## 5. Thứ tài liệu cũ nhắc mà không có thật

| Nhắc trong bản cũ | Thực tế |
|---|---|
| `apps/backend`, `apps/frontend` | đổi thành `server/`, `web/` |
| `packages/shared` | **chưa bao giờ được dựng** — `pnpm-workspace.yaml` vẫn khai `packages/*` nhưng glob khớp rỗng; type dùng chung hiện chép tay giữa hai gói |
| `packages/tsconfig` | không có; mỗi gói giữ `tsconfig.json` riêng |
| Deploy Vercel + Hostinger | thay bằng `docker compose up` trên máy cá nhân, demo qua LAN |
| `server/.env` | đã gộp vào `.env` ở gốc |
| `.github/` | **chưa có** — đây là khoảng trống thật, xem `agent/STATUS.md` |

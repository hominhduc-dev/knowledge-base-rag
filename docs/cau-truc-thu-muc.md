# Cấu trúc thư mục — Tàng Thư

**Bản final · chốt sau khi rà lại stack, 22/08/2026**

Monorepo `pnpm workspaces`, hai app deploy độc lập: `apps/frontend` lên Vercel, `apps/backend` lên Hostinger VPS.

## Giả định đang dùng

Ba điểm chưa được xác nhận, tài liệu này đang giả định như sau:

| | Giả định | Đổi thì ảnh hưởng gì |
|---|---|---|
| Ngôn ngữ backend | **TypeScript** | Nếu dùng `.js`: chỉ đổi đuôi file, cây thư mục giữ nguyên, nhưng `packages/shared` mất tác dụng |
| `packages/shared` | **Giữ** | Bỏ thì frontend phải tự định nghĩa lại type `Citation`, dễ lệch với backend |
| Auth cross-origin | **`Authorization: Bearer`**, token lưu phía client | Khi có tên miền chung (`app.` + `api.` cùng domain gốc) thì chuyển sang cookie `httpOnly` |

---

## 1. Tổng thể

```
knowledge-base-rag/
├── apps/
│   ├── backend/                # Express 5 + TypeScript   → Hostinger VPS
│   └── frontend/               # Next.js App Router       → Vercel
├── packages/
│   ├── shared/                 # type + DTO dùng chung hai app
│   └── tsconfig/               # config gốc
├── eval/                       # bộ câu hỏi vàng + kết quả đo
├── docs/                       # tài liệu nộp + ADR
├── scripts/                    # tiện ích chạy tay
├── .github/
├── docker-compose.yml
├── pnpm-workspace.yaml
├── .env.example
├── .gitignore · .editorconfig · eslint.config.js
└── README.md
```

---

## 2. `apps/backend` — Express 5

```
apps/backend/
├── prisma/
│   ├── schema.prisma               ★ Đức giữ — không ai tự sửa
│   ├── migrations/
│   └── seed.ts                     3 khoa + 5 user mẫu                  [TV4]
│
├── src/
│   ├── server.ts                   listen(PORT)
│   ├── app.ts                      cors · json · helmet · error handler
│   ├── routes.ts                   ★ bản đồ toàn bộ API — gọn trong 1 màn hình
│   │
│   ├── config/
│   │   ├── env.ts                  validate biến môi trường bằng zod
│   │   ├── prisma.ts               PrismaClient singleton
│   │   ├── gemini.ts               SDK + model id + retry
│   │   └── supabase.ts             service-role client (Storage)
│   │
│   ├── rag/                        ★ LÕI ~200 DÒNG — thuần, không HTTP  [Đức]
│   │   ├── chunk.ts                cắt theo cấu trúc Điều/Khoản
│   │   ├── embed.ts                Gemini 1536 chiều + normalize L2 + cache
│   │   ├── retrieve.ts             hợp nhất vector + full-text
│   │   ├── generate.ts             gọi Gemini, ràng buộc trích dẫn
│   │   └── prompt.ts               system prompt tiếng Việt
│   │
│   ├── modules/
│   │   ├── identity/                                                    [TV4]
│   │   │   ├── identity.route.ts        /auth/* · /users/* · /departments/*
│   │   │   ├── identity.controller.ts
│   │   │   ├── identity.service.ts      JWT · bcrypt · gán khoa · đổi vai
│   │   │   ├── identity.schema.ts       zod
│   │   │   └── index.ts
│   │   │
│   │   ├── ingest/                                                      [TV2]
│   │   │   ├── ingest.route.ts          /documents/*
│   │   │   ├── ingest.controller.ts
│   │   │   ├── ingest.service.ts        upload → Storage → tạo job
│   │   │   ├── ingest.parser.ts         unpdf · mammoth
│   │   │   ├── ingest.worker.ts         ★ vòng lặp đọc bảng job
│   │   │   ├── ingest.schema.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── chat/                                                        [TV3]
│   │   │   ├── chat.route.ts            /chat/stream (SSE) · /conversations
│   │   │   ├── chat.controller.ts       ★ nơi DUY NHẤT biết định dạng SSE
│   │   │   ├── chat.service.ts          AsyncGenerator · lưu lịch sử
│   │   │   ├── chat.schema.ts
│   │   │   └── index.ts
│   │   │
│   │   └── retrieval/                                                   [Đức]
│   │       ├── retrieval.route.ts       /search
│   │       ├── retrieval.controller.ts
│   │       ├── retrieval.service.ts     tuần 1: trả 3 kết quả cứng
│   │       ├── retrieval.sql.ts         ★ SQL lai — department_id ở WHERE
│   │       ├── retrieval.schema.ts
│   │       └── index.ts
│   │
│   ├── middleware/
│   │   ├── auth.middleware.ts      đọc JWT → req.user                   [TV4]
│   │   ├── role.middleware.ts      requireRole('EDITOR')                [TV4]
│   │   ├── upload.middleware.ts    multer · giới hạn kích thước/MIME    [TV2]
│   │   └── error.middleware.ts     bắt lỗi async · chuẩn hóa response
│   │
│   ├── eval/                                                            [Đức]
│   │   ├── run-eval.ts             CLI: pnpm eval --config=chunk-800
│   │   └── metrics.ts              recall@k · MRR
│   │
│   ├── lib/
│   │   ├── logger.ts
│   │   └── errors.ts               AppError · NotFoundError · ForbiddenError
│   │
│   └── types/
│       └── express.d.ts            mở rộng Request thêm `user`
│
├── tests/
│   ├── scope-isolation.test.ts     ★ mốc sống còn Sprint 3              [Đức]
│   ├── identity.test.ts                                                 [TV4]
│   ├── ingest.test.ts                                                   [TV2]
│   └── helpers/  db.ts · factories.ts
│
├── Dockerfile
├── .env.example
├── package.json
└── tsconfig.json
```

---

## 3. `apps/frontend` — Next.js

```
apps/frontend/
├── src/
│   ├── app/
│   │   ├── layout.tsx · globals.css
│   │   ├── page.tsx                     landing → chuyển hướng /chat
│   │   ├── (auth)/
│   │   │   ├── layout.tsx
│   │   │   └── login/page.tsx            không có màn đăng ký           [TV4]
│   │   └── (app)/
│   │       ├── layout.tsx                sidebar + chặn chưa đăng nhập
│   │       ├── chat/page.tsx                                            [TV3]
│   │       ├── documents/page.tsx                                       [TV2]
│   │       └── admin/
│   │           ├── users/page.tsx                                       [TV4]
│   │           └── departments/page.tsx                                 [TV4]
│   │
│   ├── components/
│   │   ├── ui/                           shadcn sinh ra — KHÔNG sửa tay
│   │   └── layout/  Sidebar.tsx · Header.tsx · UserMenu.tsx
│   │
│   ├── features/
│   │   ├── auth/        LoginForm · ChangePasswordDialog · useAuth      [TV4]
│   │   ├── chat/        ChatBox · MessageList · MessageBubble           [TV3]
│   │   │                CitationChip · CitationDrawer · useSseStream
│   │   ├── documents/   UploadDropzone · DocumentTable · StatusBadge    [TV2]
│   │   └── admin/       UserTable · RoleSelect · DepartmentForm         [TV4]
│   │
│   ├── lib/
│   │   ├── api-client.ts                 fetch wrapper + gắn JWT
│   │   ├── sse.ts                        đọc luồng SSE
│   │   └── utils.ts                      cn() của shadcn
│   │
│   └── hooks/  use-toast.ts · use-debounce.ts
│
├── public/
├── components.json                       config shadcn
├── next.config.ts · tailwind.config.ts
├── .env.local.example
├── package.json
└── tsconfig.json
```

---

## 4. Phần dùng chung và tài liệu

```
packages/
├── shared/src/
│   ├── index.ts
│   ├── roles.ts              VIEWER · CONTRIBUTOR · EDITOR · ADMIN
│   ├── constants.ts          EMBEDDING_DIM = 1536 · TOP_K · CHUNK_SIZE
│   └── dto/
│       ├── auth.dto.ts       LoginRequest · AuthUser
│       ├── document.dto.ts   DocumentSummary · UploadResponse
│       └── chat.dto.ts       ★ Citation · StreamEvent — hợp đồng TV3 ↔ Đức
└── tsconfig/base.json

eval/
├── golden-questions.yaml     30 câu + đáp án chuẩn + doc_id kỳ vọng
└── results/                  bảng recall@k của 3 cấu hình

docs/
├── TONG-QUAN-DU-AN.md        bản cập nhật theo stack đã chốt
├── cau-truc-thu-muc.md       ← tài liệu này
├── api-contract.md           ★ chốt tuần 1 — TV3 và TV4 dựa vào để làm song song
├── data-survey.md            khảo sát 15 tài liệu thật trước khi thiết kế chunk
├── erd.md                    Mermaid, nằm trong git để review được trong PR
├── architecture.md
└── adr/
    ├── 001-khong-dung-langchain.md
    ├── 002-lap-department-id-xuong-chunks.md
    ├── 003-tim-kiem-lai-thay-vi-thuan-vector.md
    └── 004-supabase-thay-vi-postgres-self-host.md

scripts/
└── check-pdf.ts              tuần 1: quét file scan, loại khỏi tập dữ liệu

.github/
├── workflows/
│   ├── ci.yml                lint + typecheck + test (service pgvector riêng)
│   └── deploy-api.yml        SSH → Hostinger VPS · docker compose pull && up
└── pull_request_template.md  ép ghi "Closes #<số>"
```

---

## 5. Bảng sở hữu

| Người | Thư mục sở hữu |
|---|---|
| **Hồ Minh Đức** | `apps/backend/src/rag/` · `apps/backend/src/modules/retrieval/` · `apps/backend/src/eval/` · `apps/backend/prisma/schema.prisma` · `eval/` · `.github/` · `docker-compose.yml` · `docs/adr/` |
| **Thành viên 2** | `apps/backend/src/modules/ingest/` · `apps/backend/src/middleware/upload.middleware.ts` · `apps/frontend/src/features/documents/` · `apps/frontend/src/app/(app)/documents/` |
| **Thành viên 3** | `apps/backend/src/modules/chat/` · `apps/frontend/src/features/chat/` · `apps/frontend/src/app/(app)/chat/` |
| **Thành viên 4** | `apps/backend/src/modules/identity/` · `apps/backend/src/middleware/{auth,role}.middleware.ts` · `apps/backend/prisma/seed.ts` · `apps/frontend/src/features/{auth,admin}/` · `apps/frontend/src/app/(auth)/` · `apps/frontend/src/app/(app)/admin/` |

**Ba file cả nhóm cùng đụng** — xung đột ở đây thì luôn giữ cả hai bên, đừng chọn "accept mine":

- `apps/backend/src/routes.ts`
- `packages/shared/src/dto/`
- `apps/frontend/src/components/layout/Sidebar.tsx`

---

## 6. Bốn quy ước bắt buộc

1. **`*.controller.ts` không được `import { prisma }`.** Chạm cơ sở dữ liệu là việc của service.
2. **`*.service.ts` không nhận `Request`, không gọi `res`.** Giữ được điều này thì unit test không cần dựng HTTP — đó là toàn bộ lý do tách tầng.
3. **Lọc `department_id` nằm trong `retrieval.sql.ts`**, ở mệnh đề `WHERE` trước bước xếp hạng — không phải trong controller. Mục tiêu kỹ thuật số 1 của đồ án là kiểm soát truy cập ở tầng truy vấn.
4. **Module A dùng module B thì import từ `modules/B/index.ts`**, không thọc thẳng vào file bên trong.

Thêm hai điều về tài liệu: `docs/erd.md` và `docs/architecture.md` viết bằng Mermaid để nằm chung git với code; `components/ui/` do shadcn CLI sinh ra, cần đổi giao diện thì bọc component mới trong `features/`.

---

## 7. Tối thiểu phải tồn tại cuối Sprint 1

Không dựng hết cây trên trong tuần đầu. Cuối tuần 2 chỉ cần:

- `docker-compose.yml` · `pnpm-workspace.yaml` · `.env.example`
- `prisma/schema.prisma` đầy đủ + `seed.ts`
- `apps/backend/src/{server,app,routes}.ts` · `config/` · `middleware/{auth,role,error}`
- `apps/backend/src/modules/identity/` chạy được · `apps/backend/src/modules/ingest/` upload được · `apps/backend/src/modules/retrieval/` trả 3 kết quả cứng
- `apps/frontend/src/app/(auth)/login` · `apps/frontend/src/app/(app)/chat` gọi được API giả lập
- `docs/api-contract.md` · `docs/erd.md` · `docs/data-survey.md`
- `.github/workflows/ci.yml`

Mốc Sprint 1: upload một file PDF, thấy các đoạn văn xuất hiện trong bảng `chunks`.

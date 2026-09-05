# Handoff — Hỏi đáp SSE, ràng buộc trích dẫn và Docker chạy đủ bốn dịch vụ

## Thông tin

- Agent: Claude Opus 5
- Ngày: 04/09/2026
- Nhánh: `feat/thiet-ke-v2-docker-netlab` (**chưa merge vào `main`, chưa push**)
- Commit cuối: `dfe18fb`
- Phạm vi được giao: ba việc — dọn `.gitignore` rồi commit phần đang treo; dựng
  `modules/chat/`; build thử hai image Docker

## Đã hoàn thành

### 1. Dọn `.gitignore` và commit — `4a9dd22`

- Thêm `server/uploads/` và `.vscode/` vào `.gitignore` **TRƯỚC** khi commit.
  Chưa loại thì lần commit đó đã đưa 2 PDF nội bộ của trường (1,7 MB) vào lịch sử
  Git vĩnh viễn, trong khi sản phẩm bàn giao A yêu cầu repo công khai.
- Commit lại toàn bộ phần truy hồi lai do agent Codex GPT-5 làm, vốn đang treo
  ngoài Git.

### 2. `modules/chat/` — `e825d31`

- `POST /chat` phát SSE theo thứ tự `sources → token* → done`, đúng phụ lục A.
- `GET /conversations` và `GET /conversations/:id`, lọc theo `userId` ngay trong
  truy vấn.
- `rag/prompt.ts` · `rag/generate.ts` · `rag/citation-guard.ts`.
- `web/src/lib/chat-stream.ts` và `ChatBox` nối vào `/chat` thật.
- 11 test mới cho ràng buộc trích dẫn.

### 3. Docker — `dfe18fb`

- Hai image build được; `docker compose up` chạy đủ **db · api · web · caddy**.
- Vào qua Caddy cổng 80: `/login`, `/chat`, `/api/health` đều 200.
- Thêm cơ chế thử lại cho bước sinh câu trả lời (xem Quyết định số 4).

## File đã thay đổi

| File | Thay đổi |
|---|---|
| `server/src/modules/chat/**` | Mới — schema · service · controller · route · index |
| `server/src/rag/prompt.ts` | Mới — system prompt, ngữ cảnh đánh số, câu từ chối |
| `server/src/rag/generate.ts` | Mới — gọi mô hình, tách luồng SSE, thử lại khi mở luồng |
| `server/src/rag/citation-guard.ts` | Mới — gỡ marker mô hình bịa ra |
| `server/src/rag/citation-guard.test.ts` | Mới — 11 test |
| `web/src/lib/chat-stream.ts` | Mới — đọc SSE bằng `fetch` |
| `web/src/features/chat/ChatBox.tsx` | Gọi `/chat` thay `/search`; gỡ `buildSearchAnswer` |
| `server/Dockerfile` · `web/Dockerfile` | Thêm `ENV CI=true` |
| `server/package.json` | Chuyển `prisma` sang `dependencies` |
| `server/src/config/env.ts` | Thêm `GENERATION_MAX_TOKENS` |
| `server/src/routes.ts` | Gắn `chatRouter` |
| `.gitignore` | Loại `server/uploads/`, `uploads/`, `.vscode/`, `.idea/` |

## Quyết định kỹ thuật

1. **Hai ràng buộc quan trọng nhất nằm ở TẦNG MÃ NGUỒN, không phải trong prompt.**
   Prompt là gợi ý, mô hình có thể phớt lờ.
   - Truy hồi rỗng thì **không gọi mô hình**, phát thẳng câu từ chối. Gọi mô hình
     khi không có ngữ cảnh là để nó trả lời bằng kiến thức chung về giáo dục đại
     học — nghe hợp lý và sai, đúng cái sai nguy hiểm nhất đề tài đặt ra để chống.
   - `citation-guard.ts` gỡ mọi marker `[n]` không trỏ tới nguồn có thật, và thay
     cả câu trả lời bằng thông điệp từ chối nếu không còn trích dẫn hợp lệ nào.
2. **`chat.service.ts` KHÔNG biết SSE là gì**, nó trả `AsyncGenerator` các sự kiện;
   `chat.controller.ts` là nơi duy nhất tuần tự hóa lên dây. Nhờ ranh giới đó, bộ
   đánh giá Sprint 4 gọi thẳng service được, không phải dựng máy chủ HTTP.
3. **Gom toàn bộ câu trả lời để kiểm marker, nhưng vẫn phát `token` ngay khi nhận.**
   Không thể kiểm một marker khi nó mới về nửa chừng (`[1` rồi mới tới `]` ở mảnh
   sau), nhưng người dùng vẫn thấy chữ chảy dần.
4. **Thử lại CHỈ ở bước mở luồng, không bao giờ giữa chừng.** Token đầu tiên đã ra
   tới trình duyệt rồi mà gọi lại là sinh câu trả lời thứ hai nối vào giữa câu thứ
   nhất — văn bản lai tạp mà không có lỗi nào báo.
5. **`prisma` thuộc `dependencies`, không phải `devDependencies`.** Ngoài chuyện
   `install --prod` gỡ mất CLI làm `prisma generate` thất bại, production còn cần
   CLI để chạy `migrate deploy`.
6. **`chat-stream.ts` dùng `fetch` chứ không dùng `EventSource`** — `EventSource`
   chỉ gửi GET và không đính kèm được header `Authorization`.
7. **Bỏ `buildSearchAnswer` khỏi `ChatBox`** thay vì giữ làm đường lùi. Giữ lại là
   hai nguồn sự thật cho cùng một thứ.

## Kiểm tra đã chạy

```bash
docker compose up -d db
corepack pnpm --filter @tang-thu/server run test      # 52/52 đạt
corepack pnpm run typecheck                           # server + web, đạt
corepack pnpm --filter @tang-thu/web run lint         # đạt
docker compose build api web
docker compose up -d                                  # đủ 4 dịch vụ
```

### Kịch bản demo chính — chạy thật qua `POST /chat`

| Người hỏi | Câu trả lời | Marker |
|---|---|---|
| SV Công nghệ Thông tin | **105 tín chỉ**, không nợ quá 02 học phần | `[4]` |
| SV Kiến trúc, **cùng câu hỏi** | **90 tín chỉ**, hoàn thành thực tập công trình | `[4]` |

Kiểm ở tầng nguồn: sinh viên Kiến trúc nhận 10 nguồn, đơn vị chỉ gồm *Toàn trường*
và *Khoa Kiến trúc* — **không một nguồn nào của CNTT**, và nội dung không chứa
"105 tín chỉ".

Hỏi ngoài phạm vi tài liệu (*"Giá vé máy bay đi Nhật Bản…"*): hệ thống **từ chối**,
không bịa con số nào.

### Docker — lần đầu chạy đủ bốn dịch vụ

| | |
|---|---|
| `docker compose ps` | db · api · web · caddy đều `running` |
| Qua Caddy cổng 80 | `/login` 200 · `/chat` 200 · `/api/health` 200 |
| Đăng nhập qua proxy | Trả đúng người dùng, vai và phạm vi |
| SSE xuyên Caddy | Token cách nhau **~80 ms**, không dồn về cuối — `flush_interval -1` có tác dụng |

## Chưa hoàn thành

- [ ] `/users/*` và `/departments/*` (TV4) — màn quản trị vẫn dùng mock.
- [ ] Màn tài liệu của giao diện chưa nối vào `/documents` thật.
- [ ] `eval/` — bộ 30 câu hỏi vàng và 9 lần chạy. `eval_sets` mới có một dòng rỗng.
- [ ] Chưa có `.github/` — mà test rò rỉ phạm vi là điều kiện chặn merge.
- [ ] Chưa thử demo LAN từ máy khác.
- [ ] `docs/cau-truc-thu-muc.md` còn mô tả `apps/backend`, chưa có `netlab`.
- [ ] `packages/shared/` chưa tồn tại.

## Blocker

**Không có blocker kỹ thuật.**

Ba vấn đề cần quyết định, không phải cần sửa code:

1. **Nguồn dữ liệu vẫn là rủi ro lớn nhất.** Hai tài liệu thật của trường đều là
   bản scan thuần. Agent trước đã xử lý bằng **OCR qua Gemini**, nhưng mục 3 tổng
   quan **cố ý loại OCR khỏi phạm vi** — code và tài liệu đang mâu thuẫn. Cần chốt:
   ghi OCR vào phạm vi chính thức, hay đổi sang tài liệu có lớp văn bản.
2. **Độ trễ vượt xa mục tiêu.** Đo qua Caddy: một lượt hỏi đáp mất **7–23 giây**,
   biến động lớn do các lần thử lại 503 của Gemini. Yêu cầu phi chức năng là token
   đầu tiên dưới **2,5 giây**. Đây là số liệu cho phần đo đạc Sprint 4, và có thể
   phải đổi model hoặc chấp nhận sửa lại con số mục tiêu trong tài liệu.
3. **57 sinh viên trong seed là người thật**, trong khi bàn giao A yêu cầu repo
   công khai. Chưa chốt ẩn danh hóa hay không.

## Việc agent tiếp theo cần làm

1. **Dựng `eval/`** — bộ 30 câu hỏi vàng và bộ chạy đánh giá. Đây là tiêu chí thành
   công số 4 (`eval_runs` ≥ 9 dòng) và là thứ tách đồ án khỏi một bài tập gọi API.
   `chat.service.ts` trả `AsyncGenerator` nên gọi thẳng được, không cần HTTP.
   **Cẩn thận:** chạy lại `db:seed` sẽ xóa sạch liên kết câu hỏi vàng — xem Rủi ro.
2. **Thêm `.github/workflows/`** cho `typecheck` + `test`, đặt test rò rỉ phạm vi
   làm điều kiện chặn merge. Cần Postgres service trong CI.
3. Nối màn tài liệu của giao diện vào `/documents` — backend đã sẵn sàng.
4. Dựng `/users` và `/departments` để màn quản trị bỏ được mock.
5. Thử demo LAN từ máy khác — `NEXT_PUBLIC_API_URL` đã để tương đối nên về lý
   thuyết chỉ cần mở firewall, nhưng chưa ai kiểm.

## Cách tiếp tục

```bash
corepack pnpm install
docker compose up -d                 # đủ 4 dịch vụ, vào qua http://localhost
# hoặc chạy trên máy để sửa nhanh:
docker compose up -d db
corepack pnpm run dev                # api :4000 · web :3000
```

Đăng nhập — **mật khẩu sinh viên là chính MSSV**; cán bộ dùng mật khẩu riêng:

| Tài khoản | Mật khẩu | Vai | Thấy được |
|---|---|---|---|
| `2351220193` | `2351220193` | STUDENT | CNTT + toàn trường |
| `2351220221` | `2351220221` | STUDENT | Kiến trúc + toàn trường |
| `ha.nt@dau.edu.vn` | `Tangthu@123` | ADMIN | tất cả |

Cặp đối chứng: hỏi *"Điều kiện để được nhận đồ án tốt nghiệp là gì?"* — CNTT phải
ra **105 tín chỉ**, Kiến trúc phải ra **90 tín chỉ**.

## Lưu ý rủi ro

- **BẪY ĐA MODEL.** `chunk_embeddings` giữ hai bộ vector (`-001` và `-2`). Câu
  `JOIN chunk_embeddings e ON e.chunk_id = c.id` **quên lọc model** sẽ trả mỗi đoạn
  hai lần, **không có lỗi nào báo**. Dùng `MODEL_HIEN_TAI` trong `rag/embed.ts`.
  `db:check` đã cảnh báo việc này.
- **Điều gì được phát khác điều gì được lưu, ở đường từ chối.** Khi mô hình tự từ
  chối mà không trích dẫn gì, người dùng thấy văn bản của mô hình chảy ra, còn CSDL
  lưu câu từ chối chuẩn của hệ thống. Tải lại hội thoại sẽ thấy chữ khác. Cả hai
  đều là từ chối nên vô hại, nhưng nên thống nhất.
- **Ngưỡng `RETRIEVAL_MIN_SCORE = 0.35` gần như không lọc được gì.** Câu hỏi hoàn
  toàn ngoài phạm vi (*giá vé máy bay*) vẫn kéo về đủ 10 nguồn. Đường từ chối hiện
  dựa vào mô hình tự nhận ra và vào `citation-guard`, chứ không dựa vào ngưỡng.
  Cần đo lại ngưỡng ở Sprint 4.
- **Chạy lại seed sẽ xóa sạch liên kết câu hỏi vàng.** `seed.ts` xóa-rồi-tạo lại
  `chunks`, mà `eval_gold_chunks.chunk_id` có `ON DELETE CASCADE`. **Phải xử lý
  trước khi dựng `eval/`.** Xem `docs/erd.md` mục 5.1.
- **Chạy `db:check` sau MỌI lần `prisma migrate`** — năm khối SQL viết tay nằm
  ngoài tầm hiểu của Prisma; mất chỉ mục HNSW không gây lỗi nào, chỉ chậm dần.
- **Ghim `prisma` ở 6.16.x.** CLI mời nâng lên 8.x — đừng nâng.
- **`.env` ở gốc chứa mật khẩu Postgres, `server/.env` chứa `JWT_SECRET` và khóa
  Gemini.** Cả hai đã được `.gitignore` loại; kiểm lại bằng
  `git check-ignore -v .env server/.env` trước mỗi lần commit.

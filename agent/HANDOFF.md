# Handoff — Truy hồi lai thật cho `/search`

## Thông tin

- Agent: Codex GPT-5
- Ngày: 29/08/2026
- Nhánh: `feat/thiet-ke-v2-docker-netlab`
- Commit cuối: `476aa3c` khi bắt đầu; thay đổi hiện tại chưa commit
- Phạm vi được giao: đọc thư mục `agent` trước khi tiếp tục, rồi thay bản `/search` tạm bằng truy hồi lai thật và chốt chặn lỗi đa model

## Đã hoàn thành

- [x] Đọc `agent/README.md`, `agent/STATUS.md`, `agent/HANDOFF.md`, `agent/HANDOFF-TEMPLATE.md`.
- [x] Đọc `docs/cau-truc-thu-muc.md`; tài liệu này vẫn mô tả cấu trúc cũ nhưng còn giữ quy ước quan trọng: lọc phạm vi nằm trong `retrieval.sql.ts`.
- [x] Thêm `server/src/modules/retrieval/retrieval.sql.ts`.
- [x] Đổi `POST /search` từ 3 kết quả cứng sang truy hồi thật: nhúng câu hỏi bằng `nhungCauHoi`, truy vấn SQL lai, trả `Source[]` theo contract hiện có.
- [x] Thêm test bắt truy hồi không trả trùng `chunk_id` khi bảng có nhiều model embedding.
- [x] Chạy kiểm tra liên quan: server typecheck, toàn bộ test server, `db:check`, typecheck toàn workspace.
- [x] Nạp 2 PDF thật từ `C:\Users\PC\Downloads\Data DAU`: cả hai là PDF scan nên parser thường fail; đã OCR bằng Gemini `gemini-2.5-flash`, cắt thành 17 chunk và sinh 17 vector `gemini-embedding-2`.
- [x] Đổi quy ước mật khẩu sinh viên: mật khẩu mặc định là chính MSSV/code 10 chữ số. Đã cập nhật seed và 57 tài khoản sinh viên trong DB hiện tại.
- [x] Kiểm giao diện đang chạy ở `http://127.0.0.1:3000`: trang login mở được, API health chạy; phát hiện `ChatBox` vẫn dùng mock nên đã đổi sang gọi `POST /search`.
- [x] Sửa regression retrieval do ảnh chụp chỉ ra: câu “chuẩn đầu ra sinh viên công nghệ
      thông tin” bị vector kéo sang nguồn phụ lục/hiệu lực. SQL đã đổi sang RRF, API
      hiện trả top 1 `Chương 2 > Điều 2 · Trang 2`.

## File đã thay đổi

| File | Thay đổi |
|---|---|
| `server/src/modules/retrieval/retrieval.sql.ts` | SQL lai vector + toàn văn, lọc phạm vi trong `WHERE`, JOIN embedding có `e.model = MODEL_HIEN_TAI`; hợp nhất kết quả bằng RRF |
| `server/src/modules/retrieval/retrieval.service.ts` | Bỏ stub 3 kết quả cứng; nhúng câu hỏi, gọi SQL, format `Source` |
| `server/src/modules/retrieval/retrieval.sql.test.ts` | Test dùng vector sẵn trong DB để bắt lỗi trả trùng chunk do quên lọc model |
| `server/src/routes.ts` | Gỡ ghi chú `/search` là bản tạm |
| `server/src/config/env.ts` | Đổi default embedding model sang `gemini-embedding-2`; sửa ghi chú chuẩn hóa |
| `server/prisma/embed.ts` | Đổi fallback model của script `db:embed` sang `gemini-embedding-2` |
| `server/prisma/schema.prisma` | Sửa comment model embedding đang dùng |
| `README.md` | Sửa dòng stack từ `gemini-embedding-001` sang `gemini-embedding-2` |
| `docs/erd.md` | Sửa tên model mặc định và ghi chú chuẩn hóa L2 cho bản 2 |
| `docs/phan-quyen.md` | Cập nhật ghi chú tài khoản sinh viên: mật khẩu trùng MSSV |
| `server/prisma/seed.ts` | Tách mật khẩu cán bộ/admin khỏi mật khẩu sinh viên; sinh viên dùng chính MSSV |
| `web/src/features/chat/ChatBox.tsx` | Bỏ trả lời mock; gọi `/search` với 3 nguồn, trích nguồn khớp nhất và mở citation drawer |
| `web/src/lib/mock-data.ts` | Đổi câu hỏi mẫu sang nội dung chứng chỉ ngoại ngữ/tin học vừa embed |
| `server/uploads/` | Pipeline lưu bản PDF gốc theo hash nội dung; thư mục đang untracked |
| `agent/STATUS.md` | Cập nhật trạng thái truy hồi và số test |
| `agent/HANDOFF.md` | Viết lại handoff này |

## Quyết định kỹ thuật

1. `retrieval.sql.ts` import `scopeSql(user, "c")`; không viết lại điều kiện phạm vi trong module retrieval.
2. JOIN bắt buộc là `JOIN chunk_embeddings e ON e.chunk_id = c.id AND e.model = MODEL_HIEN_TAI`. Đây là chốt chặn chính cho bẫy hai bộ vector cùng tồn tại.
3. Nhánh từ khóa dùng mẫu đã ghi trong test và `docs/erd.md`: `replace(plainto_tsquery('simple', query)::text, '&', '|')::tsquery`, vì `plainto_tsquery` mặc định AND quá hẹp với câu hỏi tự nhiên.
4. Hybrid ranking dùng RRF thay vì cộng trực tiếp cosine với `ts_rank`. Hai điểm này không cùng thang đo; cộng tuyến tính làm vector lấn át từ khóa đặc thù và đã gây lệch top source.
5. `retrieval.service.ts` vẫn giữ `buildLocator` và type `Source` để các module khác, đặc biệt `documents`, không đổi contract.
6. Test SQL không gọi Gemini; nó lấy một vector hiện có trong DB. Nếu DB chưa có vector cho `MODEL_HIEN_TAI`, test tự skip phần này.
7. Các default cục bộ cũng phải là `gemini-embedding-2`, không chỉ `.env`, để máy mới hoặc script chạy thiếu biến không âm thầm quay về `-001`.

## Kiểm tra đã chạy

```bash
corepack pnpm --filter @tang-thu/server run typecheck
corepack pnpm --filter @tang-thu/server run test
corepack pnpm --filter @tang-thu/server run db:check
corepack pnpm run typecheck
```

Kết quả:

- Typecheck server: đạt
- Typecheck workspace: đạt
- Test server: 41/41 đạt
- Login trực tiếp: `2351220193 / 2351220193` đạt; `2351220193 / Tangthu@123` bị 401; `ha.nt@dau.edu.vn / Tangthu@123` đạt
- API trực tiếp: `/api/search` với câu hỏi về quy đổi chứng chỉ ngoại ngữ/tin học trả nguồn từ tài liệu `439/QĐ-ĐHKTĐN`, gồm các chứng chỉ VSTEP, PET, CAE, Aptis ESOL, TOEIC, IELTS, TOEFL iBT, HSK, TOCFL, JLPT, IC3, ICDL.
- API trực tiếp sau sửa RRF: câu “chuẩn đầu ra sinh viên công nghệ thông tin” trả top 1 `439/QĐ-ĐHKTĐN`, `Chương 2 > Điều 2 · Trang 2`, đúng đoạn “Yêu cầu chuẩn đầu ra ngoại ngữ, tin học”.
- UI: mở được trang login trong browser, không có lỗi console; chưa hoàn tất thao tác chat end-to-end vì browser automation context thiếu `localStorage`, `fetch` và không persist được input form. Đây là giới hạn của công cụ kiểm, không phải bằng chứng lỗi app.
- Build: chưa chạy
- `db:check`: 27/27 đạt; vẫn cảnh báo đúng rằng bảng có 2 model embedding và mọi JOIN phải lọc `e.model`
- Sau khi nạp 2 PDF thật: `gemini-embedding-2` có 30 vector; hai tài liệu mới đều `READY`

## Chưa hoàn thành

- [x] Đã chạy endpoint `/api/search` qua HTTP và nhận đúng nguồn từ hai PDF mới embed.
- [ ] Chưa đo chất lượng truy hồi bằng bộ `golden-30`; bảng eval vẫn rỗng.
- [ ] Chưa chạy `docker compose build` cho `api` và `web`.
- [ ] `docs/cau-truc-thu-muc.md` vẫn mô tả cấu trúc cũ `apps/*`.
- [ ] `README.md` vẫn còn nội dung cũ cần rà tiếp.

## Blocker

- Không có blocker trong phạm vi truy hồi SQL.
- Lưu ý vận hành: `/search` thật cần `GEMINI_API_KEY` hợp lệ ở môi trường chạy server. Không có khóa thì `nhungCauHoi` trả `UPSTREAM_ERROR`.

## Việc agent tiếp theo cần làm

1. Chạy thử `/api/search` qua HTTP với `GEMINI_API_KEY` thật nếu muốn kiểm end-to-end ngoài test SQL.
2. Khảo sát tập tài liệu thật để phân loại PDF có text layer và PDF scan.
3. Dựng `modules/chat/` dùng kết quả truy hồi mới, theo SSE `sources → token* → done`.
4. Chạy `docker compose build` cho hai Dockerfile.
5. Cập nhật `docs/cau-truc-thu-muc.md` sang cấu trúc `server/` + `web/` + `netlab/`.

## Cách tiếp tục

```bash
docker compose up -d db
corepack pnpm --filter @tang-thu/server run db:check
corepack pnpm --filter @tang-thu/server run test
corepack pnpm run dev
```

Muốn kiểm `/search` end-to-end:

```bash
# 1. Đảm bảo .env có GEMINI_API_KEY và GEMINI_EMBEDDING_MODEL=gemini-embedding-2
# 2. Đăng nhập lấy token
# 3. POST /api/search với Authorization: Bearer <token>
```

## Lưu ý rủi ro

- Bảng `chunk_embeddings` hiện có cả `gemini-embedding-001` và `gemini-embedding-2`. Xóa điều kiện model trong JOIN là lỗi nghiêm trọng vì trả trùng chunk và làm mất dung lượng top-k.
- `RETRIEVAL_MIN_SCORE=0.35` và `RETRIEVAL_ALPHA=0.6` vẫn là giả thiết; cần bộ eval chọn bằng số liệu.
- Vì `retrieval.sql.test.ts` dùng DB thật, trước khi chạy test cần seed; phần vector chỉ kiểm khi DB đã chạy `db:embed`.
- Hai PDF thật không có text layer. Nếu chạy lại bằng worker thường, chúng sẽ fail parse nếu chưa có bước OCR bổ sung.

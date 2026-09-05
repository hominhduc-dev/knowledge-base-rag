# Sổ Tay Sinh Viên CNTT

Hệ thống hỏi đáp học vụ cho sinh viên **ngành Công nghệ Thông tin, Trường Đại học Kiến trúc Đà Nẵng**. Đồ án học phần **Lập trình mạng máy tính**.

Hỏi bằng tiếng Việt, nhận câu trả lời kèm nguồn trong tài liệu CNTT và quy định chung áp dụng cho CNTT. Không tra cứu điểm số, lịch học hoặc dữ liệu cá nhân.

## Phạm vi hiện hành

- `USER`: hỏi đáp, tài liệu, nguồn trích dẫn, hội thoại cá nhân.
- `CONTENT_ADMIN`: thêm quyền quản lý tài liệu và xử lý lại lỗi.
- `SYSTEM_ADMIN`: thêm quyền quản lý tài khoản và phân quyền.

Cả ba vai có cùng kho tri thức CNTT. Không quản trị nhiều khoa; không có nhánh quản trị đọc dữ liệu khoa khác.

## Nội dung kỹ thuật

Next.js + Express + PostgreSQL/pgvector. REST và SSE; nạp PDF/DOCX bằng worker; truy hồi lai và trích dẫn bắt buộc. Module `server/src/netlab/` minh họa TCP/HTTP tự viết, framing, nhiều client, Content-Length UTF-8 và kết nối LAN.

## Chạy dự án

```powershell
corepack pnpm install
# Cấu hình .env gốc cho Docker và server/.env cho ứng dụng.
corepack pnpm --filter @tang-thu/server db:generate
# DB mới: migrate rồi nạp dữ liệu demo.
corepack pnpm --filter @tang-thu/server db:deploy
corepack pnpm --filter @tang-thu/server db:seed
corepack pnpm dev
```

Có thể chạy qua `docker compose up --build`. Với CSDL đang có, đọc hướng dẫn nâng cấp trước; không chạy seed để thay đổi dữ liệu thật. Migration không tự cấp quản trị viên đầu tiên.

## Tài liệu

- [Phạm vi CNTT, ba vai và hướng dẫn nâng cấp](docs/PHAM-VI-CNTT.md)
- [Phân quyền hiện hành](docs/phan-quyen.md)
- [Sơ đồ use case](docs/use-cases/tang-thu-use-case.html)
- [Trạng thái công việc](agent/STATUS.md)
- [Handoff cho phiên tiếp theo](agent/HANDOFF.md)
- [Thiết kế nền tảng v2 — tham khảo kỹ thuật](docs/THIET-KE-HE-THONG.md)

Chưa có màn/API tạo tài khoản và đánh giá qua web; cấp tài khoản demo qua seed, đánh giá qua CLI. SSO, OCR, quản trị nhiều đơn vị và quản lý đào tạo ngoài phạm vi học phần.

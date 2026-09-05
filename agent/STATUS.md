# Trạng thái — Sổ Tay Sinh Viên CNTT

**Cập nhật: 05/09/2026.** Học phần Lập trình mạng máy tính. Đối tượng duy nhất: sinh viên ngành CNTT, Trường Đại học Kiến trúc Đà Nẵng.

Nguồn yêu cầu hiện hành: [PHAM-VI-CNTT.md](../docs/PHAM-VI-CNTT.md). Đã chốt giữ ba vai, không triển khai phạm vi đa khoa.

| Hạng mục | Trạng thái |
|---|---|
| Vai trò | Đã đổi enum, backend và frontend: USER / CONTENT_ADMIN / SYSTEM_ADMIN |
| Kho tri thức | Cả ba vai chỉ có CNTT + quy định chung áp dụng cho CNTT |
| Xác thực | JWT đọc lại vai/trạng thái từ CSDL; chỉ nhận tư cách CNTT; vai khoa khác không nâng quyền |
| Tài liệu | CONTENT_ADMIN và SYSTEM_ADMIN upload/sửa/gỡ/retry; USER chỉ đọc |
| Tài khoản | Chỉ SYSTEM_ADMIN xem/khóa/mở và phân quyền; giới hạn người dùng CNTT |
| Giao diện | Bỏ chọn khoa và trang cây đơn vị; thêm chọn 3 vai và nhóm tài liệu tải lên; bỏ SSO giả lập |
| Migration | Có migration không xóa dữ liệu; đã chạy trên DB local thử nghiệm riêng |
| Provisioning | Có bootstrap-admin.ts, mặc định dry-run; seed demo 1 đơn vị, 57 sinh viên và 3 cán bộ |
| Đánh giá | Bộ cntt-v1 có 27 câu phù hợp phạm vi; chưa chạy đánh giá bằng Gemini trong phiên này |
| Sơ đồ | Đã cập nhật SVG/HTML/PlantUML: 16 use case nghiệp vụ + 3 kỹ thuật |
| Lập trình mạng | Giữ netlab TCP/HTTP, framing, nhiều client; test mạng nằm trong bộ test đã chạy |
| Tài liệu agent | Dùng agent/, không tạo .agent/; lưu handoff cũ thành tài liệu lịch sử |

## Kiểm chứng phiên này

- Backend typecheck và build: đạt.
- Frontend typecheck, ESLint và production build: đạt. Build cần mạng để tải Google Fonts.
- Test backend: **85 test, 84 đạt, 0 lỗi, 1 bỏ qua**; bài kiểm vector thật bỏ qua do DB thử nghiệm chưa có embedding.
- Kiểm thử phân quyền: 16 test tích hợp, có request HTTP thật, SQL/Prisma và kiểm JWT sau đổi vai/khóa tài khoản.
- Migration + seed: đạt trên `tangthu_cntt_test_20260905`, Postgres Docker local. Seed: 6 tài liệu, 11 đoạn văn.
- Sơ đồ: đã mở và xem trên trình duyệt. Chưa kiểm giao diện ứng dụng với từng vai bằng trình duyệt; test HTTP xác minh backend.

## Chưa triển khai lên dữ liệu đang dùng

- Chưa migrate DB trong server/.env; chưa rebuild/restart các container ứng dụng hiện tại.
- Chưa chọn hoặc gán tài khoản quản trị viên đầu tiên trên DB đang dùng.
- Dữ liệu và tài khoản ngoài CNTT không bị xóa. Các tài khoản CNTT từng được seed sang khoa khác cần rà soát/gán CNTT khi nâng cấp.
- Không chạy seed trên DB thật: seed đặt lại mật khẩu mẫu và cập nhật dữ liệu mồi.
- Chưa commit hoặc push.

## Phạm vi còn thiếu / không làm

- Chưa có màn/API tạo tài khoản; cấp tài khoản bằng provisioning/seed.
- Chưa có API/màn hình chạy đánh giá; dùng CLI.
- Không làm CRUD nhiều khoa, SSO, OCR, tuyển sinh hoặc dữ liệu đào tạo cá nhân.
- Demo LAN, ảnh Wireshark và đo tải/độ trễ cần thực hiện trên môi trường chạy thật trước bảo vệ.

## Use case toàn hệ thống

Sơ đồ hiện hành tại `docs/use-cases/tang-thu-use-case.html` dùng ba actor: Sinh Viên CNTT (USER), Giáo vụ khoa CNTT (CONTENT_ADMIN), Quản Trị Viên (SYSTEM_ADMIN). Gồm 16 use case nghiệp vụ và 3 use case kỹ thuật; tác nhân kỹ thuật phụ trợ không bổ sung vai trò tài khoản. Các bản SVG, PlantUML và danh mục được sinh từ `docs/use-cases/build_diagrams.py`.

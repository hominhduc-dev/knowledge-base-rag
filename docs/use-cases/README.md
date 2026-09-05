# Use case Sổ Tay Sinh Viên CNTT

Phạm vi hiện hành: sinh viên ngành CNTT, Đại học Kiến trúc Đà Nẵng; xem [đặc tả](../PHAM-VI-CNTT.md).

- Sinh Viên CNTT (USER): hỏi đáp, xem tài liệu, nguồn trích dẫn và hội thoại cá nhân.
- Giáo vụ khoa CNTT (CONTENT_ADMIN): có chức năng tra cứu và quản lý tài liệu.
- Quản Trị Viên (SYSTEM_ADMIN): có chức năng của giáo vụ và quản lý tài khoản, phân quyền.
- Cả ba chỉ đọc tài liệu CNTT và quy định chung áp dụng cho CNTT.
- Người vận hành CLI và Gemini API là tác nhân kỹ thuật.

[Mở sơ đồ use case HTML](tang-thu-use-case.html) · [Sequence diagram 3 lớp](so-tay-sequence-3-layer.html) · [SVG nghiệp vụ](tang-thu-use-case.svg) · [SVG kỹ thuật](tang-thu-use-case-operations.svg) · [PlantUML](tang-thu-use-case.puml)

| Mã | Chức năng | API / giới hạn | Nguồn |
|---|---|---|---|
| UC01 | Đăng nhập | POST /api/auth/login | [auth.route.ts](../../server/src/modules/auth/auth.route.ts) |
| UC02 | Đăng xuất | Thao tác frontend; không có API logout | [useAuth.ts](../../web/src/features/auth/useAuth.ts) |
| UC03 | Xem thông tin cá nhân | GET /api/auth/me; GET /api/departments | [auth.route.ts](../../server/src/modules/auth/auth.route.ts) |
| UC04 | Đổi mật khẩu | PUT /api/auth/password; có API, không khẳng định đã có màn hình | [auth.route.ts](../../server/src/modules/auth/auth.route.ts) |
| UC05 | Hỏi đáp học vụ | POST /api/chat; trả lời SSE, từ chối khi thiếu nguồn | [chat.service.ts](../../server/src/modules/chat/chat.service.ts) |
| UC06 | Xem lại hội thoại | GET /api/conversations; GET /api/conversations/:id | [chat.route.ts](../../server/src/modules/chat/chat.route.ts) |
| UC07 | Tra cứu kho tài liệu | GET /api/documents; GET /api/documents/:id | [documents.route.ts](../../server/src/modules/documents/documents.route.ts) |
| UC08 | Xem nguồn trích dẫn | GET /api/documents/:id/chunks; GET /api/documents/:id/file | [documents.route.ts](../../server/src/modules/documents/documents.route.ts) |
| UC09 | Theo dõi xử lý tài liệu | GET /api/documents/:id/status | [documents.route.ts](../../server/src/modules/documents/documents.route.ts) |
| UC10 | Tải lên tài liệu | POST /api/documents; tạo job xử lý nền | [documents.route.ts](../../server/src/modules/documents/documents.route.ts) |
| UC11 | Sửa thông tin tài liệu | PATCH /api/documents/:id | [documents.schema.ts](../../server/src/modules/documents/documents.schema.ts) |
| UC12 | Gỡ tài liệu | DELETE /api/documents/:id | [documents.route.ts](../../server/src/modules/documents/documents.route.ts) |
| UC13 | Chạy lại xử lý lỗi | POST /api/documents/:id/retry | [documents.route.ts](../../server/src/modules/documents/documents.route.ts) |
| UC14 | Tra cứu người dùng | GET /api/users | [admin.route.ts](../../server/src/modules/admin/admin.route.ts) |
| UC15 | Khóa / mở tài khoản | PATCH /api/users/:id; chỉ isActive, không xóa tài khoản | [admin.schema.ts](../../server/src/modules/admin/admin.schema.ts) |
| UC16 | Phân quyền tài khoản | POST /api/departments/:id/members; DELETE /api/departments/:id/members/:userId | [admin.route.ts](../../server/src/modules/admin/admin.route.ts) |
| UC18 | Tra cứu lai qua API | POST /api/search; vẫn áp dụng phạm vi người gọi | [retrieval.route.ts](../../server/src/modules/retrieval/retrieval.route.ts) |
| UC19 | Đánh giá truy hồi | pnpm --filter @tang-thu/server eval; chưa có API /eval/runs | [run-eval.ts](../../server/src/eval/run-eval.ts) |
| UC20 | Kiểm tra sức khỏe | GET /api/health; không yêu cầu đăng nhập | [routes.ts](../../server/src/routes.ts) |

Tạo tài khoản qua seed; chưa có POST /users. CLI đánh giá đã có, chưa có API /eval/runs. Quản trị nhiều khoa nằm ngoài phạm vi.

Sequence diagram 3 lớp dùng Archify, gom các use case theo ba nhóm chính: xác thực, hỏi đáp/tra cứu, quản trị/vận hành. Ba lớp chuẩn là Boundary/Presentation, Control/Business Logic và Entity/Data Access; Actor và Gemini API nằm ngoài ba lớp.

Tái tạo: `python docs/use-cases/build_diagrams.py`.

# Phân quyền — Sổ Tay Sinh Viên CNTT

**Bản 3 · 05/09/2026.** Thay thế mô hình hai vai và phân quyền nhiều khoa trong bản cũ. [Phạm vi hiện hành](PHAM-VI-CNTT.md).

| Chức năng | USER | CONTENT_ADMIN | SYSTEM_ADMIN |
|---|:---:|:---:|:---:|
| Đăng nhập/đăng xuất, đổi mật khẩu | ✓ | ✓ | ✓ |
| Hỏi đáp và xem hội thoại cá nhân | ✓ | ✓ | ✓ |
| Đọc tài liệu CNTT và quy định chung | ✓ | ✓ | ✓ |
| Xem trích dẫn, mở tệp gốc | ✓ | ✓ | ✓ |
| Upload/sửa/gỡ/retry tài liệu | — | ✓ | ✓ |
| Xem, khóa/mở tài khoản CNTT | — | — | ✓ |
| Phân quyền tài khoản CNTT | — | — | ✓ |
| Đọc/ghi tài liệu khoa khác | — | — | — |
| Tự khóa hoặc tự hạ vai quản trị | — | — | — |

USER là Sinh Viên CNTT. CONTENT_ADMIN là Giáo vụ khoa CNTT, quản lý kho nội dung của đồ án. SYSTEM_ADMIN là Quản Trị Viên, quản lý tài khoản và có mọi thao tác nội dung, nhưng không có thêm phạm vi tài liệu.

## Cơ chế

JWT chỉ mang danh tính. Backend mỗi request đọc tài khoản còn hoạt động và tư cách thành viên CNTT. Chỉ vai tại CNTT được tính, theo thứ tự SYSTEM_ADMIN > CONTENT_ADMIN > USER. Không có tư cách CNTT thì không được sử dụng ứng dụng.

`scopeWhere` và `scopeSql` tại `server/src/lib/scope.ts` giữ quy tắc đọc: visibility <= 1, tài liệu chung hoặc đúng CNTT. Lọc trước xếp hạng. Không có nhánh quản trị bỏ qua phạm vi. Dữ liệu cũ ngoài CNTT được bảo toàn nhưng không xuất hiện trong ứng dụng.

Quyền upload/sửa/gỡ/retry kiểm cả route và service. Chỉ chấp nhận đích CNTT hoặc quy định chung. Tệp gốc không phục vụ tĩnh.

API tài khoản yêu cầu SYSTEM_ADMIN, lọc người dùng CNTT; không cho CONTENT_ADMIN tự cấp quyền. Transaction thay vai/khóa tài khoản đọc lại quyền người gọi và tuần tự hóa để tránh hai quản trị thu hồi quyền nhau bằng quyền đã cũ. Cấm tự thu hồi quyền quản trị của chính mình.

## Provisioning và vận hành

Không tự đăng ký. Tạo tài khoản hiện qua seed/provisioning; chưa có API POST /users. Bộ đánh giá chạy CLI, không có quyền web giả định cho chức năng chưa hiện thực.

Migration đổi STUDENT → USER, ADMIN → CONTENT_ADMIN, thêm SYSTEM_ADMIN; người vận hành chủ động bootstrap quản trị đầu tiên. Xem hướng dẫn nâng cấp và tránh chạy seed trên DB thật trong [PHAM-VI-CNTT.md](PHAM-VI-CNTT.md).

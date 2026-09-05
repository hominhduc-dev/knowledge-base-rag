-- Giữ nguyên tài khoản, tài liệu, lịch sử và tư cách thành viên.
ALTER TYPE "member_role" RENAME VALUE 'STUDENT' TO 'USER';
ALTER TYPE "member_role" RENAME VALUE 'ADMIN' TO 'CONTENT_ADMIN';
ALTER TYPE "member_role" ADD VALUE 'SYSTEM_ADMIN';
-- Quyền ngoài CNTT không được ứng dụng sử dụng nữa.
-- Người vận hành chủ động chọn tài khoản SYSTEM_ADMIN bằng bootstrap-admin.ts.
-- Không suy đoán hoặc tự nâng quyền tài khoản hiện có trong migration.

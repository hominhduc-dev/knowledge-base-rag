-- Cho phep dang nhap bang ma so sinh vien HOAC email truong.
--
-- VIET TAY, khong dung `prisma migrate diff`. Da kiem chung: lenh diff sinh ra
-- them ba cau DROP INDEX xoa chunks_embedding_hnsw, chunks_tsv_gin va
-- embedding_cache_embedding_hnsw, vi Prisma khong biet ba chi muc do ton tai.
-- Ap dung ban sinh tu dong la mat chi muc vector ma khong ai nhan ra.

-- Ma so sinh vien voi VIEWER, ma can bo voi cac vai con lai.
-- Cho phep NULL vi khong phai ai cung duoc cap ma; Postgres cho nhieu NULL
-- trong cot UNIQUE nen dieu nay khong pha rang buoc duy nhat.
ALTER TABLE "users" ADD COLUMN "code" VARCHAR(20);

CREATE UNIQUE INDEX "users_code_key" ON "users"("code");

-- Chan hai tai khoan chi khac nhau chu hoa/chu thuong trong email.
-- Tang xac thuc van chuan hoa ve chu thuong truoc khi ghi; chi muc nay la lop
-- chan cuoi cung o tang du lieu.
CREATE UNIQUE INDEX "users_email_lower_key" ON "users" (lower("email"));

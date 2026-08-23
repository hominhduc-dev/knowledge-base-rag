-- ---------------------------------------------------------------------------
-- Tàng Thư — phần lược đồ Prisma KHÔNG sinh được, phải viết tay
--
-- VỊ TRÍ FILE: cố ý đặt ở prisma/migrations-sql/ chứ KHÔNG phải prisma/sql/.
-- Thư mục prisma/sql/ được TypedSQL chiếm dụng: `prisma generate --sql` sẽ cố
-- biên dịch mọi file .sql trong đó thành một hàm truy vấn có kiểu, và file DDL
-- này sẽ làm lệnh đó thất bại.
--
-- PHIÊN BẢN: giữ prisma ở 6.16.x. Bản 7.1.0 báo schema drift sai trên cột
-- Unsupported("vector") — https://github.com/prisma/prisma/issues/28867
--
-- QUY TRÌNH ÁP DỤNG (chạy trong apps/backend):
--
--   1. pnpm prisma migrate dev --create-only --name init
--        Prisma sinh ra file prisma/migrations/<timestamp>_init/migration.sql
--        nhưng CHƯA áp dụng.
--
--   2. Mở file vừa sinh, SỬA một dòng: tìm
--          "tsv" tsvector,
--        thay bằng
--          "tsv" tsvector GENERATED ALWAYS AS (to_tsvector('simple', "content")) STORED,
--        (không thể ALTER một cột thường thành cột sinh, nên phải sửa ngay
--         lúc tạo bảng)
--
--   3. Dán toàn bộ nội dung file này vào CUỐI file migration đó.
--
--   4. pnpm prisma migrate dev
--
-- Từ lần migration sau, chỉ cần lặp lại bước 1 và 4 — các câu lệnh dưới đây
-- đã nằm trong lịch sử migration, không chạy lại.
-- ---------------------------------------------------------------------------


-- ---------------------------------------------------------------------------
-- 1. EXTENSION
-- Với preview feature postgresqlExtensions, Prisma đã tự sinh câu lệnh này ở
-- đầu file migration. Trên Supabase, extension `vector` được cài sẵn ở schema
-- `extensions` nên câu lệnh là no-op. Kiểm tra trước khi migrate lần đầu:
--     SELECT extname, extnamespace::regnamespace FROM pg_extension;
-- ---------------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS vector;


-- ---------------------------------------------------------------------------
-- 2. RÀNG BUỘC PHẠM VI
--
-- Bảo đảm hai cột scope và department_id không bao giờ mâu thuẫn nhau. Thiếu
-- ràng buộc này, một tài liệu có thể vừa mang scope GLOBAL vừa gắn department
-- — khi đó câu truy vấn lọc phạm vi cho kết quả không xác định, và đó chính
-- là một lỗ hổng rò rỉ giữa các đơn vị.
-- ---------------------------------------------------------------------------

ALTER TABLE "documents"
  ADD CONSTRAINT "documents_scope_department_ck"
  CHECK (
    ("scope" = 'GLOBAL'::"DocumentScope"     AND "department_id" IS NULL)
    OR
    ("scope" = 'DEPARTMENT'::"DocumentScope" AND "department_id" IS NOT NULL)
  );

ALTER TABLE "chunks"
  ADD CONSTRAINT "chunks_scope_department_ck"
  CHECK (
    ("scope" = 'GLOBAL'::"DocumentScope"     AND "department_id" IS NULL)
    OR
    ("scope" = 'DEPARTMENT'::"DocumentScope" AND "department_id" IS NOT NULL)
  );

-- Tài liệu đã duyệt thì bắt buộc phải biết ai duyệt và duyệt lúc nào.
ALTER TABLE "documents"
  ADD CONSTRAINT "documents_approved_ck"
  CHECK (
    "approval_status" <> 'APPROVED'::"ApprovalStatus"
    OR ("approved_by" IS NOT NULL AND "approved_at" IS NOT NULL)
  );


-- ---------------------------------------------------------------------------
-- 3. CHỈ MỤC TOÀN VĂN
--
-- Dùng cấu hình 'simple' chứ không phải 'english': PostgreSQL không có từ điển
-- tiếng Việt, cấu hình 'english' sẽ cắt gốc từ sai và loại nhầm từ dừng.
-- 'simple' chỉ tách từ và hạ chữ thường — đúng thứ cần để bắt số hiệu văn bản
-- ("1234/QĐ-ĐHKT") và tên riêng, vốn là phần mà embedding hay trượt.
-- ---------------------------------------------------------------------------

CREATE INDEX "chunks_tsv_gin" ON "chunks" USING gin ("tsv");


-- ---------------------------------------------------------------------------
-- 4. CHỈ MỤC VECTOR
--
-- HNSW của pgvector chỉ hỗ trợ tối đa 2000 chiều — đó là lý do vector được hạ
-- xuống 1536 thay vì giữ 3072 mặc định của gemini-embedding-001.
--
-- Dùng vector_cosine_ops vì embed.ts đã chuẩn hóa L2 trước khi lưu (bản 1536
-- chiều KHÔNG được Gemini chuẩn hóa sẵn như bản 3072).
--
-- LƯU Ý HIỆU NĂNG: dựng chỉ mục HNSW trên bảng rỗng rồi chèn dần chậm hơn
-- nhiều so với nạp xong dữ liệu rồi mới dựng. Với tập 12–15 tài liệu của đồ án
-- thì khác biệt không đáng kể, nên vẫn tạo ngay ở migration cho gọn.
-- ---------------------------------------------------------------------------

CREATE INDEX "chunks_embedding_hnsw" ON "chunks"
  USING hnsw ("embedding" vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

CREATE INDEX "embedding_cache_embedding_hnsw" ON "embedding_cache"
  USING hnsw ("embedding" vector_cosine_ops);


-- ---------------------------------------------------------------------------
-- 5. KIỂM TRA SAU KHI MIGRATE
--
-- Chạy các câu dưới đây một lần để xác nhận migration đã áp dụng đúng.
-- Không nằm trong file migration — chỉ chạy tay.
-- ---------------------------------------------------------------------------

-- Cột tsv phải là cột sinh (attgenerated = 's')
--   SELECT attname, attgenerated FROM pg_attribute
--   WHERE attrelid = 'chunks'::regclass AND attname = 'tsv';

-- Ba chỉ mục phải tồn tại
--   SELECT indexname FROM pg_indexes
--   WHERE tablename IN ('chunks','embedding_cache')
--   ORDER BY indexname;

-- Ràng buộc CHECK phải chặn được dữ liệu sai — câu này PHẢI báo lỗi:
--   INSERT INTO "documents" (id, title, scope, department_id, storage_path,
--                            mime_type, file_size, content_hash, uploaded_by)
--   VALUES (gen_random_uuid(), 'Sai phạm vi', 'GLOBAL',
--           (SELECT id FROM departments LIMIT 1), 'x', 'application/pdf', 1,
--           repeat('a', 64), (SELECT id FROM users LIMIT 1));

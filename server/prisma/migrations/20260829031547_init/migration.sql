-- ---------------------------------------------------------------------------
-- Migration khoi tao. Phan Prisma sinh ra duoc giu nguyen; bon khoi danh dau
-- "VIET TAY" o cuoi file la thu Prisma khong dien dat duoc trong schema.prisma.
--
-- Chay `pnpm db:check` sau moi lan migrate de xac nhan ca bon con nguyen.
-- ---------------------------------------------------------------------------

-- VIET TAY: extension `vector` phai ton tai truoc bang `chunk_embeddings`,
-- vi bang do khai bao cot kieu vector(1536).
CREATE EXTENSION IF NOT EXISTS vector;

-- CreateEnum
CREATE TYPE "member_role" AS ENUM ('STUDENT', 'ADMIN');

-- CreateEnum
CREATE TYPE "dept_type" AS ENUM ('FACULTY', 'OFFICE');

-- CreateEnum
CREATE TYPE "doc_status" AS ENUM ('PENDING', 'PROCESSING', 'READY', 'FAILED');

-- CreateEnum
CREATE TYPE "job_status" AS ENUM ('PENDING', 'PROCESSING', 'DONE', 'FAILED');

-- CreateEnum
CREATE TYPE "message_role" AS ENUM ('USER', 'ASSISTANT');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "code" VARCHAR(20),
    "password_hash" VARCHAR(255) NOT NULL,
    "full_name" VARCHAR(200) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departments" (
    "id" UUID NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "type" "dept_type" NOT NULL,
    "parent_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "department_members" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "department_id" UUID NOT NULL,
    "role" "member_role" NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "department_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" UUID NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "department_id" UUID,
    "visibility" SMALLINT NOT NULL DEFAULT 1,
    "source_type" VARCHAR(10) NOT NULL,
    "file_path" VARCHAR(500) NOT NULL,
    "file_hash" CHAR(64) NOT NULL,
    "page_count" INTEGER,
    "status" "doc_status" NOT NULL DEFAULT 'PENDING',
    "error_message" TEXT,
    "uploaded_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chunks" (
    "id" UUID NOT NULL,
    "document_id" UUID NOT NULL,
    "chunk_index" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "content_hash" CHAR(64) NOT NULL,
    "heading_path" TEXT,
    "page_from" INTEGER,
    "page_to" INTEGER,
    "token_count" INTEGER NOT NULL,
    "department_id" UUID,
    "visibility" SMALLINT NOT NULL,
    -- VIET TAY: cot sinh tu dong. Postgres tu cap nhat moi khi `content` doi,
    -- nen khong the quen dong bo. Cau hinh 'simple' chu khong phai 'english':
    -- bo stemmer tieng Anh lam hong tu tieng Viet.
    "content_tsv" tsvector GENERATED ALWAYS AS (to_tsvector('simple', "content")) STORED,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chunks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chunk_embeddings" (
    "id" BIGSERIAL NOT NULL,
    "chunk_id" UUID NOT NULL,
    "embedding" vector(1536) NOT NULL,
    "model" VARCHAR(64) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chunk_embeddings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ingest_jobs" (
    "id" UUID NOT NULL,
    "document_id" UUID NOT NULL,
    "status" "job_status" NOT NULL DEFAULT 'PENDING',
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "started_at" TIMESTAMPTZ(6),
    "finished_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ingest_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "title" VARCHAR(300) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "role" "message_role" NOT NULL,
    "content" TEXT NOT NULL,
    "latency_ms" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_citations" (
    "id" UUID NOT NULL,
    "message_id" UUID NOT NULL,
    "chunk_id" UUID,
    "document_id" UUID,
    "rank" INTEGER NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "quote" TEXT NOT NULL,
    "heading_path" TEXT,
    "page" INTEGER,

    CONSTRAINT "message_citations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eval_sets" (
    "id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "eval_sets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eval_questions" (
    "id" UUID NOT NULL,
    "eval_set_id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "question" TEXT NOT NULL,
    "asker_department_id" UUID,
    "note" TEXT,

    CONSTRAINT "eval_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eval_gold_chunks" (
    "id" UUID NOT NULL,
    "question_id" UUID NOT NULL,
    "chunk_id" UUID NOT NULL,

    CONSTRAINT "eval_gold_chunks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eval_runs" (
    "id" UUID NOT NULL,
    "eval_set_id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "config" JSONB NOT NULL,
    "recall_at_5" DOUBLE PRECISION,
    "recall_at_10" DOUBLE PRECISION,
    "mrr" DOUBLE PRECISION,
    "faithfulness" DOUBLE PRECISION,
    "avg_latency_ms" INTEGER,
    "note" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "eval_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eval_results" (
    "id" UUID NOT NULL,
    "eval_run_id" UUID NOT NULL,
    "question_id" UUID NOT NULL,
    "hit" BOOLEAN NOT NULL,
    "rank_of_first_hit" INTEGER,
    "latency_ms" INTEGER,
    "vector_hits" INTEGER,
    "keyword_hits" INTEGER,

    CONSTRAINT "eval_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_code_key" ON "users"("code");

-- CreateIndex
CREATE UNIQUE INDEX "departments_code_key" ON "departments"("code");

-- CreateIndex
CREATE INDEX "department_members_user_id_idx" ON "department_members"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "department_members_user_id_department_id_key" ON "department_members"("user_id", "department_id");

-- CreateIndex
CREATE UNIQUE INDEX "documents_file_hash_key" ON "documents"("file_hash");

-- CreateIndex
CREATE INDEX "documents_department_id_visibility_status_idx" ON "documents"("department_id", "visibility", "status");

-- CreateIndex
CREATE INDEX "documents_status_idx" ON "documents"("status");

-- CreateIndex
CREATE INDEX "chunks_department_id_visibility_idx" ON "chunks"("department_id", "visibility");

-- CreateIndex
CREATE INDEX "chunks_content_hash_idx" ON "chunks"("content_hash");

-- CreateIndex
CREATE UNIQUE INDEX "chunks_document_id_chunk_index_key" ON "chunks"("document_id", "chunk_index");

-- CreateIndex
CREATE UNIQUE INDEX "chunk_embeddings_chunk_id_model_key" ON "chunk_embeddings"("chunk_id", "model");

-- CreateIndex
CREATE INDEX "ingest_jobs_status_created_at_idx" ON "ingest_jobs"("status", "created_at");

-- CreateIndex
CREATE INDEX "ingest_jobs_document_id_idx" ON "ingest_jobs"("document_id");

-- CreateIndex
CREATE INDEX "conversations_user_id_updated_at_idx" ON "conversations"("user_id", "updated_at" DESC);

-- CreateIndex
CREATE INDEX "messages_conversation_id_created_at_idx" ON "messages"("conversation_id", "created_at");

-- CreateIndex
CREATE INDEX "message_citations_message_id_rank_idx" ON "message_citations"("message_id", "rank");

-- CreateIndex
CREATE UNIQUE INDEX "eval_sets_name_key" ON "eval_sets"("name");

-- CreateIndex
CREATE UNIQUE INDEX "eval_questions_eval_set_id_code_key" ON "eval_questions"("eval_set_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "eval_gold_chunks_question_id_chunk_id_key" ON "eval_gold_chunks"("question_id", "chunk_id");

-- CreateIndex
CREATE UNIQUE INDEX "eval_results_eval_run_id_question_id_key" ON "eval_results"("eval_run_id", "question_id");

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "department_members" ADD CONSTRAINT "department_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "department_members" ADD CONSTRAINT "department_members_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chunks" ADD CONSTRAINT "chunks_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chunks" ADD CONSTRAINT "chunks_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chunk_embeddings" ADD CONSTRAINT "chunk_embeddings_chunk_id_fkey" FOREIGN KEY ("chunk_id") REFERENCES "chunks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ingest_jobs" ADD CONSTRAINT "ingest_jobs_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_citations" ADD CONSTRAINT "message_citations_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_citations" ADD CONSTRAINT "message_citations_chunk_id_fkey" FOREIGN KEY ("chunk_id") REFERENCES "chunks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_citations" ADD CONSTRAINT "message_citations_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eval_questions" ADD CONSTRAINT "eval_questions_eval_set_id_fkey" FOREIGN KEY ("eval_set_id") REFERENCES "eval_sets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eval_gold_chunks" ADD CONSTRAINT "eval_gold_chunks_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "eval_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eval_gold_chunks" ADD CONSTRAINT "eval_gold_chunks_chunk_id_fkey" FOREIGN KEY ("chunk_id") REFERENCES "chunks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eval_runs" ADD CONSTRAINT "eval_runs_eval_set_id_fkey" FOREIGN KEY ("eval_set_id") REFERENCES "eval_sets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eval_results" ADD CONSTRAINT "eval_results_eval_run_id_fkey" FOREIGN KEY ("eval_run_id") REFERENCES "eval_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eval_results" ADD CONSTRAINT "eval_results_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "eval_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- ===========================================================================
-- VIET TAY — Prisma khong sinh duoc bon khoi duoi day
-- ===========================================================================

-- (1) Chi muc HNSW cho tim kiem vector.
--     m=16, ef_construction=64: o quy mo 50.000 doan cho recall ~0,95 so voi
--     quet vet can, do tre duoi 40 ms voi vector 1536 chieu.
--     Can maintenance_work_mem >= 512MB, neu khong se tran ra dia va rat cham.
CREATE INDEX "chunk_embeddings_embedding_hnsw"
  ON "chunk_embeddings"
  USING hnsw ("embedding" vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- (2) Chi muc GIN cho tim kiem toan van — nhanh tu khoa cua tim kiem lai.
CREATE INDEX "chunks_content_tsv_gin"
  ON "chunks"
  USING gin ("content_tsv");

-- (3) Chan hai tai khoan chi khac nhau hoa/thuong o email.
--     Rang buoc UNIQUE thuong cua Prisma coi 'A@x.vn' va 'a@x.vn' la hai gia tri.
CREATE UNIQUE INDEX "users_email_lower_key" ON "users" (lower("email"));

-- (4) Dong bo pham vi tu documents xuong chunks.
--
--     Hai cot `department_id` va `visibility` duoc LAP xuong bang chunks de loc
--     duoc TRUOC khi xep hang (xem ghi chu trong schema.prisma). Cai gia la
--     chung co the lech nhau. Trigger nay tra cai gia do, thay vi trong cho
--     lap trinh vien nho cap nhat ca hai noi trong cung mot transaction.
--
--     Neu de lech: mot tai lieu chuyen khoa nhung cac doan van cua no van mang
--     khoa cu, tuc la sinh vien khoa cu VAN DOC DUOC noi dung da chuyen di —
--     ro ri pham vi, im lang, khong bao loi.
CREATE OR REPLACE FUNCTION sync_chunk_scope() RETURNS trigger AS $$
BEGIN
  IF NEW."department_id" IS DISTINCT FROM OLD."department_id"
     OR NEW."visibility" IS DISTINCT FROM OLD."visibility" THEN
    UPDATE "chunks"
       SET "department_id" = NEW."department_id",
           "visibility"    = NEW."visibility"
     WHERE "document_id"   = NEW."id";
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "documents_sync_chunk_scope"
  AFTER UPDATE ON "documents"
  FOR EACH ROW
  EXECUTE FUNCTION sync_chunk_scope();

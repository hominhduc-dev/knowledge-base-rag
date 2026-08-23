-- CreateEnum
CREATE TYPE "Role" AS ENUM ('VIEWER', 'CONTRIBUTOR', 'EDITOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "DepartmentType" AS ENUM ('KHOA', 'PHONG_BAN');

-- CreateEnum
CREATE TYPE "DocumentScope" AS ENUM ('GLOBAL', 'DEPARTMENT');

-- CreateEnum
CREATE TYPE "ProcessingStatus" AS ENUM ('PENDING', 'PROCESSING', 'READY', 'FAILED');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PROPOSED', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "JobType" AS ENUM ('PARSE', 'CHUNK', 'EMBED');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('QUEUED', 'RUNNING', 'DONE', 'FAILED');

-- CreateEnum
CREATE TYPE "MessageRole" AS ENUM ('USER', 'ASSISTANT');

-- CreateEnum
CREATE TYPE "ChunkStrategy" AS ENUM ('FIXED', 'STRUCTURED');

-- CreateTable
CREATE TABLE "departments" (
    "id" UUID NOT NULL ,
    "code" VARCHAR(20) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "type" "DepartmentType" NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "full_name" VARCHAR(200) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'VIEWER',
    "department_id" UUID NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" UUID NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "doc_number" VARCHAR(100),
    "issued_date" DATE,
    "scope" "DocumentScope" NOT NULL,
    "department_id" UUID,
    "storage_path" VARCHAR(500) NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "file_size" INTEGER NOT NULL,
    "page_count" INTEGER,
    "content_hash" CHAR(64) NOT NULL,
    "processing_status" "ProcessingStatus" NOT NULL DEFAULT 'PENDING',
    "approval_status" "ApprovalStatus" NOT NULL DEFAULT 'PROPOSED',
    "reject_reason" TEXT,
    "uploaded_by" UUID NOT NULL,
    "approved_by" UUID,
    "approved_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chunks" (
    "id" UUID NOT NULL,
    "document_id" UUID NOT NULL,
    "department_id" UUID,
    "scope" "DocumentScope" NOT NULL,
    "chunk_index" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "token_count" INTEGER NOT NULL,
    "page" INTEGER,
    "article_ref" VARCHAR(100),
    "content_hash" CHAR(64) NOT NULL,
    "embedding" vector(1536),
    "tsv" tsvector GENERATED ALWAYS AS (to_tsvector('simple', "content")) STORED,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chunks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "embedding_cache" (
    "content_hash" CHAR(64) NOT NULL,
    "model" VARCHAR(100) NOT NULL,
    "dim" INTEGER NOT NULL,
    "embedding" vector(1536) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "embedding_cache_pkey" PRIMARY KEY ("content_hash")
);

-- CreateTable
CREATE TABLE "jobs" (
    "id" UUID NOT NULL,
    "type" "JobType" NOT NULL,
    "document_id" UUID NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'QUEUED',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "scheduled_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "started_at" TIMESTAMPTZ(6),
    "finished_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
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
    "role" "MessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "latency_ms" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "citations" (
    "id" UUID NOT NULL,
    "message_id" UUID NOT NULL,
    "chunk_id" UUID,
    "document_id" UUID,
    "page" INTEGER,
    "quote" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "citations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eval_runs" (
    "id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "chunk_strategy" "ChunkStrategy" NOT NULL,
    "chunk_size" INTEGER NOT NULL,
    "chunk_overlap" INTEGER NOT NULL,
    "top_k" INTEGER NOT NULL,
    "embedding_dim" INTEGER NOT NULL,
    "total_question" INTEGER NOT NULL,
    "recall_at_5" DOUBLE PRECISION,
    "recall_at_10" DOUBLE PRECISION,
    "mrr" DOUBLE PRECISION,
    "note" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "eval_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eval_results" (
    "id" UUID NOT NULL,
    "eval_run_id" UUID NOT NULL,
    "question_code" VARCHAR(50) NOT NULL,
    "expected_document_id" UUID,
    "hit" BOOLEAN NOT NULL,
    "rank_of_first_hit" INTEGER,

    CONSTRAINT "eval_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "departments_code_key" ON "departments"("code");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_department_id_role_idx" ON "users"("department_id", "role");

-- CreateIndex
CREATE UNIQUE INDEX "documents_content_hash_key" ON "documents"("content_hash");

-- CreateIndex
CREATE INDEX "documents_department_id_scope_approval_status_idx" ON "documents"("department_id", "scope", "approval_status");

-- CreateIndex
CREATE INDEX "documents_processing_status_idx" ON "documents"("processing_status");

-- CreateIndex
CREATE INDEX "chunks_scope_department_id_idx" ON "chunks"("scope", "department_id");

-- CreateIndex
CREATE INDEX "chunks_content_hash_idx" ON "chunks"("content_hash");

-- CreateIndex
CREATE UNIQUE INDEX "chunks_document_id_chunk_index_key" ON "chunks"("document_id", "chunk_index");

-- CreateIndex
CREATE INDEX "jobs_status_scheduled_at_idx" ON "jobs"("status", "scheduled_at");

-- CreateIndex
CREATE INDEX "jobs_document_id_idx" ON "jobs"("document_id");

-- CreateIndex
CREATE INDEX "conversations_user_id_updated_at_idx" ON "conversations"("user_id", "updated_at" DESC);

-- CreateIndex
CREATE INDEX "messages_conversation_id_created_at_idx" ON "messages"("conversation_id", "created_at");

-- CreateIndex
CREATE INDEX "citations_message_id_rank_idx" ON "citations"("message_id", "rank");

-- CreateIndex
CREATE UNIQUE INDEX "eval_results_eval_run_id_question_code_key" ON "eval_results"("eval_run_id", "question_code");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chunks" ADD CONSTRAINT "chunks_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chunks" ADD CONSTRAINT "chunks_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "citations" ADD CONSTRAINT "citations_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "citations" ADD CONSTRAINT "citations_chunk_id_fkey" FOREIGN KEY ("chunk_id") REFERENCES "chunks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "citations" ADD CONSTRAINT "citations_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eval_results" ADD CONSTRAINT "eval_results_eval_run_id_fkey" FOREIGN KEY ("eval_run_id") REFERENCES "eval_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- ===========================================================================
-- PHAN VIET TAY: Prisma khong sinh duoc
-- Nguon: prisma/migrations-sql/01_vector_fulltext.sql
-- ===========================================================================

CREATE EXTENSION IF NOT EXISTS vector;

-- Rang buoc pham vi: scope va department_id khong duoc mau thuan nhau.
-- Thieu rang buoc nay, mot ban ghi vua GLOBAL vua gan department se lam cau
-- truy van loc pham vi cho ket qua khong xac dinh, tuc mot lo hong ro ri.
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

-- Tai lieu da duyet thi bat buoc biet ai duyet va duyet luc nao.
ALTER TABLE "documents"
  ADD CONSTRAINT "documents_approved_ck"
  CHECK (
    "approval_status" <> 'APPROVED'::"ApprovalStatus"
    OR ("approved_by" IS NOT NULL AND "approved_at" IS NOT NULL)
  );

-- Chi muc toan van. Dung cau hinh simple vi PostgreSQL khong co tu dien
-- tieng Viet; english se cat goc tu sai va loai nham tu dung.
CREATE INDEX "chunks_tsv_gin" ON "chunks" USING gin ("tsv");

-- Chi muc vector. HNSW cua pgvector chi ho tro toi da 2000 chieu, do la ly do
-- vector duoc ha xuong 1536 thay vi giu 3072 mac dinh cua Gemini.
-- Dung vector_cosine_ops vi embed.ts da chuan hoa L2 truoc khi luu.
CREATE INDEX "chunks_embedding_hnsw" ON "chunks"
  USING hnsw ("embedding" vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

CREATE INDEX "embedding_cache_embedding_hnsw" ON "embedding_cache"
  USING hnsw ("embedding" vector_cosine_ops);

// ---------------------------------------------------------------------------
// SQL truy hồi lai — vector + toàn văn, có lọc phạm vi TRƯỚC khi xếp hạng.
//
// File này là nơi duy nhất của module retrieval được phép đụng tới
// `chunk_embeddings`. Điều kiện `e.model = MODEL_HIEN_TAI` là bắt buộc: bảng cố
// ý giữ nhiều vector cho cùng một chunk để so sánh model, nên JOIN thiếu model
// sẽ nhân đôi kết quả mà không báo lỗi.
// ---------------------------------------------------------------------------
import { Prisma } from "@prisma/client";
import { env } from "../../config/env.js";
import { prisma } from "../../config/prisma.js";
import { scopeSql } from "../../lib/scope.js";
import { MODEL_HIEN_TAI, toVectorLiteral } from "../../rag/embed.js";
import type { AuthenticatedUser } from "../../types/express.js";

// RRF hợp nhất theo thứ hạng thay vì cộng trực tiếp cosine với ts_rank. Hai thang
// điểm đó không cùng phân phối; cộng tuyến tính làm vector lấn át các từ khóa
// đặc thù như "Công nghệ Thông tin" trong câu hỏi tự nhiên.
const RRF_K = 60;
const CANDIDATE_LIMIT = 80;

export type RetrievalRow = {
  chunk_id: string;
  document_id: string;
  doc: string;
  unit: string;
  content: string;
  heading_path: string | null;
  page_from: number | null;
  vec_score: number;
  keyword_score: number;
  score: number;
};

export async function truyHoiLai(
  user: AuthenticatedUser,
  query: string,
  queryVector: number[],
  topK: number,
): Promise<RetrievalRow[]> {
  const vectorLiteral = toVectorLiteral(queryVector);

  // `plainto_tsquery` nối các từ bằng AND. Với câu hỏi tự nhiên tiếng Việt, cách
  // đó thường quá hẹp, nên đổi sang OR như test cách ly phạm vi đã chứng minh.
  const tsquery = Prisma.sql`replace(plainto_tsquery('simple', ${query})::text, '&', '|')::tsquery`;

  return prisma.$queryRaw<RetrievalRow[]>`
    WITH scoped AS (
      SELECT
        c."id" AS chunk_id,
        c."document_id",
        d."title" AS doc,
        COALESCE(dep."name", 'Toàn trường') AS unit,
        c."content",
        c."heading_path",
        c."page_from",
        (1 - (e."embedding" <=> ${vectorLiteral}::vector))::float8 AS vec_score,
        ts_rank(c."content_tsv", ${tsquery}, 32)::float8 AS keyword_score
      FROM "chunks" c
      JOIN "documents" d ON d."id" = c."document_id"
      LEFT JOIN "departments" dep ON dep."id" = c."department_id"
      JOIN "chunk_embeddings" e
        ON e."chunk_id" = c."id"
       AND e."model" = ${MODEL_HIEN_TAI}
      WHERE ${scopeSql(user, "c")}
        AND d."status" = 'READY'
    ),
    eligible AS (
      SELECT *
      FROM scoped
      WHERE vec_score > ${env.RETRIEVAL_MIN_SCORE}
         OR keyword_score > 0
    ),
    vector_ranked AS (
      SELECT
        chunk_id,
        row_number() OVER (ORDER BY vec_score DESC, chunk_id) AS vec_rank
      FROM eligible
      ORDER BY vec_score DESC, chunk_id
      LIMIT ${CANDIDATE_LIMIT}
    ),
    keyword_ranked AS (
      SELECT
        chunk_id,
        row_number() OVER (ORDER BY keyword_score DESC, vec_score DESC, chunk_id) AS keyword_rank
      FROM eligible
      WHERE keyword_score > 0
      ORDER BY keyword_score DESC, vec_score DESC, chunk_id
      LIMIT ${CANDIDATE_LIMIT}
    ),
    scored AS (
      SELECT
        e.*,
        (${env.RETRIEVAL_ALPHA} * (1.0 / (${RRF_K} + COALESCE(v.vec_rank, ${CANDIDATE_LIMIT + 1})))
          + (1 - ${env.RETRIEVAL_ALPHA}) * COALESCE(1.0 / (${RRF_K} + k.keyword_rank), 0))::float8 AS score
      FROM eligible e
      LEFT JOIN vector_ranked v ON v.chunk_id = e.chunk_id
      LEFT JOIN keyword_ranked k ON k.chunk_id = e.chunk_id
      WHERE v.chunk_id IS NOT NULL
         OR k.chunk_id IS NOT NULL
    )
    SELECT *
    FROM scored
    ORDER BY score DESC
    LIMIT ${topK}
  `;
}

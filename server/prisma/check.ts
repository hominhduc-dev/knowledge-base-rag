// ---------------------------------------------------------------------------
// Kiểm chứng lược đồ sau khi migrate.
//
// Chạy:  corepack pnpm --filter @tang-thu/server run db:check
//
// Vì sao cần file này: bốn thứ quan trọng nhất của lược đồ — chỉ mục HNSW, chỉ
// mục GIN, cột sinh tự động và trigger đồng bộ phạm vi — đều nằm NGOÀI tầm hiểu
// của Prisma. Chúng được viết tay trong migration, nên `prisma migrate` không
// biết chúng tồn tại và một lần `migrate dev` sau này có thể lặng lẽ bỏ chúng đi.
//
// Mất chỉ mục vector KHÔNG gây lỗi nào: truy vấn vẫn chạy đúng, chỉ chậm dần
// theo số lượng dữ liệu. Đó là kiểu hỏng tệ nhất — không ai phát hiện cho tới
// khi quá muộn. File này biến nó thành một lỗi ồn ào.
// ---------------------------------------------------------------------------
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

let dat = 0;
let truot = 0;

async function kiem(ten: string, chay: () => Promise<boolean>): Promise<void> {
  try {
    const ok = await chay();
    if (ok) {
      dat++;
      console.log(`  ✓ ${ten}`);
    } else {
      truot++;
      console.log(`  ✗ ${ten}`);
    }
  } catch (error) {
    truot++;
    console.log(`  ✗ ${ten} — ${(error as Error).message.split("\n")[0]}`);
  }
}

const BANG_MONG_DOI = [
  "users",
  "departments",
  "department_members",
  "documents",
  "chunks",
  "chunk_embeddings",
  "ingest_jobs",
  "conversations",
  "messages",
  "message_citations",
  "eval_sets",
  "eval_questions",
  "eval_gold_chunks",
  "eval_runs",
  "eval_results",
];

async function main(): Promise<void> {
  console.log("\nKiểm chứng lược đồ Sổ Tay Sinh Viên CNTT\n");

  // --- 1. Bảng --------------------------------------------------------------
  console.log("1. Bảng");
  const bang = await prisma.$queryRaw<{ table_name: string }[]>`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  `;
  const coBang = new Set(bang.map((b) => b.table_name));
  for (const ten of BANG_MONG_DOI) {
    await kiem(`bảng ${ten}`, async () => coBang.has(ten));
  }

  // --- 2. Extension ---------------------------------------------------------
  console.log("\n2. Extension");
  await kiem("extension `vector` đã cài", async () => {
    const r = await prisma.$queryRaw<{ n: bigint }[]>`
      SELECT count(*) AS n FROM pg_extension WHERE extname = 'vector'
    `;
    return Number(r[0]?.n ?? 0) === 1;
  });

  // --- 3. Bốn phần viết tay -------------------------------------------------
  console.log("\n3. Phần viết tay — Prisma không biết những thứ này tồn tại");

  await kiem("cột chunks.content_tsv là GENERATED ALWAYS", async () => {
    const r = await prisma.$queryRaw<{ is_generated: string }[]>`
      SELECT is_generated FROM information_schema.columns
      WHERE table_name = 'chunks' AND column_name = 'content_tsv'
    `;
    return r[0]?.is_generated === "ALWAYS";
  });

  await kiem("chỉ mục HNSW chunk_embeddings_embedding_hnsw", async () => {
    const r = await prisma.$queryRaw<{ indexdef: string }[]>`
      SELECT indexdef FROM pg_indexes
      WHERE indexname = 'chunk_embeddings_embedding_hnsw'
    `;
    return (r[0]?.indexdef ?? "").includes("hnsw");
  });

  await kiem("chỉ mục GIN chunks_content_tsv_gin", async () => {
    const r = await prisma.$queryRaw<{ indexdef: string }[]>`
      SELECT indexdef FROM pg_indexes WHERE indexname = 'chunks_content_tsv_gin'
    `;
    return (r[0]?.indexdef ?? "").includes("gin");
  });

  await kiem("chỉ mục duy nhất trên lower(email)", async () => {
    const r = await prisma.$queryRaw<{ indexdef: string }[]>`
      SELECT indexdef FROM pg_indexes WHERE indexname = 'users_email_lower_key'
    `;
    return (r[0]?.indexdef ?? "").toLowerCase().includes("lower");
  });

  await kiem("trigger documents_sync_chunk_scope", async () => {
    const r = await prisma.$queryRaw<{ n: bigint }[]>`
      SELECT count(*) AS n FROM pg_trigger
      WHERE tgname = 'documents_sync_chunk_scope' AND NOT tgisinternal
    `;
    return Number(r[0]?.n ?? 0) === 1;
  });

  // --- 4. Toán tử vector ----------------------------------------------------
  console.log("\n4. Toán tử");
  await kiem("toán tử khoảng cách cosine `<=>` chạy được", async () => {
    const r = await prisma.$queryRaw<{ d: number }[]>`
      SELECT ('[1,0,0]'::vector <=> '[0,1,0]'::vector) AS d
    `;
    return Math.abs((r[0]?.d ?? 0) - 1) < 1e-9;
  });

  await kiem("cột embedding đúng 1536 chiều", async () => {
    const r = await prisma.$queryRaw<{ atttypmod: number }[]>`
      SELECT a.atttypmod FROM pg_attribute a
      JOIN pg_class c ON c.oid = a.attrelid
      WHERE c.relname = 'chunk_embeddings' AND a.attname = 'embedding'
    `;
    // pgvector cất số chiều thẳng trong atttypmod, không cộng thêm bù trừ nào.
    return r[0]?.atttypmod === 1536;
  });

  // --- 5. Ràng buộc thực sự chặn --------------------------------------------
  console.log("\n5. Ràng buộc — kiểm bằng cách CỐ TÌNH ghi sai");

  await kiem("chèn vector sai số chiều bị từ chối", async () => {
    try {
      await prisma.$executeRaw`
        INSERT INTO chunk_embeddings (chunk_id, embedding, model)
        VALUES (gen_random_uuid(), '[1,2,3]'::vector, 'test')
      `;
      return false; // lọt qua là ràng buộc hỏng
    } catch {
      return true;
    }
  });

  await kiem("cấu hình maintenance_work_mem đủ để dựng HNSW", async () => {
    const r = await prisma.$queryRaw<{ setting: string }[]>`
      SELECT setting FROM pg_settings WHERE name = 'maintenance_work_mem'
    `;
    // pg_settings trả về đơn vị kB. 512 MB = 524288 kB.
    const kb = Number(r[0]?.setting ?? 0);
    if (kb < 262144) {
      console.log(
        `      cảnh báo: ${Math.round(kb / 1024)} MB — dựng chỉ mục HNSW sẽ tràn ra đĩa`,
      );
      return false;
    }
    return true;
  });

  // --- 6. Vector nhúng ------------------------------------------------------
  console.log("\n6. Vector nhúng");
  const theoModel = await prisma.$queryRaw<{ model: string; n: bigint; chuan: number }[]>`
    SELECT "model", count(*) AS n, MIN(vector_norm("embedding"))::float8 AS chuan
    FROM "chunk_embeddings" GROUP BY "model" ORDER BY "model"
  `;

  if (theoModel.length === 0) {
    console.log("  – chưa có vector nào (chạy `pnpm db:embed`)");
  } else {
    for (const m of theoModel) {
      await kiem(`${m.model}: ${m.n} vector, chuẩn L2 = 1`, async () => Math.abs(m.chuan - 1) < 1e-5);
    }
  }

  // Nhiều model trong bảng là ĐÚNG THIẾT KẾ, nhưng nó biến mọi truy vấn quên lọc
  // `model` thành truy vấn trả mỗi đoạn nhiều lần. Nhắc to, vì lỗi này không báo.
  if (theoModel.length > 1) {
    console.log(
      `      ⚠ Có ${theoModel.length} model trong bảng. Mọi truy vấn JOIN vào\n` +
        "        chunk_embeddings PHẢI có điều kiện `e.model = ...`, nếu không\n" +
        "        mỗi đoạn sẽ trả về một lần cho mỗi model.",
    );
  }

  // --- Tổng kết -------------------------------------------------------------
  const tong = dat + truot;
  console.log(`\n${"─".repeat(56)}`);
  console.log(`Kết quả: ${dat}/${tong} đạt`);
  if (truot > 0) {
    console.log(
      "\nCó mục không đạt. Nếu vừa chạy `prisma migrate dev`, rất có thể nó đã\n" +
        "xóa mất phần viết tay — xem lại file migration mới nhất.",
    );
    process.exitCode = 1;
  }
  console.log();
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

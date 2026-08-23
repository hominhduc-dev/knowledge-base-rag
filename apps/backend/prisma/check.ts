/**
 * Kiểm chứng migration đã áp dụng đúng.
 * Chạy: pnpm --filter @tang-thu/backend db:check
 *
 * Ba thứ Prisma không tự tạo được nên phải kiểm bằng tay: cột sinh tự động,
 * chỉ mục HNSW/GIN, và ràng buộc CHECK chống mâu thuẫn phạm vi.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type Row = Record<string, unknown>;

async function main() {
  const ok = (c: boolean) => (c ? "ĐẠT " : "HỎNG");
  let failed = 0;
  const check = (label: string, pass: boolean, detail = "") => {
    if (!pass) failed++;
    console.log(`  [${ok(pass)}] ${label}${detail ? " — " + detail : ""}`);
  };

  console.log("\n1. Bảng");
  const tables = await prisma.$queryRaw<Row[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename NOT LIKE '_prisma%'
    ORDER BY tablename`;
  const names = tables.map((t) => String(t.tablename));
  check(`Có 11 bảng`, names.length === 11, names.join(", "));

  console.log("\n2. Cột tsv là cột sinh tự động");
  const tsv = await prisma.$queryRaw<Row[]>`
    SELECT attgenerated FROM pg_attribute
    WHERE attrelid = 'chunks'::regclass AND attname = 'tsv'`;
  check("chunks.tsv GENERATED ALWAYS", tsv[0]?.attgenerated === "s");

  console.log("\n3. Chỉ mục");
  const idx = await prisma.$queryRaw<Row[]>`
    SELECT indexname, indexdef FROM pg_indexes
    WHERE tablename IN ('chunks', 'embedding_cache')`;
  const defs = idx.map((i) => String(i.indexdef));
  check("chunks_embedding_hnsw dùng HNSW", defs.some((d) => d.includes("hnsw") && d.includes("chunks_embedding")));
  check("chunks_tsv_gin dùng GIN", defs.some((d) => d.includes("gin") && d.includes("tsv")));
  check("chỉ mục lọc phạm vi (scope, department_id)", defs.some((d) => d.includes("scope") && d.includes("department_id")));

  console.log("\n4. Ràng buộc CHECK");
  const cks = await prisma.$queryRaw<Row[]>`
    SELECT conname FROM pg_constraint
    WHERE contype = 'c' AND conrelid IN ('chunks'::regclass, 'documents'::regclass)`;
  const ckNames = cks.map((c) => String(c.conname));
  check("documents_scope_department_ck", ckNames.includes("documents_scope_department_ck"));
  check("chunks_scope_department_ck", ckNames.includes("chunks_scope_department_ck"));
  check("documents_approved_ck", ckNames.includes("documents_approved_ck"));

  console.log("\n5. Ràng buộc phạm vi chặn được dữ liệu sai");
  try {
    await prisma.$executeRaw`
      INSERT INTO chunks (id, document_id, department_id, scope, chunk_index,
                          content, token_count, content_hash)
      VALUES (gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
              'GLOBAL', 0, 'test', 1, repeat('a', 64))`;
    check("GLOBAL kèm department_id bị từ chối", false, "CSDL đã CHẤP NHẬN dữ liệu sai");
  } catch (e) {
    const msg = String(e);
    const byCheck = msg.includes("chunks_scope_department_ck");
    check("GLOBAL kèm department_id bị từ chối", byCheck, byCheck ? "" : "bị chặn nhưng do lỗi khác");
  }

  console.log("\n6. Đăng nhập bằng mã hoặc email");
  const uidx = await prisma.$queryRaw<Row[]>`
    SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'users'`;
  const udefs = uidx.map((i) => String(i.indexdef));
  check("users.code là cột duy nhất", udefs.some((d) => d.includes("users_code_key")));
  check("email duy nhất không phân biệt hoa thường", udefs.some((d) => d.includes("lower")));
  const dup = await prisma.$queryRaw<Row[]>`
    SELECT count(*)::int AS n FROM users WHERE code IS NULL`;
  check("mọi tài khoản đều có mã", Number(dup[0]?.n) === 0, `${dup[0]?.n} tài khoản chưa có mã`);

  console.log("\n7. Toán tử vector hoạt động");
  const dist = await prisma.$queryRaw<Row[]>`
    SELECT ('[1,0,0]'::vector <=> '[0,1,0]'::vector) AS d`;
  check("pgvector <=> chạy được", Number(dist[0]?.d) === 1);

  console.log(failed === 0 ? "\nTất cả kiểm tra đều đạt.\n" : `\n${failed} kiểm tra HỎNG.\n`);
  process.exitCode = failed === 0 ? 0 : 1;
}

main().finally(() => prisma.$disconnect());

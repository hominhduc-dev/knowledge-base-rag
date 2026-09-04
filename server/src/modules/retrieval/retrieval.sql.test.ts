// ---------------------------------------------------------------------------
// Kiểm thử truy vấn lai thật.
//
// Test này không gọi Gemini: nó dùng một vector đã có sẵn trong CSDL. Nếu máy
// chưa chạy `db:embed`, test được bỏ qua để bộ test thường ngày không phụ thuộc
// API bên ngoài.
// ---------------------------------------------------------------------------
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { MemberRole, PrismaClient } from "@prisma/client";
import { MODEL_HIEN_TAI } from "../../rag/embed.js";
import type { AuthenticatedUser } from "../../types/express.js";
import { truyHoiLai } from "./retrieval.sql.js";

const prisma = new PrismaClient();

type VectorRow = { embedding: string } | undefined;

function parseVector(text: string): number[] {
  return text
    .slice(1, -1)
    .split(",")
    .map((x) => Number(x));
}

async function adminUser(): Promise<AuthenticatedUser> {
  const department = await prisma.department.findUniqueOrThrow({
    where: { code: "PDT" },
    select: { id: true, code: true, name: true },
  });

  return {
    id: "00000000-0000-4000-8000-000000000000",
    code: null,
    email: "test-admin@dau.edu.vn",
    fullName: "Người dùng thử ADMIN",
    role: MemberRole.ADMIN,
    departments: [{ ...department, role: MemberRole.ADMIN }],
    departmentIds: [department.id],
  };
}

describe("truyHoiLai", () => {
  before(async () => {
    const soDoan = await prisma.chunk.count();
    assert.ok(soDoan > 0, "cơ sở dữ liệu chưa có đoạn văn nào — chạy `pnpm db:seed` trước");
  });

  after(async () => {
    await prisma.$disconnect();
  });

  it("lọc embedding theo model hiện tại để không trả trùng chunk", async (t) => {
    const [row] = await prisma.$queryRaw<VectorRow[]>`
      SELECT "embedding"::text AS embedding
      FROM "chunk_embeddings"
      WHERE "model" = ${MODEL_HIEN_TAI}
      LIMIT 1
    `;

    if (!row) {
      t.skip(`chưa có vector cho ${MODEL_HIEN_TAI} — chạy \`pnpm db:embed\` để kiểm đường này`);
      return;
    }

    const rows = await truyHoiLai(
      await adminUser(),
      "điều kiện nhận đồ án tốt nghiệp tín chỉ",
      parseVector(row.embedding),
      20,
    );

    const chunkIds = rows.map((r) => r.chunk_id);
    assert.equal(new Set(chunkIds).size, chunkIds.length, "truy hồi trả trùng chunk_id");
  });
});

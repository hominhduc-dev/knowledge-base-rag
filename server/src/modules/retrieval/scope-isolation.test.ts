// ---------------------------------------------------------------------------
// KIỂM THỬ CÁCH LY PHẠM VI — mốc sống còn của Sprint 3.
//
// Chạy:  corepack pnpm --filter @tang-thu/server run test
// Yêu cầu: Postgres đang chạy (`docker compose up -d db`) và đã seed.
//
// Đây là bộ kiểm thử được đặt làm ĐIỀU KIỆN CHẶN MERGE. Rủi ro rò rỉ phạm vi là
// rủi ro nghiêm trọng nhất của sản phẩm: nó im lặng, không gây lỗi, và chỉ lộ ra
// khi có người thấy tài liệu không thuộc về mình.
//
// Cặp đối chứng trong dữ liệu mồi được dựng riêng cho bộ này:
//
//   88/QĐ-CNTT  (Khoa CNTT)      → nhận đồ án khi tích lũy 105 tín chỉ
//   77/QĐ-KTR   (Khoa Kiến trúc) → nhận đồ án khi tích lũy  90 tín chỉ
//
// Cùng chủ đề, KHÁC CON SỐ. Sinh viên CNTT nhận được con số 90 tức là đã rò rỉ —
// con số khác nhau khiến lỗi lộ ra ngay, không cần đọc kỹ nội dung.
//
// Điểm mấu chốt: bộ này khẳng định KHÔNG CÓ ĐOẠN VĂN NÀO của khoa khác lọt vào
// tập kết quả, chứ không chỉ kiểm câu trả lời cuối cùng. Câu trả lời có thể vô
// tình đúng trong khi truy hồi đã rò rỉ.
// ---------------------------------------------------------------------------
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { MemberRole, Prisma, PrismaClient } from "@prisma/client";
import { scopeSql } from "../../lib/scope.js";
import type { AuthenticatedUser } from "../../types/express.js";

const prisma = new PrismaClient();

type ChunkRow = { id: string; content: string; department_id: string | null };

/**
 * Truy vấn tìm kiếm toàn văn có lọc phạm vi.
 *
 * Đây là bản rút gọn của nhánh từ khóa trong truy vấn lai ở mục 4.1 tài liệu
 * thiết kế. Nhánh vector chưa dùng được vì 13 đoạn mồi chưa có vector nhúng
 * (chờ khóa Gemini), nhưng ĐIỀU KIỆN LỌC PHẠM VI thì giống hệt — và đó chính là
 * thứ bộ kiểm thử này nhắm tới.
 */
async function timKiem(user: AuthenticatedUser, cauHoi: string): Promise<ChunkRow[]> {
  // `plainto_tsquery` nối MỌI từ bằng AND, nên với câu hỏi tự nhiên nó gần như
  // luôn trả rỗng. Đổi '&' thành '|' để thành OR — đã kiểm chứng là cần thiết.
  const tsquery = Prisma.sql`replace(plainto_tsquery('simple', ${cauHoi})::text, '&', '|')::tsquery`;

  return prisma.$queryRaw<ChunkRow[]>`
    SELECT c."id", c."content", c."department_id"
    FROM "chunks" c
    WHERE ${scopeSql(user, "c")}
      AND c."content_tsv" @@ ${tsquery}
    ORDER BY ts_rank(c."content_tsv", ${tsquery}) DESC
    LIMIT 20
  `;
}

/** Dựng một người dùng giả từ mã đơn vị đã seed. */
async function nguoiDung(
  deptCode: string | null,
  role: MemberRole,
): Promise<AuthenticatedUser> {
  const departments = deptCode
    ? [
        await prisma.department
          .findUniqueOrThrow({ where: { code: deptCode }, select: { id: true, code: true, name: true } })
          .then((d) => ({ ...d, role })),
      ]
    : [];

  return {
    id: "00000000-0000-4000-8000-000000000000",
    code: null,
    email: `test-${deptCode ?? "admin"}@dau.edu.vn`,
    fullName: `Người dùng thử ${deptCode ?? "ADMIN"}`,
    role,
    departments,
    departmentIds: departments.map((d) => d.id),
  };
}

describe("Cách ly phạm vi giữa các đơn vị", () => {
  let svCNTT: AuthenticatedUser;
  let svKTR: AuthenticatedUser;
  let admin: AuthenticatedUser;
  let idCNTT: string;
  let idKTR: string;

  before(async () => {
    svCNTT = await nguoiDung("CNTT", MemberRole.STUDENT);
    svKTR = await nguoiDung("KTR", MemberRole.STUDENT);
    admin = await nguoiDung("PDT", MemberRole.ADMIN);
    idCNTT = svCNTT.departmentIds[0]!;
    idKTR = svKTR.departmentIds[0]!;

    // Nếu chưa seed thì mọi khẳng định bên dưới sẽ "đạt" một cách vô nghĩa vì
    // tập rỗng thỏa mãn mọi điều kiện phủ định. Chặn trường hợp đó ngay.
    const soDoan = await prisma.chunk.count();
    assert.ok(soDoan > 0, "cơ sở dữ liệu chưa có đoạn văn nào — chạy `pnpm db:seed` trước");
  });

  after(async () => {
    await prisma.$disconnect();
  });

  // --- Trường hợp 1: quan trọng nhất và dễ bỏ sót nhất ----------------------
  it("sinh viên CNTT hỏi về đồ án — KHÔNG đoạn nào của Kiến trúc lọt vào", async () => {
    const ketQua = await timKiem(svCNTT, "điều kiện nhận đồ án tốt nghiệp tín chỉ");

    const roRi = ketQua.filter((r) => r.department_id === idKTR);
    assert.equal(roRi.length, 0, `rò rỉ ${roRi.length} đoạn của Khoa Kiến trúc`);

    // Và khẳng định theo NỘI DUNG, không chỉ theo khóa ngoại — phòng trường hợp
    // cột department_id bị lệch với tài liệu gốc.
    const noiDung = ketQua.map((r) => r.content).join(" ");
    assert.ok(!noiDung.includes("90 tín chỉ"), "thấy con số của Khoa Kiến trúc");
    assert.ok(noiDung.includes("105 tín chỉ"), "phải thấy con số của chính khoa mình");
  });

  // --- Trường hợp 2: chiều ngược lại ----------------------------------------
  // Chỉ kiểm một chiều thì bộ kiểm thử có thể xanh trong khi vẫn rò rỉ chiều kia.
  it("sinh viên Kiến trúc hỏi đúng câu đó — KHÔNG đoạn nào của CNTT lọt vào", async () => {
    const ketQua = await timKiem(svKTR, "điều kiện nhận đồ án tốt nghiệp tín chỉ");

    const roRi = ketQua.filter((r) => r.department_id === idCNTT);
    assert.equal(roRi.length, 0, `rò rỉ ${roRi.length} đoạn của Khoa CNTT`);

    const noiDung = ketQua.map((r) => r.content).join(" ");
    assert.ok(!noiDung.includes("105 tín chỉ"), "thấy con số của Khoa CNTT");
    assert.ok(noiDung.includes("90 tín chỉ"), "phải thấy con số của chính khoa mình");
  });

  // --- Trường hợp 3: tài liệu toàn trường ai cũng đọc được ------------------
  it("hai sinh viên khác khoa cùng nhận được quy chế toàn trường", async () => {
    const cauHoi = "điều kiện xét công nhận tốt nghiệp";
    const a = await timKiem(svCNTT, cauHoi);
    const b = await timKiem(svKTR, cauHoi);

    const toanTruongA = a.filter((r) => r.department_id === null).map((r) => r.id).sort();
    const toanTruongB = b.filter((r) => r.department_id === null).map((r) => r.id).sort();

    assert.ok(toanTruongA.length > 0, "không tìm thấy đoạn toàn trường nào");
    assert.deepEqual(toanTruongA, toanTruongB, "hai khoa phải nhận cùng bộ đoạn toàn trường");
  });

  // --- Trường hợp 4: ADMIN thấy tất cả --------------------------------------
  it("ADMIN thấy được đoạn của cả hai khoa", async () => {
    const ketQua = await timKiem(admin, "điều kiện nhận đồ án tốt nghiệp tín chỉ");
    const noiDung = ketQua.map((r) => r.content).join(" ");

    assert.ok(noiDung.includes("105 tín chỉ"), "ADMIN phải thấy tài liệu CNTT");
    assert.ok(noiDung.includes("90 tín chỉ"), "ADMIN phải thấy tài liệu Kiến trúc");
  });

  // --- Trường hợp 5: bộ lọc nằm trong SQL, không phải ở tầng ứng dụng -------
  it("truy vấn KHÔNG lọc trả về nhiều hơn — chứng minh bộ lọc thật sự có tác dụng", async () => {
    // Nếu `scopeSql` vô tình trả TRUE cho sinh viên thì bốn test trên vẫn có thể
    // xanh khi dữ liệu thưa. Phép so sánh này bắt đúng trường hợp đó.
    const coLoc = await timKiem(svCNTT, "điều kiện nhận đồ án tốt nghiệp tín chỉ");
    const khongLoc = await prisma.$queryRaw<{ n: bigint }[]>`
      SELECT count(*) AS n
      FROM "chunks" c
      WHERE c."content_tsv" @@ replace(
        plainto_tsquery('simple', ${"điều kiện nhận đồ án tốt nghiệp tín chỉ"})::text, '&', '|')::tsquery
    `;

    const soKhongLoc = Number(khongLoc[0]?.n ?? 0);
    assert.ok(
      soKhongLoc > coLoc.length,
      `bộ lọc phạm vi không loại được gì (${soKhongLoc} so với ${coLoc.length}) — ` +
        "hoặc dữ liệu mồi thiếu cặp đối chứng, hoặc scopeSql đang trả TRUE",
    );
  });

  // --- Trường hợp 6: người chưa được gán đơn vị -----------------------------
  it("người chưa gán đơn vị chỉ đọc được tài liệu toàn trường", async () => {
    const treo: AuthenticatedUser = {
      ...svCNTT,
      departments: [],
      departmentIds: [],
    };
    const ketQua = await timKiem(treo, "điều kiện tốt nghiệp đồ án tín chỉ");

    const cuaKhoa = ketQua.filter((r) => r.department_id !== null);
    assert.equal(cuaKhoa.length, 0, "không được thấy tài liệu của bất kỳ khoa nào");
  });
});

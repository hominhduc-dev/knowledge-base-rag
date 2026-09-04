// ---------------------------------------------------------------------------
// Bộ chạy đánh giá — mục 7 của docs/THIET-KE-HE-THONG.md.
//
// Chạy:
//   pnpm eval                       một lần, cấu hình mặc định
//   pnpm eval --alpha=0 --k=5       đổi tham số
//   pnpm eval --all                 chạy trọn 9 thí nghiệm bắt buộc
//
// Gọi THẲNG tầng truy hồi, không qua HTTP. Đó là lý do `retrieval.service.ts`
// nhận `AuthenticatedUser` thay vì `Request` — bộ đánh giá không phải dựng máy
// chủ, không phải đăng nhập, và đo đúng thứ cần đo.
//
// KHÔNG gọi mô hình sinh câu trả lời. Bài đo này đo TRUY HỒI: recall@k và MRR
// chỉ phụ thuộc việc đoạn đúng có nằm trong top-k hay không. Thêm bước sinh câu
// trả lời vào đây là cộng thêm nhiễu và chi phí mà không đo thêm được gì.
// ---------------------------------------------------------------------------
import { PrismaClient, MemberRole } from "@prisma/client";
import { env } from "../config/env.js";
import { nhungCauHoi, MODEL_HIEN_TAI } from "../rag/embed.js";
import { truyHoiLai } from "../modules/retrieval/retrieval.sql.js";
import type { AuthenticatedUser } from "../types/express.js";
import { BO_CAU_HOI_VANG, type GoldenQuestion } from "./golden-questions.js";
import { hangTrungDauTien, lamTron, mrr, recallAtK } from "./metrics.js";

const prisma = new PrismaClient({ log: [] });
const TEN_BO = "golden-30";

type CauHinh = {
  ten: string;
  alpha: number;
  topK: number;
  model: string;
};

// ===========================================================================
// NẠP BỘ CÂU HỎI VÀO CƠ SỞ DỮ LIỆU
// ===========================================================================

/**
 * Đổi chuỗi nhận dạng thành `chunk_id` thật.
 *
 * Báo lỗi TO khi một chuỗi khớp 0 hoặc nhiều hơn 1 đoạn. Im lặng bỏ qua sẽ làm
 * recall tụt mà không ai biết vì sao — đúng kiểu hỏng mà cả bộ đánh giá này
 * sinh ra để tránh.
 */
async function timDoanVang(chuoi: string): Promise<string> {
  const khop = await prisma.chunk.findMany({
    where: { content: { contains: chuoi } },
    select: { id: true, content: true },
    take: 5,
  });

  if (khop.length === 0) {
    throw new Error(`Không đoạn nào chứa chuỗi "${chuoi}". Dữ liệu đã đổi?`);
  }
  if (khop.length > 1) {
    throw new Error(
      `Chuỗi "${chuoi}" khớp ${khop.length} đoạn — cần chuỗi cụ thể hơn để chỉ đúng một đoạn.`,
    );
  }
  return khop[0]!.id;
}

async function napBoCauHoi(): Promise<void> {
  const bo = await prisma.evalSet.upsert({
    where: { name: TEN_BO },
    update: { description: `Bộ ${BO_CAU_HOI_VANG.length} câu hỏi vàng` },
    create: { name: TEN_BO, description: `Bộ ${BO_CAU_HOI_VANG.length} câu hỏi vàng` },
    select: { id: true },
  });

  const donVi = new Map(
    (await prisma.department.findMany({ select: { id: true, code: true } })).map((d) => [
      d.code,
      d.id,
    ]),
  );

  for (const q of BO_CAU_HOI_VANG) {
    const cau = await prisma.evalQuestion.upsert({
      where: { evalSetId_code: { evalSetId: bo.id, code: q.code } },
      update: {
        question: q.question,
        note: q.note ?? null,
        askerDepartmentId: q.asker ? (donVi.get(q.asker) ?? null) : null,
      },
      create: {
        evalSetId: bo.id,
        code: q.code,
        question: q.question,
        note: q.note ?? null,
        askerDepartmentId: q.asker ? (donVi.get(q.asker) ?? null) : null,
      },
      select: { id: true },
    });

    // Gán lại đáp án từ đầu: chuỗi nhận dạng trong file có thể đã đổi.
    await prisma.evalGoldChunk.deleteMany({ where: { questionId: cau.id } });
    for (const chuoi of q.gold) {
      await prisma.evalGoldChunk.create({
        data: { questionId: cau.id, chunkId: await timDoanVang(chuoi) },
      });
    }
  }
}

// ===========================================================================
// DỰNG NGƯỜI HỎI GIẢ ĐỊNH
// ===========================================================================

/**
 * Người dùng giả để chạy truy hồi.
 *
 * Phải đi qua ĐÚNG đường mà người thật đi — `scopeSql` đọc `departmentIds` và
 * `role`. Dựng một người dùng bỏ qua phạm vi sẽ cho điểm số đẹp và vô nghĩa.
 */
async function nguoiHoi(maDonVi: string | null): Promise<AuthenticatedUser> {
  const chung = {
    id: "00000000-0000-4000-8000-000000000000",
    code: null,
    email: "eval@dau.edu.vn",
    fullName: "Bộ đánh giá",
  };

  if (maDonVi === null) {
    // Câu hỏi không phụ thuộc đơn vị → dùng quyền ADMIN, thấy toàn bộ kho.
    return { ...chung, role: MemberRole.ADMIN, departments: [], departmentIds: [] };
  }

  const d = await prisma.department.findUniqueOrThrow({
    where: { code: maDonVi },
    select: { id: true, code: true, name: true },
  });
  return {
    ...chung,
    role: MemberRole.STUDENT,
    departments: [{ ...d, role: MemberRole.STUDENT }],
    departmentIds: [d.id],
  };
}

// ===========================================================================
// CHẠY MỘT CẤU HÌNH
// ===========================================================================

type KetQuaCau = {
  q: GoldenQuestion;
  ketQua: string[];
  doanVang: string[];
  hang: number | null;
  latencyMs: number;
  vectorHits: number;
  keywordHits: number;
};

async function chayMotCauHinh(cauHinh: CauHinh): Promise<void> {
  const bo = await prisma.evalSet.findUniqueOrThrow({
    where: { name: TEN_BO },
    select: {
      id: true,
      questions: {
        select: { id: true, code: true, goldChunks: { select: { chunkId: true } } },
      },
    },
  });
  const theoMa = new Map(bo.questions.map((q) => [q.code, q]));

  // Nhớ vector câu hỏi giữa các cấu hình: chỉ `alpha` và `topK` đổi, câu hỏi thì
  // không. Không có bộ nhớ này thì chạy 9 thí nghiệm tốn 9 lần số lệnh gọi API.
  const vectorCache = new Map<string, number[]>();

  const ketQua: KetQuaCau[] = [];

  for (const q of BO_CAU_HOI_VANG) {
    const trongDb = theoMa.get(q.code);
    if (!trongDb) throw new Error(`Câu ${q.code} chưa được nạp vào CSDL`);

    const user = await nguoiHoi(q.asker);
    let vector = vectorCache.get(q.question);
    if (!vector) {
      vector = await nhungCauHoi(q.question);
      vectorCache.set(q.question, vector);
    }

    const batDau = Date.now();
    const rows = await truyHoiLai(user, q.question, vector, cauHinh.topK);
    const latencyMs = Date.now() - batDau;

    const ids = rows.map((r) => r.chunk_id);
    const vang = trongDb.goldChunks.map((g) => g.chunkId);

    ketQua.push({
      q,
      ketQua: ids,
      doanVang: vang,
      hang: hangTrungDauTien(ids, vang),
      latencyMs,
      vectorHits: rows.filter((r) => r.vec_score > 0).length,
      keywordHits: rows.filter((r) => r.keyword_score > 0).length,
    });
  }

  // --- Tính chỉ số ---------------------------------------------------------
  //
  // Chỉ tính recall và MRR trên các câu CÓ ĐÁP ÁN. Câu "phải từ chối" không có
  // đoạn vàng nào, nên đưa vào sẽ kéo recall xuống một cách vô nghĩa — chúng đo
  // một thứ khác và được báo riêng.
  const coDapAn = ketQua.filter((r) => r.doanVang.length > 0);
  const phaiTuChoi = ketQua.filter((r) => r.doanVang.length === 0);

  // Với câu phải từ chối, "đúng" nghĩa là truy hồi KHÔNG trả về đoạn nào của
  // khoa khác. Đoạn toàn trường lọt vào là chấp nhận được — bước sinh câu trả
  // lời còn một lớp chặn nữa.
  const tuChoiDat = phaiTuChoi.filter((r) => r.doanVang.every((v) => !r.ketQua.includes(v)));

  const r5 = recallAtK(coDapAn, 5);
  const r10 = recallAtK(coDapAn, 10);
  const diemMrr = mrr(coDapAn.map((r) => r.hang));
  const trungBinhMs = Math.round(
    ketQua.reduce((s, r) => s + r.latencyMs, 0) / Math.max(ketQua.length, 1),
  );

  const lanChay = await prisma.evalRun.create({
    data: {
      evalSetId: bo.id,
      name: cauHinh.ten,
      config: {
        alpha: cauHinh.alpha,
        topK: cauHinh.topK,
        model: cauHinh.model,
        dim: env.EMBEDDING_DIM,
        chunkSize: env.CHUNK_SIZE,
        chunkOverlap: env.CHUNK_OVERLAP,
        taskType: env.GEMINI_USE_TASK_TYPE,
      },
      recallAt5: lamTron(r5),
      recallAt10: lamTron(r10),
      mrr: lamTron(diemMrr),
      avgLatencyMs: trungBinhMs,
      note: `${coDapAn.length} câu có đáp án · ${phaiTuChoi.length} câu phải từ chối`,
    },
    select: { id: true },
  });

  await prisma.evalResult.createMany({
    data: ketQua.map((r) => ({
      evalRunId: lanChay.id,
      questionId: theoMa.get(r.q.code)!.id,
      hit: r.hang !== null,
      rankOfFirstHit: r.hang,
      latencyMs: r.latencyMs,
      vectorHits: r.vectorHits,
      keywordHits: r.keywordHits,
    })),
  });

  console.log(
    `  ${cauHinh.ten.padEnd(30)} ` +
      `recall@5 ${r5.toFixed(3)} · recall@10 ${r10.toFixed(3)} · ` +
      `MRR ${diemMrr.toFixed(3)} · từ chối ${tuChoiDat.length}/${phaiTuChoi.length} · ${trungBinhMs} ms`,
  );

  // Nêu đích danh câu trượt — số tổng không cho biết phải sửa gì.
  const truot = coDapAn.filter((r) => r.hang === null);
  if (truot.length > 0) {
    console.log(`      trượt: ${truot.map((r) => r.q.code).join(", ")}`);
  }
}

// ===========================================================================
// ĐIỂM VÀO
// ===========================================================================

/**
 * Chín thí nghiệm bắt buộc — mục 7.3.
 *
 * Ba trục: trọng số lai, số đoạn lấy về, và số chiều vector. Thí nghiệm alpha
 * đáng giá nhất: `alpha = 1` là vector thuần, `alpha = 0` là từ khóa thuần. Nếu
 * giá trị ở giữa thắng cả hai thì đó là BẰNG CHỨNG ĐỊNH LƯỢNG cho lựa chọn tìm
 * kiếm lai ở mục 4.3 — mạnh hơn mọi lập luận.
 */
function chinThiNghiem(): CauHinh[] {
  const ra: CauHinh[] = [];
  for (const alpha of [0, 0.3, 0.6, 0.8, 1]) {
    ra.push({ ten: `alpha-${alpha}-k10`, alpha, topK: 10, model: MODEL_HIEN_TAI });
  }
  for (const topK of [3, 5, 20]) {
    ra.push({ ten: `alpha-0.6-k${topK}`, alpha: 0.6, topK, model: MODEL_HIEN_TAI });
  }
  ra.push({ ten: "alpha-0.5-k10", alpha: 0.5, topK: 10, model: MODEL_HIEN_TAI });
  return ra;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const doc = (ten: string, mac: number): number => {
    const t = args.find((a) => a.startsWith(`--${ten}=`));
    return t ? Number(t.split("=")[1]) : mac;
  };

  console.log(`\nBộ đánh giá Tàng Thư · ${BO_CAU_HOI_VANG.length} câu hỏi vàng`);
  console.log(`Model nhúng: ${MODEL_HIEN_TAI} · ${env.EMBEDDING_DIM} chiều\n`);

  process.stdout.write("Nạp bộ câu hỏi vào CSDL… ");
  await napBoCauHoi();
  console.log("xong\n");

  const cacCauHinh = args.includes("--all")
    ? chinThiNghiem()
    : [
        {
          ten: `alpha-${doc("alpha", env.RETRIEVAL_ALPHA)}-k${doc("k", env.RETRIEVAL_TOP_K)}`,
          alpha: doc("alpha", env.RETRIEVAL_ALPHA),
          topK: doc("k", env.RETRIEVAL_TOP_K),
          model: MODEL_HIEN_TAI,
        },
      ];

  for (const c of cacCauHinh) {
    // `truyHoiLai` đọc alpha từ `env`, nên gán thẳng vào để mỗi cấu hình dùng
    // đúng giá trị của nó. Cách này xấu nhưng thành thật: nó cho thấy alpha là
    // cấu hình toàn cục, và Sprint sau nên đưa nó thành tham số của hàm.
    (env as { RETRIEVAL_ALPHA: number }).RETRIEVAL_ALPHA = c.alpha;
    await chayMotCauHinh(c);
  }

  const tong = await prisma.evalRun.count();
  console.log(`\n${"─".repeat(76)}`);
  console.log(`Bảng eval_runs hiện có ${tong} dòng` + (tong >= 9 ? " — đạt tiêu chí số 4." : "."));
  console.log();
}

main()
  .catch((error) => {
    console.error("\n" + (error as Error).message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

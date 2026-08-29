// ---------------------------------------------------------------------------
// Worker nạp tài liệu — mục 6 của docs/THIET-KE-HE-THONG.md.
//
// Hàng đợi nằm trong Postgres, KHÔNG dùng Redis. Thông lượng thấp hơn rõ rệt,
// nhưng khối lượng thật là vài chục tài liệu mỗi học kỳ, và đổi lại: bớt một
// container, bớt một công nghệ cả nhóm phải học, trạng thái job nằm cùng
// transaction với dữ liệu nghiệp vụ.
//
// VÌ SAO CHẠY TRONG CÙNG TIẾN TRÌNH VỚI API — và khi nào phải tách.
//
// Node dùng một luồng cho vòng lặp sự kiện. Chờ mạng và chờ đĩa không chiếm
// luồng, nhưng TÍNH TOÁN NẶNG thì chiếm: trong lúc `unpdf` giải mã một PDF lớn,
// mọi request đang chờ đều đứng im. Với vài chục tài liệu mỗi học kỳ thì chấp
// nhận được. Khi tài liệu vào liên tục, tách file này thành tiến trình riêng —
// mã đã sẵn sàng vì nó không import gì từ tầng HTTP.
//
// Đây chính là ví dụ thực tế của đánh đổi "hướng sự kiện" nêu trong netlab.
// ---------------------------------------------------------------------------
import { prisma } from "../config/prisma.js";
import { env } from "../config/env.js";
import { logger } from "../lib/logger.js";
import { catDoan, MAC_DINH } from "../rag/chunk.js";
import { docTaiLieu, ParseError } from "../modules/documents/documents.parser.js";
import { docTep } from "../modules/documents/documents.storage.js";
import { createHash } from "node:crypto";

const SO_LAN_THU_TOI_DA = 3;
/** Job `PROCESSING` quá lâu coi như worker đã chết giữa chừng. */
const QUA_HAN_MS = 10 * 60 * 1000;

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

type JobRow = { id: string; document_id: string; retry_count: number };

/**
 * Lấy MỘT job và đánh dấu đang xử lý, nguyên tử.
 *
 * `FOR UPDATE SKIP LOCKED` là mấu chốt: hai worker chạy song song sẽ nhận hai
 * job khác nhau thay vì tranh nhau một job hoặc xếp hàng chờ khóa. Thiếu
 * `SKIP LOCKED` thì worker thứ hai đứng chờ worker thứ nhất xong — mất hết ý
 * nghĩa của việc chạy song song.
 *
 * Toàn bộ nằm trong MỘT câu lệnh nên không có khe hở giữa lúc chọn và lúc đánh dấu.
 */
async function nhanViec(): Promise<JobRow | null> {
  const rows = await prisma.$queryRaw<JobRow[]>`
    UPDATE "ingest_jobs"
    SET "status" = 'PROCESSING', "started_at" = now()
    WHERE "id" = (
      SELECT "id" FROM "ingest_jobs"
      WHERE "status" = 'PENDING' AND "retry_count" < ${SO_LAN_THU_TOI_DA}
      ORDER BY "created_at"
      FOR UPDATE SKIP LOCKED
      LIMIT 1
    )
    RETURNING "id", "document_id", "retry_count"
  `;
  return rows[0] ?? null;
}

/**
 * Đưa các job treo về hàng đợi.
 *
 * Worker bị giết giữa chừng để lại job ở `PROCESSING` mãi mãi — không ai nhặt,
 * và tài liệu kẹt ở `processing` trên giao diện. Không có bước này thì mỗi lần
 * khởi động lại máy chủ lúc đang xử lý là mất một tài liệu.
 */
async function thuHoiJobTreo(): Promise<number> {
  const nguong = new Date(Date.now() - QUA_HAN_MS);
  const { count } = await prisma.ingestJob.updateMany({
    where: { status: "PROCESSING", startedAt: { lt: nguong } },
    data: { status: "PENDING", retryCount: { increment: 1 } },
  });
  if (count > 0) logger.warn(`Thu hồi ${count} job treo quá ${QUA_HAN_MS / 60000} phút`);
  return count;
}

/** Trích văn bản → cắt đoạn → ghi vào CSDL. */
async function xuLy(job: JobRow): Promise<void> {
  const doc = await prisma.document.findUnique({
    where: { id: job.document_id },
    select: { id: true, title: true, filePath: true, sourceType: true, departmentId: true, visibility: true },
  });
  if (!doc) throw new Error(`Tài liệu ${job.document_id} không còn tồn tại`);

  await prisma.document.update({ where: { id: doc.id }, data: { status: "PROCESSING" } });

  const buffer = await docTep(doc.filePath);
  const { pages, pageCount } = await docTaiLieu(buffer, doc.sourceType);

  const doan = catDoan(pages, {
    maxTokens: env.CHUNK_SIZE,
    overlapTokens: env.CHUNK_OVERLAP,
  });

  if (doan.length === 0) {
    throw new ParseError("Trích được văn bản nhưng không cắt ra đoạn nào.");
  }

  // Ghi TẤT CẢ trong một transaction. Ghi một phần rồi lỗi sẽ để lại tài liệu
  // `ready` với nửa số đoạn — truy hồi vẫn chạy, chỉ là thiếu dữ liệu một cách
  // im lặng. Đó là kiểu hỏng tệ nhất.
  await prisma.$transaction(async (tx) => {
    // Lần chạy lại phải dọn đoạn cũ trước, nếu không `UNIQUE(document_id,
    // chunk_index)` sẽ chặn.
    await tx.chunk.deleteMany({ where: { documentId: doc.id } });

    await tx.chunk.createMany({
      data: doan.map((c, i) => ({
        documentId: doc.id,
        chunkIndex: i,
        content: c.content,
        contentHash: sha256(c.content),
        headingPath: c.headingPath,
        pageFrom: c.pageFrom,
        pageTo: c.pageTo,
        tokenCount: c.tokenCount,
        // LẶP từ documents — cho phép lọc phạm vi TRƯỚC khi xếp hạng.
        departmentId: doc.departmentId,
        visibility: doc.visibility,
      })),
    });

    await tx.document.update({
      where: { id: doc.id },
      data: { status: "READY", pageCount, errorMessage: null },
    });

    await tx.ingestJob.update({
      where: { id: job.id },
      data: { status: "DONE", finishedAt: new Date() },
    });
  });

  logger.info(`Đã xử lý "${doc.title}" — ${doan.length} đoạn, ${pageCount} trang`);

  // TODO Sprint 2: sinh vector nhúng cho các đoạn vừa tạo (cần GEMINI_API_KEY).
  // Tới lúc đó, tài liệu chỉ tìm được bằng nhánh TỪ KHÓA của truy vấn lai —
  // cột `content_tsv` đã tự sinh nên nhánh đó chạy được ngay từ bây giờ.
}

async function ghiNhanThatBai(job: JobRow, error: unknown): Promise<void> {
  const message = error instanceof Error ? error.message : String(error);
  const soLan = job.retry_count + 1;
  // Lỗi định dạng thì thử lại bao nhiêu lần cũng vô ích — tệp sẽ không tự sửa.
  const hetCach = error instanceof ParseError || soLan >= SO_LAN_THU_TOI_DA;

  await prisma.$transaction(async (tx) => {
    await tx.ingestJob.update({
      where: { id: job.id },
      data: {
        status: hetCach ? "FAILED" : "PENDING",
        retryCount: soLan,
        lastError: message.slice(0, 2000),
        finishedAt: hetCach ? new Date() : null,
      },
    });
    if (hetCach) {
      await tx.document.update({
        where: { id: job.document_id },
        data: { status: "FAILED", errorMessage: message.slice(0, 2000) },
      });
    }
  });

  logger.error(
    `Job ${job.id} thất bại (lần ${soLan}/${SO_LAN_THU_TOI_DA})` +
      `${hetCach ? " — dừng hẳn" : " — sẽ thử lại"}: ${message}`,
  );
}

// ===========================================================================
// VÒNG LẶP
// ===========================================================================

let dangChay = false;
let dungLai = false;

/**
 * Chạy hết các job đang chờ, rồi trả về.
 *
 * Tách khỏi vòng lặp hẹn giờ để test gọi được trực tiếp mà không phải chờ đồng hồ.
 */
export async function chayMotLuot(): Promise<number> {
  let daXuLy = 0;
  for (;;) {
    if (dungLai) break;
    const job = await nhanViec();
    if (!job) break;

    try {
      await xuLy(job);
    } catch (error) {
      await ghiNhanThatBai(job, error);
    }
    daXuLy += 1;
  }
  return daXuLy;
}

/** Khởi động vòng lặp nền. Gọi một lần từ `server.ts`. */
export function startWorker(): { stop: () => void } {
  if (dangChay) throw new Error("Worker đã chạy rồi");
  dangChay = true;
  dungLai = false;

  logger.info(`Worker nạp tài liệu bắt đầu · chu kỳ ${env.WORKER_POLL_INTERVAL_MS} ms`);

  let hen: NodeJS.Timeout | null = null;

  const vong = async (): Promise<void> => {
    if (dungLai) return;
    try {
      await thuHoiJobTreo();
      await chayMotLuot();
    } catch (error) {
      // Vòng lặp KHÔNG được chết vì một lỗi. Mất kết nối CSDL là chuyện tạm
      // thời; ghi log rồi thử lại ở chu kỳ sau.
      logger.error("Lỗi trong vòng lặp worker", error);
    }
    // Hẹn giờ SAU khi xong, không phải setInterval: nếu một lượt chạy lâu hơn
    // chu kỳ, setInterval sẽ chồng các lượt lên nhau.
    if (!dungLai) {
      hen = setTimeout(() => void vong(), env.WORKER_POLL_INTERVAL_MS);
      hen.unref();
    }
  };

  void vong();

  return {
    stop() {
      dungLai = true;
      dangChay = false;
      if (hen) clearTimeout(hen);
      logger.info("Worker nạp tài liệu đã dừng");
    },
  };
}

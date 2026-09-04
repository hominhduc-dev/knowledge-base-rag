// ---------------------------------------------------------------------------
// Nạp vector nhúng cho MỌI đoạn còn thiếu.
//
// Chạy:  corepack pnpm --filter @tang-thu/server run db:embed
//
// Dùng khi: nạp lần đầu cho dữ liệu mồi, bù sau một lần API hỏng giữa chừng, hay
// nạp lại sau khi đổi model. Chạy lại được nhiều lần — đoạn nào đã có vector cho
// model hiện tại thì bỏ qua, không tốn thêm lệnh gọi nào.
// ---------------------------------------------------------------------------
import { PrismaClient } from "@prisma/client";
import { nhungTaiLieu } from "../src/rag/embed.js";

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const model = process.env.GEMINI_EMBEDDING_MODEL ?? "gemini-embedding-2";
  console.log(`\nNạp vector nhúng · model ${model} · ${process.env.EMBEDDING_DIM ?? 1536} chiều\n`);

  const taiLieu = await prisma.document.findMany({
    where: { chunks: { some: { embeddings: { none: { model } } } } },
    select: { id: true, title: true, _count: { select: { chunks: true } } },
    orderBy: { createdAt: "asc" },
  });

  if (taiLieu.length === 0) {
    console.log("Mọi đoạn đã có vector. Không phải làm gì.\n");
    return;
  }

  let tongDoan = 0;
  let tongGoi = 0;
  let tongCache = 0;

  for (const d of taiLieu) {
    process.stdout.write(`  ${d.title.slice(0, 52).padEnd(54)}`);
    try {
      const so = await nhungTaiLieu(d.id);
      tongDoan += so.tong;
      tongGoi += so.goiApi;
      tongCache += so.tuCache;
      console.log(`${String(so.tong).padStart(3)} đoạn  (${so.goiApi} API, ${so.tuCache} cache)`);
    } catch (error) {
      console.log(`THẤT BẠI — ${(error as Error).message.slice(0, 90)}`);
      process.exitCode = 1;
    }
  }

  console.log(`\n${"─".repeat(72)}`);
  console.log(`Tổng: ${tongDoan} đoạn · ${tongGoi} lệnh gọi API · ${tongCache} lấy từ vector đã có`);

  const conThieu = await prisma.chunk.count({ where: { embeddings: { none: { model } } } });
  console.log(conThieu === 0 ? "Không còn đoạn nào thiếu vector.\n" : `Còn ${conThieu} đoạn chưa có vector.\n`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

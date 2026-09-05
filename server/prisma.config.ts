// ---------------------------------------------------------------------------
// Cấu hình Prisma CLI.
//
// LÝ DO TỆP NÀY TỒN TẠI: Prisma CLI chỉ tìm `.env` ở thư mục hiện tại và cạnh
// `schema.prisma`. Nó KHÔNG tìm ngược lên thư mục cha. Mà dự án chỉ có MỘT tệp
// cấu hình, đặt ở gốc repo — nên phải tự nạp.
//
// Đây cũng là nơi thay cho khóa `prisma` trong package.json: khóa đó đã bị khai
// tử và sẽ bị bỏ ở Prisma 7.
//
// Khi tệp cấu hình này tồn tại, Prisma KHÔNG tự nạp `.env` nữa — kể cả tệp nằm
// đúng chỗ nó vẫn tìm. Việc nạp biến môi trường hoàn toàn thuộc về tệp này.
// ---------------------------------------------------------------------------
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as napEnv } from "dotenv";
import { defineConfig } from "prisma/config";

const thuMuc = path.dirname(fileURLToPath(import.meta.url));

// `quiet` để khỏi in banner của dotenv vào giữa output của Prisma.
napEnv({ path: path.join(thuMuc, "..", ".env"), quiet: true });

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    path: path.join("prisma", "migrations"),
    seed: "tsx prisma/seed.ts",
  },
});

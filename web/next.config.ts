import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

// `import.meta.url` là URL kiểu file://. Trên Windows, đọc `.pathname` của nó cho
// ra "/D:/Source_code/..." — có dấu gạch thừa ở đầu và không dùng được. Phải qua
// `fileURLToPath` mới ra đường dẫn hệ điều hành đúng trên cả Windows lẫn Linux.
const thuMucHienTai = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Gom mọi thứ cần để chạy vào .next/standalone, kể cả phần node_modules dùng
  // tới. Nhờ vậy image production không phải cài lại phụ thuộc.
  output: "standalone",

  // Trong monorepo, Next lấy thư mục dự án làm gốc dò file và bỏ qua mọi thứ nằm
  // ngoài. Với pnpm thì phụ thuộc là symlink trỏ ra ../node_modules/.pnpm, tức là
  // nằm ngoài `web/` — không chỉ rõ gốc là bản standalone thiếu file và chết lúc
  // chạy. Trỏ lên gốc workspace.
  outputFileTracingRoot: path.join(thuMucHienTai, ".."),
};

export default nextConfig;

// ---------------------------------------------------------------------------
// Validate biến môi trường bằng zod, đúng danh sách trong `.env.example`.
//
// Nguyên tắc: process.env chỉ được đọc ở ĐÚNG file này. Mọi nơi khác import
// `env` — nhờ vậy thiếu biến thì tiến trình chết ngay lúc khởi động kèm thông
// báo rõ ràng, thay vì chết giữa một request với `undefined` khó lần.
//
// Vì sao chỉ BẮT BUỘC hai biến (DATABASE_URL, JWT_SECRET): đó là toàn bộ những
// gì tầng đang có cần tới. Khóa Gemini chưa có; bắt buộc nó ngay bây giờ là chặn
// cả máy chủ khởi động vì một module chưa ai viết. Khi TV2 dựng `documents/` và
// TV3 dựng `chat/`, siết lại chỗ được đánh dấu SIẾT KHI DÙNG bên dưới.
// ---------------------------------------------------------------------------
import "dotenv/config";
import { z } from "zod";

/** Chuỗi số trong .env luôn về dạng số, kèm chặn NaN. */
const numeric = (fallback: number) =>
  z.coerce.number().int().positive().default(fallback);

const schema = z.object({
  // --- Cơ sở dữ liệu -------------------------------------------------------
  DATABASE_URL: z.string().min(1, "DATABASE_URL không được rỗng"),

  // --- Gemini ----------------------------------- SIẾT KHI DÙNG (TV3) ------
  GEMINI_API_KEY: z.string().default(""),
  GEMINI_EMBEDDING_MODEL: z.string().default("gemini-embedding-2"),
  GEMINI_GENERATION_MODEL: z.string().default("gemini-flash-latest"),
  // Trần token cho câu trả lời. Model có bước suy nghĩ nội bộ và những token đó
  // cũng tính vào trần, nên để rộng — đặt sát quá thì câu trả lời bị cắt cụt
  // giữa chừng mà không có lỗi nào báo.
  GENERATION_MAX_TOKENS: numeric(2048),
  // Phải khớp vector(1536) trong schema.prisma. Đổi số này mà không viết
  // migration đổi kiểu cột là mọi lần ghi vector bị Postgres từ chối.
  //
  // `gemini-embedding-2` chuẩn hóa sẵn cả khi cắt ngắn; `-001` thì không, nên
  // rag/embed.ts vẫn tự chuẩn hóa L2 để đổi model sau này không tạo bẫy.
  EMBEDDING_DIM: numeric(1536),
  // Mã hóa bất đối xứng câu hỏi/tài liệu. Về lý thuyết đúng hơn, nhưng phép thử
  // một mẫu cho thấy nó làm độ phân biệt hơi kém đi — để bật/tắt được và đưa vào
  // làm biến của bộ đánh giá. Xem ghi chú trong rag/embed.ts.
  GEMINI_USE_TASK_TYPE: z
    .string()
    .default("true")
    .transform((v) => v.toLowerCase() !== "false" && v !== "0"),

  // --- Xác thực ------------------------------------------------------------
  // 32 ký tự là sàn thực dụng cho HS256: khóa ngắn hơn đầu ra của hàm băm thì
  // không thêm được entropy nào.
  JWT_SECRET: z.string().min(32, "JWT_SECRET phải dài ít nhất 32 ký tự"),
  JWT_EXPIRES_IN: z.string().default("7d"),
  BCRYPT_ROUNDS: numeric(10),

  // --- Truy hồi ------------------------------------------------------------
  RETRIEVAL_TOP_K: numeric(10),
  // Trọng số tìm kiếm lai: 1.0 là vector thuần, 0.0 là BM25 thuần.
  // Giá trị mặc định 0.6 là giả thiết, KHÔNG phải kết luận — bộ đánh giá ở
  // Sprint 4 sẽ chọn con số thật bằng thí nghiệm.
  RETRIEVAL_ALPHA: z.coerce.number().min(0).max(1).default(0.6),
  RETRIEVAL_MIN_SCORE: z.coerce.number().min(0).max(1).default(0.35),
  CHUNK_STRATEGY: z.enum(["STRUCTURED", "FIXED"]).default("STRUCTURED"),
  CHUNK_SIZE: numeric(800),
  CHUNK_OVERLAP: numeric(100),

  // --- Máy chủ -------------------------------------------------------------
  PORT: numeric(4000),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  // Cho phép nhiều origin, ngăn cách bằng dấu phẩy.
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  MAX_UPLOAD_MB: numeric(20),
  UPLOAD_DIR: z.string().default("./uploads"),
  WORKER_POLL_INTERVAL_MS: numeric(2000),

  // --- Module netlab (môn Lập trình mạng) ---------------------------------
  NETLAB_TCP_PORT: numeric(9999),
  NETLAB_HTTP_PORT: numeric(8080),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const chiTiet = parsed.error.issues
    .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
    .join("\n");
  console.error(
    `Biến môi trường không hợp lệ:\n${chiTiet}\n\n` +
      "Copy apps/backend/.env.example sang apps/backend/.env rồi điền giá trị thật.",
  );
  process.exit(1);
}

export const env = parsed.data;

/** Danh sách origin đã tách sẵn cho middleware cors. */
export const corsOrigins = env.CORS_ORIGIN.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

export const isProduction = env.NODE_ENV === "production";

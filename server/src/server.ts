// ---------------------------------------------------------------------------
// Điểm vào. Mở cổng, và đóng cho sạch khi bị dừng.
// ---------------------------------------------------------------------------
import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./config/prisma.js";
import { logger } from "./lib/logger.js";

const app = createApp();

// Bind 0.0.0.0 TƯỜNG MINH, không để mặc định.
//
// Trong container, bind 127.0.0.1 là tự cô lập: Caddy nằm ở container khác sẽ
// không gọi vào được và mọi request trả 502. Khi demo LAN thì cũng vậy — máy
// khách không thấy dịch vụ. Đây là lỗi cấu hình mạng hay gặp nhất của đồ án
// này, nên viết rõ ra thay vì dựa vào giá trị mặc định của Node.
const HOST = process.env.HOST ?? "0.0.0.0";

const server = app.listen(env.PORT, HOST, () => {
  logger.info(`Tàng Thư API đang nghe tại http://${HOST}:${env.PORT}/api`);
});

/**
 * Tắt có trật tự: ngừng nhận kết nối mới, chờ request đang chạy xong, rồi mới
 * đóng pool. Đóng Prisma trước là cắt ngang chính những request đang dở.
 */
async function shutdown(signal: string): Promise<void> {
  logger.info(`Nhận ${signal}, đang tắt…`);

  // Sau 10 giây thì thôi chờ. Request treo không được giữ tiến trình sống mãi,
  // nếu không trình quản lý sẽ tự SIGKILL và ta mất luôn cơ hội đóng pool.
  const hetGio = setTimeout(() => {
    logger.warn("Quá 10 giây, buộc thoát");
    process.exit(1);
  }, 10_000);
  hetGio.unref();

  server.close(async (error) => {
    if (error) logger.error("Lỗi khi đóng máy chủ HTTP", error);
    await prisma.$disconnect();
    logger.info("Đã tắt gọn gàng");
    process.exit(error ? 1 : 0);
  });
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

// Lỗi lọt ra ngoài mọi lớp bắt: ghi log rồi để tiến trình chết. Nuốt nó đi là
// giữ lại một tiến trình có trạng thái không xác định, tệ hơn là khởi động lại.
process.on("unhandledRejection", (reason) => {
  logger.error("Promise bị reject mà không ai bắt", reason);
  void shutdown("unhandledRejection");
});
process.on("uncaughtException", (error) => {
  logger.error("Ngoại lệ không ai bắt", error);
  void shutdown("uncaughtException");
});

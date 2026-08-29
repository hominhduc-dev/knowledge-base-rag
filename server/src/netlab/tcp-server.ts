// ---------------------------------------------------------------------------
// TCP echo server — cổng 9999. Chỉ dùng module `net` của Node, không thư viện.
//
// Chạy:  node dist/netlab/tcp-server.js
//   dev: corepack pnpm --filter @tang-thu/server exec tsx src/netlab/tcp-server.ts
//
// ---------------------------------------------------------------------------
// ĐỐI CHIẾU VÒNG ĐỜI SOCKET — bảng này đi thẳng vào báo cáo
//
//   Giáo trình (C#)              Node.js (module `net`)
//   ───────────────────────────  ────────────────────────────────
//   new Socket(...)              net.createServer()
//   Bind(ipep) + Listen(10)      server.listen(port, host)
//   Accept()                     sự kiện 'connection'
//   Receive(data)                sự kiện 'data'
//   Send(bytes)                  socket.write()
//   Shutdown() / Close()         socket.end()
//
// KHÁC BIỆT CỐT LÕI, cần nêu rõ khi bảo vệ:
//
// `Accept()` trong C# là hàm CHẶN — luồng dừng lại chờ client. Muốn phục vụ
// nhiều client phải tạo một thread cho mỗi kết nối, mỗi thread tốn khoảng 1 MB
// stack; 1000 client là ~1 GB bộ nhớ chỉ để ngồi chờ.
//
// Node đăng ký callback rồi trả quyền điều khiển cho vòng lặp sự kiện. Một luồng
// phục vụ hàng nghìn kết nối, vì thời gian chờ mạng không tốn thread nào.
//
// Đánh đổi: tác vụ nặng CPU chặn TOÀN BỘ vòng lặp, mọi client cùng đứng. Đây
// chính là lý do worker xử lý PDF được tách khỏi đường truy vấn trong hệ thống
// chính — nếu để cắt đoạn và gọi API nhúng chạy chung tiến trình với API hỏi
// đáp thì mỗi lần upload tài liệu là mọi người đang hỏi đều bị treo.
// ---------------------------------------------------------------------------
import net from "node:net";
import { LineFramer } from "./framing.js";

const PORT = Number(process.env.NETLAB_TCP_PORT ?? 9999);
// 0.0.0.0 chứ không phải 127.0.0.1: bind loopback là chỉ chính máy này gọi được,
// và buổi demo LAN sẽ hỏng đúng lúc máy của thầy kết nối vào.
const HOST = process.env.NETLAB_TCP_HOST ?? "0.0.0.0";

/** Các kết nối đang mở, giữ để tắt cho gọn khi nhận SIGINT. */
const connections = new Set<net.Socket>();
let nextId = 1;

const server = net.createServer((socket) => {
  const id = nextId++;
  const peer = `${socket.remoteAddress}:${socket.remotePort}`;
  connections.add(socket);
  log(`[#${id}] mở kết nối từ ${peer} · đang có ${connections.size}`);

  // Mỗi kết nối MỘT framer riêng. Dùng chung một framer cho mọi socket là trộn
  // lẫn byte của hai client vào nhau — lỗi rất khó lần vì chỉ xuất hiện khi có
  // từ hai client gửi đồng thời.
  const framer = new LineFramer("\n");

  socket.setNoDelay(true); // tắt Nagle: thông điệp nhỏ đi ngay, không gom lô

  socket.on("data", (chunk: Buffer) => {
    log(`[#${id}] nhận ${chunk.length} byte`);

    let messages: string[];
    try {
      messages = framer.push(chunk);
    } catch (error) {
      log(`[#${id}] ${(error as Error).message} — đóng kết nối`);
      socket.end("ERR khung thông điệp không hợp lệ\n");
      return;
    }

    // 0 thông điệp nghĩa là mới về nửa cái, chờ mảnh sau. Nhiều thông điệp nghĩa
    // là chúng dính liền trong một gói. Cả hai đều bình thường.
    if (messages.length === 0) {
      log(`[#${id}] chưa đủ một thông điệp, giữ lại ${framer.pending} byte`);
      return;
    }

    for (const message of messages) {
      log(`[#${id}] <- ${JSON.stringify(message)}`);
      if (message.trim().toUpperCase() === "QUIT") {
        socket.end("BYE\n");
        return;
      }
      // Trả lại kèm delimiter — nếu quên, client cũng không biết thông điệp đã
      // hết ở đâu. Framing là ràng buộc của CẢ HAI đầu.
      socket.write(`ECHO ${message}\n`);
    }
  });

  // Bắt buộc phải có. Client rút dây mạng hoặc tắt máy đột ngột sinh ECONNRESET;
  // không bắt thì lỗi nổi lên thành uncaughtException và giết cả server — một
  // client làm sập dịch vụ của tất cả.
  socket.on("error", (error) => {
    log(`[#${id}] lỗi socket: ${error.message}`);
  });

  socket.on("close", () => {
    connections.delete(socket);
    log(`[#${id}] đóng · còn lại ${connections.size}`);
  });
});

server.on("error", (error) => {
  log(`lỗi máy chủ: ${error.message}`);
  process.exit(1);
});

server.listen(PORT, HOST, () => {
  log(`TCP echo server nghe tại ${HOST}:${PORT} · phân tách bằng "\\n"`);
  log(`thử nhanh:  node dist/netlab/tcp-client.js`);
});

// --- Tắt an toàn khi nhận SIGINT -------------------------------------------
// Không xử lý thì Ctrl+C giết tiến trình ngay lập tức, các kết nối đang mở bị
// đứt giữa chừng và cổng còn kẹt ở TIME_WAIT một lúc.
let dangTat = false;
function shutdown(signal: string): void {
  if (dangTat) return;
  dangTat = true;
  log(`nhận ${signal}, đang đóng ${connections.size} kết nối…`);

  server.close(() => {
    log("đã đóng gọn gàng");
    process.exit(0);
  });

  for (const socket of connections) socket.end("SERVER SHUTDOWN\n");

  // Client cố tình không đóng thì cũng không được giữ tiến trình sống mãi.
  setTimeout(() => {
    log("quá 5 giây, buộc thoát");
    for (const socket of connections) socket.destroy();
    process.exit(1);
  }, 5000).unref();
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

function log(message: string): void {
  console.log(`${new Date().toISOString()} ${message}`);
}

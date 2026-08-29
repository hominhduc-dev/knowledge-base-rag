// ---------------------------------------------------------------------------
// TCP client đối chiếu với `tcp-server.ts`.
//
// Chạy:
//   node dist/netlab/tcp-client.js                    # tới localhost:9999
//   node dist/netlab/tcp-client.js 192.168.1.10 9999  # tới máy khác trong LAN
//   node dist/netlab/tcp-client.js --split            # chứng minh chuyện framing
//
// Chế độ `--split` là phần đáng giá nhất: nó gửi MỘT thông điệp chia làm ba lần
// `write()`, cách nhau 50 ms, rồi gửi HAI thông điệp dính trong một lần `write()`.
// Server vẫn phải trả đúng ba dòng ECHO. Đây là bằng chứng cho câu "TCP là luồng
// byte, không phải luồng thông điệp" — chụp màn hình đưa vào báo cáo.
// ---------------------------------------------------------------------------
import net from "node:net";
import { LineFramer } from "./framing.js";

const args = process.argv.slice(2);
const cheDoSplit = args.includes("--split");
const viTri = args.filter((a) => !a.startsWith("--"));
const HOST = viTri[0] ?? "127.0.0.1";
const PORT = Number(viTri[1] ?? process.env.NETLAB_TCP_PORT ?? 9999);

const framer = new LineFramer("\n");
const socket = net.createConnection({ host: HOST, port: PORT }, () => {
  log(`đã nối tới ${HOST}:${PORT} từ cổng cục bộ ${socket.localPort}`);
  void guiThongDiep();
});

socket.setNoDelay(true);

// Phía nhận cũng phải ghép khung. Server trả lời cũng bằng TCP, nên câu trả lời
// cũng có thể bị chia nhỏ hoặc dính nhau — client bỏ qua bước này là mắc đúng
// cái lỗi mà server đã cẩn thận tránh.
socket.on("data", (chunk: Buffer) => {
  for (const message of framer.push(chunk)) {
    log(`<- ${JSON.stringify(message)}`);
  }
});

socket.on("error", (error) => {
  log(`lỗi: ${error.message}`);
  process.exit(1);
});

socket.on("close", () => {
  log("kết nối đã đóng");
});

async function guiThongDiep(): Promise<void> {
  if (!cheDoSplit) {
    // Đường đi bình thường: mỗi thông điệp một lần write, có delimiter ở cuối.
    for (const text of ["xin chào", "Điều 12 quy định gì?", "tạm biệt"]) {
      log(`-> ${JSON.stringify(text)}`);
      socket.write(`${text}\n`);
      await nghi(100);
    }
    socket.write("QUIT\n");
    return;
  }

  // --- Thí nghiệm 1: MỘT thông điệp chia làm BA lần write --------------------
  // Cắt ngay giữa một ký tự tiếng Việt có dấu để chứng minh vì sao phải tích lũy
  // bằng Buffer chứ không phải chuỗi.
  const cau = "Điều kiện xét tốt nghiệp là gì?";
  const bytes = Buffer.from(cau, "utf8");
  log(`thí nghiệm 1: gửi ${JSON.stringify(cau)} — ${bytes.length} byte, chia 3 mảnh`);
  log(`  (chuỗi dài ${cau.length} ký tự nhưng ${bytes.length} byte — chính là cái bẫy Content-Length)`);

  // Cắt tại byte thứ NHẤT — tức GIỮA chữ "Đ", vốn là hai byte 0xC4 0x90 trong
  // UTF-8. Cắt ở byte thứ 2 thì rơi đúng ranh giới ký tự và không chứng minh
  // được gì; phải cắt lẻ mới thấy vì sao bộ đệm phải là Buffer chứ không phải
  // chuỗi. Mảnh 2 cũng cắt lẻ, giữa chữ "ề" (ba byte).
  const manh = [bytes.subarray(0, 1), bytes.subarray(1, 4), bytes.subarray(4)];

  // Cho thấy chuyện gì xảy ra nếu giải mã từng mảnh ngay khi nhận — cách viết
  // sai phổ biến `buf += chunk.toString()`. Ký tự bị cắt đôi thành U+FFFD và
  // không bao giờ ghép lại được.
  const naive = manh.map((m) => m.toString("utf8")).join("");
  log(`  cách SAI (giải mã từng mảnh): ${JSON.stringify(naive.slice(0, 12))}…`);
  log(`  cách ĐÚNG (ghép Buffer rồi mới giải mã): ${JSON.stringify(cau.slice(0, 12))}…`);

  for (const [i, m] of manh.entries()) {
    log(`  -> mảnh ${i + 1}: ${m.length} byte`);
    socket.write(m);
    await nghi(50);
  }
  socket.write("\n"); // giờ mới đóng khung
  await nghi(200);

  // --- Thí nghiệm 2: HAI thông điệp dính trong MỘT lần write -----------------
  log("thí nghiệm 2: gửi 2 thông điệp trong 1 lần write — phải nhận lại 2 dòng ECHO");
  socket.write("thông điệp A\nthông điệp B\n");
  await nghi(300);

  socket.write("QUIT\n");
}

const nghi = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function log(message: string): void {
  console.log(`${new Date().toISOString()} ${message}`);
}

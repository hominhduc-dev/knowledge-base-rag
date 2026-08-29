// ---------------------------------------------------------------------------
// HTTP/1.1 server TỰ VIẾT trên nền TCP socket — cổng 8080.
//
// KHÔNG dùng module `http` của Node. KHÔNG dùng Express. Chỉ `net`.
//
// Chạy:  node dist/netlab/http-server.js
//   thử: curl -v http://localhost:8080/
//        curl -v -X POST http://localhost:8080/echo -H "Content-Type: application/json" -d "{\"q\":\"Điều 12\"}"
//
// Tham chiếu: RFC 9110 (HTTP Semantics) và RFC 9112 (HTTP/1.1).
// RFC 2616 đã bị thay thế từ năm 2014 — trích nó trong báo cáo là lỗi dễ bị bắt.
//
// ---------------------------------------------------------------------------
// VÌ SAO HTTP DÙNG CẢ HAI CÁCH FRAMING
//
// Đây là điểm sáng nhất của bài: HTTP không chọn một trong hai cách phân định
// ranh giới thông điệp, nó dùng CẢ HAI, mỗi cách cho một phần.
//
//   Phần header  → DELIMITER. Kết thúc tại dãy `\r\n\r\n`. Phải vậy vì lúc bắt
//                  đầu đọc, ta chưa biết có bao nhiêu header và mỗi cái dài bao
//                  nhiêu — không thể khai báo trước độ dài.
//
//   Phần body    → LENGTH-PREFIX. `Content-Length` nằm TRONG header cho biết
//                  thân dài đúng bao nhiêu byte. Phải vậy vì thân là dữ liệu tùy
//                  ý, có thể chứa bất kỳ chuỗi byte nào kể cả `\r\n\r\n` — không
//                  ký tự nào an toàn để làm dấu kết thúc.
//
// Trình tự đọc vì thế là hai giai đoạn: quét tìm delimiter để lấy header, đọc
// Content-Length trong đó, rồi chờ đủ ngần ấy byte thân.
// ---------------------------------------------------------------------------
import net from "node:net";
import { pathToFileURL } from "node:url";

const PORT = Number(process.env.NETLAB_HTTP_PORT ?? 8080);
const HOST = process.env.NETLAB_HTTP_HOST ?? "0.0.0.0";

const HEADER_END = Buffer.from("\r\n\r\n", "ascii");
const MAX_HEADER_BYTES = 16 * 1024;
const MAX_BODY_BYTES = 1024 * 1024;
const KEEP_ALIVE_TIMEOUT_MS = 5000;

type HttpRequest = {
  method: string;
  target: string;
  version: string;
  headers: Map<string, string>;
  body: Buffer;
};

// ===========================================================================
// PHÂN TÍCH
// ===========================================================================

/**
 * Tách request line và các dòng header.
 *
 * Tên header KHÔNG phân biệt hoa thường (RFC 9110 §5.1) nên hạ về chữ thường
 * làm khóa. Tra `headers.get("Content-Length")` mà client gửi `content-length:`
 * sẽ trả undefined, rồi server đọc thiếu thân và treo chờ dữ liệu đã tới rồi.
 */
function parseHeaderBlock(raw: string): Omit<HttpRequest, "body"> | null {
  const lines = raw.split("\r\n");
  const requestLine = lines[0];
  if (!requestLine) return null;

  // METHOD SP TARGET SP VERSION
  const parts = requestLine.split(" ");
  if (parts.length !== 3) return null;
  const [method, target, version] = parts as [string, string, string];
  if (!method || !target || !version.startsWith("HTTP/")) return null;

  const headers = new Map<string, string>();
  for (const line of lines.slice(1)) {
    if (!line) continue;
    const colon = line.indexOf(":");
    if (colon <= 0) return null; // dòng header không có dấu hai chấm là hỏng khung
    const name = line.slice(0, colon).trim().toLowerCase();
    const value = line.slice(colon + 1).trim();
    headers.set(name, value);
  }

  return { method: method.toUpperCase(), target, version, headers };
}

// ===========================================================================
// DỰNG PHẢN HỒI
// ===========================================================================

const REASON: Record<number, string> = {
  200: "OK",
  400: "Bad Request",
  404: "Not Found",
  405: "Method Not Allowed",
  408: "Request Timeout",
  411: "Length Required",
  413: "Content Too Large",
  431: "Request Header Fields Too Large",
  500: "Internal Server Error",
};

/**
 * Ghép phản hồi thành byte.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * CONTENT-LENGTH TÍNH BẰNG BYTE, KHÔNG PHẢI SỐ KÝ TỰ.
 *
 * Đây là lỗi đặc thù của người viết HTTP server bằng tiếng Việt, và đáng nêu
 * riêng một mục trong báo cáo.
 *
 * Chuỗi "Điều 12" có 7 ký tự nhưng 9 byte trong UTF-8 — "Đ" chiếm 2 byte, "ề"
 * chiếm 3 byte. Khai `Content-Length: 7` thì trình duyệt đọc đúng 7 byte rồi
 * dừng, cắt mất phần đuôi; nếu khai thiếu ở giữa một ký tự thì phần hiển thị
 * còn hỏng cả ký tự đó. Trường hợp ngược lại — khai thừa — thì trình duyệt treo
 * chờ số byte không bao giờ đến, cho tới khi hết thời gian chờ.
 *
 * `Buffer.byteLength()` cho số byte thật. `string.length` cho số ký tự UTF-16.
 * Với văn bản thuần ASCII hai số này bằng nhau, nên lỗi không bao giờ lộ ra khi
 * thử bằng tiếng Anh.
 * ────────────────────────────────────────────────────────────────────────────
 */
function buildResponse(
  status: number,
  body: string,
  contentType: string,
  keepAlive: boolean,
): Buffer {
  const bodyBuffer = Buffer.from(body, "utf8");

  const headers = [
    `HTTP/1.1 ${status} ${REASON[status] ?? "Unknown"}`,
    `Content-Type: ${contentType}; charset=utf-8`,
    // Chính là chỗ đó. KHÔNG dùng body.length.
    `Content-Length: ${bodyBuffer.length}`,
    `Connection: ${keepAlive ? "keep-alive" : "close"}`,
    `Date: ${new Date().toUTCString()}`,
    `Server: netlab/1.0`,
  ];
  if (keepAlive) headers.push(`Keep-Alive: timeout=${KEEP_ALIVE_TIMEOUT_MS / 1000}`);

  // Dòng trống ngăn header với thân — cùng dãy `\r\n\r\n` mà bên đọc dò tìm.
  return Buffer.concat([Buffer.from(headers.join("\r\n") + "\r\n\r\n", "ascii"), bodyBuffer]);
}

// ===========================================================================
// ĐỊNH TUYẾN
// ===========================================================================

const batDauChay = Date.now();

function handle(req: HttpRequest): { status: number; body: string; type: string } {
  const duongDan = req.target.split("?")[0] ?? "/";

  if (duongDan === "/" && req.method === "GET") {
    return {
      status: 200,
      type: "text/plain",
      body:
        "netlab HTTP server — viết tay trên TCP socket, không dùng module http.\n" +
        "Thử tiếng Việt có dấu để kiểm chứng Content-Length: Điều 12, Khoản 3.\n" +
        "Đường dẫn: GET /  ·  GET /health  ·  POST /echo\n",
    };
  }

  if (duongDan === "/health" && req.method === "GET") {
    return {
      status: 200,
      type: "application/json",
      body: JSON.stringify({
        status: "ok",
        uptimeSeconds: Math.floor((Date.now() - batDauChay) / 1000),
      }),
    };
  }

  if (duongDan === "/echo") {
    if (req.method !== "POST") {
      return { status: 405, type: "text/plain", body: "Chỉ nhận POST\n" };
    }
    // Giải mã UTF-8 ở đây, sau khi đã chắc chắn nhận đủ số byte Content-Length
    // khai báo — giải mã sớm hơn là mạo hiểm cắt giữa một ký tự.
    const text = req.body.toString("utf8");
    return {
      status: 200,
      type: "application/json",
      body: JSON.stringify({
        received: text,
        soKyTu: text.length,
        soByte: Buffer.byteLength(text, "utf8"),
      }),
    };
  }

  return { status: 404, type: "text/plain", body: "Không tìm thấy\n" };
}

// ===========================================================================
// MÁY CHỦ
// ===========================================================================

/**
 * Tạo máy chủ mà KHÔNG mở cổng. Nhờ tách ra thế này, test tích hợp gọi được
 * `createHttpServer().listen(0)` để hệ điều hành cấp một cổng trống bất kỳ —
 * không phải cố định 8080 rồi va nhau khi chạy song song.
 */
export function createHttpServer(): net.Server {
  return net.createServer((socket) => {
    const peer = `${socket.remoteAddress}:${socket.remotePort}`;
    // Bộ đệm SỐNG QUA NHIỀU REQUEST trên cùng kết nối. Với keep-alive, request thứ
    // hai có thể đã nằm sẵn trong bộ đệm ngay khi request thứ nhất vừa xử lý xong.
    let buffer = Buffer.alloc(0);
    let dangXuLy = false;

    socket.setNoDelay(true);
    socket.setTimeout(KEEP_ALIVE_TIMEOUT_MS);

    socket.on("data", (chunk: Buffer) => {
      buffer = Buffer.concat([buffer, chunk]);
      xuLyBoDem();
    });

    /** Rút ra và xử lý mọi request đã hoàn chỉnh trong bộ đệm. */
    function xuLyBoDem(): void {
      if (dangXuLy) return;
      dangXuLy = true;

      try {
        for (;;) {
          // --- Giai đoạn 1: dò delimiter để lấy trọn khối header ---------------
          const ketThucHeader = buffer.indexOf(HEADER_END);
          if (ketThucHeader === -1) {
            // Chưa thấy `\r\n\r\n`. Có thể request mới về một nửa — CHỜ, đừng đoán.
            if (buffer.length > MAX_HEADER_BYTES) {
              traLoi(431, "Header quá dài\n", "text/plain", false);
            }
            return;
          }

          const raw = buffer.subarray(0, ketThucHeader).toString("ascii");
          const parsed = parseHeaderBlock(raw);
          if (!parsed) {
            traLoi(400, "Request không hợp lệ\n", "text/plain", false);
            return;
          }

          // --- Giai đoạn 2: đọc Content-Length để biết thân dài bao nhiêu ------
          const batDauThan = ketThucHeader + HEADER_END.length;
          const contentLengthRaw = parsed.headers.get("content-length");
          let contentLength = 0;

          if (contentLengthRaw !== undefined) {
            contentLength = Number.parseInt(contentLengthRaw, 10);
            if (!Number.isInteger(contentLength) || contentLength < 0) {
              traLoi(400, "Content-Length không hợp lệ\n", "text/plain", false);
              return;
            }
            if (contentLength > MAX_BODY_BYTES) {
              traLoi(413, "Thân request quá lớn\n", "text/plain", false);
              return;
            }
          } else if (parsed.method === "POST" || parsed.method === "PUT") {
            // Ngoài phạm vi có chủ đích: `Transfer-Encoding: chunked`. Nêu rõ là
            // không hỗ trợ còn hơn im lặng đọc sai.
            traLoi(411, "Cần Content-Length (chưa hỗ trợ chunked)\n", "text/plain", false);
            return;
          }

          // Thân chưa về đủ. CHỜ — đây đúng là chỗ mà "gọi Receive một lần rồi coi
          // như xong" sẽ đọc phải request cụt.
          if (buffer.length < batDauThan + contentLength) return;

          const body = buffer.subarray(batDauThan, batDauThan + contentLength);
          // Cắt request vừa xử lý khỏi bộ đệm; phần còn lại có thể là request kế.
          buffer = buffer.subarray(batDauThan + contentLength);

          const req: HttpRequest = { ...parsed, body };

          // HTTP/1.1 mặc định giữ kết nối, trừ khi client xin đóng (RFC 9112 §9.3).
          const connectionHeader = (req.headers.get("connection") ?? "").toLowerCase();
          const keepAlive =
            req.version === "HTTP/1.1" ? connectionHeader !== "close" : connectionHeader === "keep-alive";

          const ketQua = handle(req);
          log(`${peer} ${req.method} ${req.target} -> ${ketQua.status}${keepAlive ? " (keep-alive)" : ""}`);
          traLoi(ketQua.status, ketQua.body, ketQua.type, keepAlive);

          if (!keepAlive) return;
          if (buffer.length === 0) return; // hết dữ liệu, chờ request sau
        }
      } finally {
        dangXuLy = false;
      }
    }

    function traLoi(status: number, body: string, type: string, keepAlive: boolean): void {
      socket.write(buildResponse(status, body, type, keepAlive));
      if (!keepAlive) socket.end();
    }

    socket.on("timeout", () => {
      log(`${peer} hết thời gian chờ keep-alive, đóng`);
      socket.end();
    });

    socket.on("error", (error) => {
      log(`${peer} lỗi socket: ${error.message}`);
    });
  });
}

// --- Chỉ mở cổng khi chạy trực tiếp, không phải khi bị test import ----------
// So `import.meta.url` với đường dẫn Node được gọi kèm. Thiếu bước này thì mỗi
// lần test import file cũng chiếm luôn cổng 8080.
const chayTrucTiep =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;

if (chayTrucTiep) {
  const server = createHttpServer();
  server.listen(PORT, HOST, () => {
    log(`HTTP server tự viết nghe tại http://${HOST}:${PORT}`);
    log(`bắt gói:  Wireshark, bộ lọc  tcp.port == ${PORT}`);
  });

  let dangTat = false;
  const shutdown = (signal: string): void => {
    if (dangTat) return;
    dangTat = true;
    log(`nhận ${signal}, đang đóng…`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 5000).unref();
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

function log(message: string): void {
  // Im lặng khi bị test import, để kết quả test không lẫn log của máy chủ.
  if (chayTrucTiep) console.log(`${new Date().toISOString()} ${message}`);
}

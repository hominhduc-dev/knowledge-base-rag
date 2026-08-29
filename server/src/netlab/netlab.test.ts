// ---------------------------------------------------------------------------
// Kiểm chứng module netlab — tiêu chí thành công số 5 của đồ án.
//
// Chạy:  corepack pnpm --filter @tang-thu/server run test
//
// Dùng `node:test` có sẵn trong Node 22, không thêm thư viện test nào. Đúng
// nguyên tắc "ít thành phần" của dự án: mỗi công cụ thêm vào là một khoản học
// phí cả nhóm phải trả bằng thời gian.
//
// Nhóm test quan trọng nhất là "HTTP server — framing": nó gửi MỘT request chia
// làm ba lần ghi, cắt giữa TÊN HEADER và giữa THÂN JSON. Đây là bằng chứng cho
// câu "TCP là luồng byte, không phải luồng thông điệp" trong báo cáo.
// ---------------------------------------------------------------------------
import assert from "node:assert/strict";
import net from "node:net";
import { after, before, describe, it } from "node:test";
import { LengthPrefixFramer, LineFramer } from "./framing.js";
import { createHttpServer } from "./http-server.js";

// ===========================================================================
describe("LineFramer — phân định bằng delimiter", () => {
  it("ghép lại một thông điệp bị chia làm nhiều mảnh", () => {
    const framer = new LineFramer("\n");
    assert.deepEqual(framer.push(Buffer.from("xin ")), []);
    assert.deepEqual(framer.push(Buffer.from("chào")), []);
    // "xin chào" là 8 KÝ TỰ nhưng 9 BYTE — chữ "à" chiếm 2 byte UTF-8.
    // Bộ đệm đếm byte, và đây đúng là chỗ dùng nhầm `.length` sẽ lệch.
    assert.equal("xin chào".length, 8);
    assert.equal(Buffer.byteLength("xin chào", "utf8"), 9);
    assert.equal(framer.pending, 9); // chưa có delimiter nên chưa cắt được gì
    assert.deepEqual(framer.push(Buffer.from("\n")), ["xin chào"]);
    assert.equal(framer.pending, 0);
  });

  it("tách được nhiều thông điệp dính trong một mảnh", () => {
    const framer = new LineFramer("\n");
    assert.deepEqual(framer.push(Buffer.from("A\nB\nC\n")), ["A", "B", "C"]);
  });

  it("giữ lại phần đuôi khi mảnh cuối chưa trọn", () => {
    const framer = new LineFramer("\n");
    assert.deepEqual(framer.push(Buffer.from("A\nB\nC")), ["A", "B"]);
    assert.deepEqual(framer.push(Buffer.from("\n")), ["C"]);
  });

  it("KHÔNG làm hỏng ký tự tiếng Việt bị cắt đôi giữa hai mảnh", () => {
    // Đây là lý do bộ đệm phải là Buffer chứ không phải chuỗi.
    const cau = "Điều kiện xét tốt nghiệp";
    const bytes = Buffer.from(cau, "utf8");

    // Cắt tại byte 1 — giữa chữ "Đ", vốn là hai byte 0xC4 0x90.
    const framer = new LineFramer("\n");
    framer.push(bytes.subarray(0, 1));
    framer.push(bytes.subarray(1, 5));
    const ketQua = framer.push(Buffer.concat([bytes.subarray(5), Buffer.from("\n")]));

    assert.deepEqual(ketQua, [cau]);

    // Và đây là cách SAI, để đối chứng: giải mã từng mảnh rồi mới nối.
    const sai =
      bytes.subarray(0, 1).toString("utf8") +
      bytes.subarray(1, 5).toString("utf8") +
      bytes.subarray(5).toString("utf8");
    assert.notEqual(sai, cau);
    assert.ok(sai.includes("�"), "cách sai phải sinh ra ký tự thay thế U+FFFD");
  });

  it("chặn client gửi mãi mà không có delimiter", () => {
    const framer = new LineFramer("\n", 16);
    assert.throws(() => framer.push(Buffer.alloc(32, 0x41)), /vượt quá 16 byte/);
    assert.equal(framer.pending, 0, "phải xả bộ đệm sau khi từ chối");
  });
});

// ===========================================================================
describe("LengthPrefixFramer — phân định bằng độ dài", () => {
  it("đóng gói rồi tách lại đúng nguyên văn", () => {
    const framer = new LengthPrefixFramer();
    const goi = LengthPrefixFramer.encode("Điều 12");
    assert.equal(goi.length, 4 + Buffer.byteLength("Điều 12", "utf8"));

    const ra = framer.push(goi);
    assert.equal(ra.length, 1);
    assert.equal(ra[0]?.toString("utf8"), "Điều 12");
  });

  it("chờ đủ thân trước khi trả về, kể cả khi phần độ dài bị cắt đôi", () => {
    const framer = new LengthPrefixFramer();
    const goi = LengthPrefixFramer.encode("xin chào");

    assert.deepEqual(framer.push(goi.subarray(0, 2)), []); // mới nửa phần độ dài
    assert.deepEqual(framer.push(goi.subarray(2, 6)), []); // đủ độ dài, thiếu thân
    const ra = framer.push(goi.subarray(6));
    assert.equal(ra[0]?.toString("utf8"), "xin chào");
  });

  it("thân chứa được cả ký tự xuống dòng — thứ delimiter không làm được", () => {
    const framer = new LengthPrefixFramer();
    const noiDung = "dòng 1\ndòng 2\ndòng 3";
    const ra = framer.push(LengthPrefixFramer.encode(noiDung));
    assert.equal(ra[0]?.toString("utf8"), noiDung);
  });
});

// ===========================================================================
describe("HTTP server tự viết", () => {
  let server: net.Server;
  let port: number;

  before(async () => {
    server = createHttpServer();
    await new Promise<void>((resolve) => {
      // Cổng 0: để hệ điều hành cấp cổng trống, không đụng 8080 nếu đang chạy thật.
      server.listen(0, "127.0.0.1", resolve);
    });
    port = (server.address() as net.AddressInfo).port;
  });

  after(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  /** Gửi từng mảnh byte thô, chờ đến khi nhận đủ theo Content-Length. */
  function guiTho(manh: Buffer[], delayMs = 20): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const socket = net.createConnection({ host: "127.0.0.1", port });
      let nhan = Buffer.alloc(0);

      socket.on("data", (chunk) => {
        nhan = Buffer.concat([nhan, chunk]);
        // Bên nhận cũng phải ghép khung: đọc Content-Length rồi chờ đủ thân.
        const het = nhan.indexOf("\r\n\r\n");
        if (het === -1) return;
        const header = nhan.subarray(0, het).toString("ascii");
        const khop = /content-length:\s*(\d+)/i.exec(header);
        const canThem = khop?.[1] ? Number(khop[1]) : 0;
        if (nhan.length >= het + 4 + canThem) {
          socket.end();
          resolve(nhan);
        }
      });

      socket.on("error", reject);
      socket.setTimeout(5000, () => {
        socket.destroy();
        reject(new Error("hết thời gian chờ phản hồi"));
      });

      socket.on("connect", async () => {
        for (const m of manh) {
          socket.write(m);
          await new Promise((r) => setTimeout(r, delayMs));
        }
      });
    });
  }

  function tachPhanHoi(raw: Buffer) {
    const het = raw.indexOf("\r\n\r\n");
    const header = raw.subarray(0, het).toString("ascii");
    const body = raw.subarray(het + 4);
    const status = Number(header.split("\r\n")[0]?.split(" ")[1]);
    const contentLength = Number(/content-length:\s*(\d+)/i.exec(header)?.[1]);
    return { status, contentLength, header, body };
  }

  it("ghép đúng một request bị cắt làm ba, ngay giữa tên header và giữa thân JSON", async () => {
    const body = '{"q":"Điều 12"}';
    const soByte = Buffer.byteLength(body, "utf8");
    const raw =
      `POST /echo HTTP/1.1\r\n` +
      `Host: localhost\r\n` +
      `Content-Type: application/json\r\n` +
      `Content-Length: ${soByte}\r\n` +
      `\r\n` +
      body;
    const bytes = Buffer.from(raw, "utf8");

    // Cắt 1: giữa tên header "Content-Length" — sau "Content-Len".
    const cat1 = bytes.indexOf(Buffer.from("Content-Length")) + 11;
    // Cắt 2: giữa thân JSON, sau '{"quest'-tương đương ở đây là sau vài byte thân.
    const cat2 = bytes.length - soByte + 7;

    const phanHoi = tachPhanHoi(
      await guiTho([bytes.subarray(0, cat1), bytes.subarray(cat1, cat2), bytes.subarray(cat2)]),
    );

    assert.equal(phanHoi.status, 200, "server phải tích lũy đủ rồi mới xử lý");
    const json = JSON.parse(phanHoi.body.toString("utf8"));
    assert.equal(json.received, body, "thân phải nguyên vẹn dù bị cắt giữa chừng");
    assert.equal(json.soByte, soByte);
  });

  it("khai Content-Length bằng số BYTE, không phải số ký tự", async () => {
    const raw = Buffer.from("GET / HTTP/1.1\r\nHost: localhost\r\n\r\n", "ascii");
    const phanHoi = tachPhanHoi(await guiTho([raw]));

    assert.equal(phanHoi.status, 200);
    // Điều kiện cốt lõi: số khai báo phải bằng đúng số byte thân nhận được.
    assert.equal(
      phanHoi.contentLength,
      phanHoi.body.length,
      "Content-Length lệch với số byte thật",
    );

    // Và với thân có tiếng Việt, số byte phải LỚN HƠN số ký tự — nếu bằng nhau
    // thì test này vô nghĩa vì thân chỉ toàn ASCII.
    const text = phanHoi.body.toString("utf8");
    assert.ok(
      Buffer.byteLength(text, "utf8") > text.length,
      "thân phải chứa ký tự nhiều byte thì phép kiểm mới có ý nghĩa",
    );
  });

  it("phục vụ hai request liên tiếp trên cùng một kết nối (keep-alive)", async () => {
    const req = (path: string) =>
      Buffer.from(`GET ${path} HTTP/1.1\r\nHost: localhost\r\n\r\n`, "ascii");

    const raw = await new Promise<Buffer>((resolve, reject) => {
      const socket = net.createConnection({ host: "127.0.0.1", port });
      let nhan = Buffer.alloc(0);
      let soLan = 0;
      socket.on("data", (chunk) => {
        nhan = Buffer.concat([nhan, chunk]);
        soLan = (nhan.toString("latin1").match(/HTTP\/1\.1 200/g) ?? []).length;
        if (soLan >= 2) {
          socket.end();
          resolve(nhan);
        }
      });
      socket.on("error", reject);
      socket.setTimeout(5000, () => {
        socket.destroy();
        reject(new Error("hết giờ chờ request thứ hai"));
      });
      socket.on("connect", async () => {
        socket.write(req("/health"));
        await new Promise((r) => setTimeout(r, 50));
        socket.write(req("/health"));
      });
    });

    const soPhanHoi = (raw.toString("latin1").match(/HTTP\/1\.1 200/g) ?? []).length;
    assert.equal(soPhanHoi, 2, "kết nối phải được giữ lại cho request thứ hai");
  });

  it("xử lý hai request dính liền trong MỘT lần ghi", async () => {
    const hai = Buffer.from(
      "GET /health HTTP/1.1\r\nHost: x\r\n\r\nGET /health HTTP/1.1\r\nHost: x\r\n\r\n",
      "ascii",
    );
    const raw = await new Promise<Buffer>((resolve, reject) => {
      const socket = net.createConnection({ host: "127.0.0.1", port });
      let nhan = Buffer.alloc(0);
      socket.on("data", (chunk) => {
        nhan = Buffer.concat([nhan, chunk]);
        if ((nhan.toString("latin1").match(/HTTP\/1\.1 200/g) ?? []).length >= 2) {
          socket.end();
          resolve(nhan);
        }
      });
      socket.on("error", reject);
      socket.setTimeout(5000, () => {
        socket.destroy();
        reject(new Error("chỉ nhận được một phản hồi"));
      });
      socket.on("connect", () => socket.write(hai));
    });

    assert.equal((raw.toString("latin1").match(/HTTP\/1\.1 200/g) ?? []).length, 2);
  });

  it("trả 404 cho đường dẫn lạ và 405 cho phương thức sai", async () => {
    const r404 = tachPhanHoi(
      await guiTho([Buffer.from("GET /khong-co HTTP/1.1\r\nHost: x\r\n\r\n", "ascii")]),
    );
    assert.equal(r404.status, 404);

    const r405 = tachPhanHoi(
      await guiTho([Buffer.from("GET /echo HTTP/1.1\r\nHost: x\r\n\r\n", "ascii")]),
    );
    assert.equal(r405.status, 405);
  });

  it("trả 400 khi request line sai khuôn", async () => {
    const r = tachPhanHoi(await guiTho([Buffer.from("KHONG PHAI HTTP\r\n\r\n", "ascii")]));
    assert.equal(r.status, 400);
  });

  it("trả 411 khi POST không khai Content-Length", async () => {
    const r = tachPhanHoi(
      await guiTho([Buffer.from("POST /echo HTTP/1.1\r\nHost: x\r\n\r\n", "ascii")]),
    );
    assert.equal(r.status, 411);
  });

  it("đọc được tên header viết hoa thường tùy ý", async () => {
    const body = '{"q":"x"}';
    const raw =
      `POST /echo HTTP/1.1\r\nHost: x\r\n` +
      `CONTENT-LENGTH: ${Buffer.byteLength(body)}\r\n\r\n${body}`;
    const r = tachPhanHoi(await guiTho([Buffer.from(raw, "utf8")]));
    assert.equal(r.status, 200, "tên header không phân biệt hoa thường (RFC 9110)");
  });
});

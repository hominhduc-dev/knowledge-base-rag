// ---------------------------------------------------------------------------
// Message framing — phần lõi của module netlab.
//
// TCP LÀ LUỒNG BYTE, KHÔNG PHẢI LUỒNG THÔNG ĐIỆP.
//
// Một lần `write()` bên gửi KHÔNG tương ứng một lần sự kiện `data` bên nhận.
// Tùy MTU, độ trễ và bộ đệm hệ điều hành, dữ liệu có thể bị chia nhỏ hoặc dính
// vào nhau. Đọc một lần rồi coi như đã nhận đủ là SAI — dù trên localhost với
// thông điệp ngắn thì vẫn "chạy được", và đó chính là lý do lỗi này sống sót qua
// mọi lần thử tay rồi mới lộ ra khi chạy thật.
//
// Có hai cách phân định ranh giới thông điệp:
//
//   Delimiter    — kết thúc bằng ký tự đặc biệt. Lớp `LineFramer` dưới đây.
//   Length-prefix — ghi trước độ dài phần thân. Lớp `LengthPrefixFramer`.
//
// HTTP dùng CẢ HAI: `\r\n\r\n` phân tách header khỏi body (delimiter), rồi
// `Content-Length` cho biết body dài bao nhiêu (length-prefix). Nhận ra điều này
// là hiểu được vì sao giao thức được thiết kế như vậy — xem `http-server.ts`.
// ---------------------------------------------------------------------------

/**
 * Vì sao tích lũy bằng `Buffer` chứ không phải chuỗi.
 *
 * Cách viết sai hay gặp:
 *
 *     let buf = "";
 *     socket.on("data", (d) => { buf += d.toString(); ... });
 *
 * Một ký tự tiếng Việt có dấu chiếm 2–3 byte UTF-8. Nếu ranh giới gói TCP rơi
 * vào GIỮA các byte của một ký tự, `d.toString()` giải mã nửa ký tự đó thành
 * U+FFFD và **phần còn lại không bao giờ ghép lại được nữa** — dữ liệu hỏng vĩnh
 * viễn ngay ở dòng đầu tiên, trước khi bất kỳ logic nào chạy.
 *
 * Cách đúng: giữ nguyên byte, chỉ giải mã SAU KHI đã cắt được một thông điệp
 * hoàn chỉnh. Đây cũng là lý do `Content-Length` phải tính bằng byte.
 */
export class LineFramer {
  private buffer: Buffer = Buffer.alloc(0);
  private readonly delimiter: Buffer;
  private readonly maxMessageBytes: number;

  /**
   * @param delimiter ký tự phân tách, mặc định `\n`
   * @param maxMessageBytes trần an toàn. Không có nó thì một client chỉ cần gửi
   *   byte liên tục mà không bao giờ gửi delimiter là bộ đệm phình đến hết RAM —
   *   một client làm sập cả server.
   */
  constructor(delimiter = "\n", maxMessageBytes = 1024 * 1024) {
    this.delimiter = Buffer.from(delimiter, "utf8");
    this.maxMessageBytes = maxMessageBytes;
  }

  /**
   * Nạp một mảnh vừa nhận, trả về những thông điệp ĐÃ hoàn chỉnh.
   *
   * Trả mảng chứ không phải một giá trị: một sự kiện `data` có thể chứa 0 thông
   * điệp (mới được nửa cái), hoặc nhiều thông điệp dính liền nhau.
   */
  push(chunk: Buffer): string[] {
    this.buffer = Buffer.concat([this.buffer, chunk]);

    if (this.buffer.length > this.maxMessageBytes) {
      this.buffer = Buffer.alloc(0);
      throw new Error(
        `Thông điệp vượt quá ${this.maxMessageBytes} byte mà chưa thấy dấu phân tách`,
      );
    }

    const messages: string[] = [];
    let start = 0;

    for (;;) {
      const index = this.buffer.indexOf(this.delimiter, start);
      if (index === -1) break;
      // Chỉ tới đây, khi đã chắc chắn có trọn một thông điệp, mới giải mã UTF-8.
      messages.push(this.buffer.subarray(start, index).toString("utf8"));
      start = index + this.delimiter.length;
    }

    // Giữ lại phần đuôi chưa đủ, chờ mảnh sau.
    this.buffer = this.buffer.subarray(start);
    return messages;
  }

  /** Số byte đang chờ ghép. Dùng để khẳng định trong test. */
  get pending(): number {
    return this.buffer.length;
  }

  reset(): void {
    this.buffer = Buffer.alloc(0);
  }
}

/**
 * Cách thứ hai: ghi trước độ dài. Bốn byte big-endian, rồi đúng ngần ấy byte thân.
 *
 * So với delimiter: không phải quét tìm ký tự, và thân thông điệp chứa được mọi
 * byte kể cả `\n` mà không cần thoát. Đổi lại phải biết độ dài trước khi gửi.
 * Đưa vào đây để báo cáo so sánh được hai cách trên cùng một mã nguồn.
 */
export class LengthPrefixFramer {
  private buffer: Buffer = Buffer.alloc(0);
  private readonly maxMessageBytes: number;

  constructor(maxMessageBytes = 1024 * 1024) {
    this.maxMessageBytes = maxMessageBytes;
  }

  push(chunk: Buffer): Buffer[] {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    const messages: Buffer[] = [];

    for (;;) {
      // Chưa đủ 4 byte để biết độ dài thì chờ tiếp.
      if (this.buffer.length < 4) break;

      const length = this.buffer.readUInt32BE(0);
      if (length > this.maxMessageBytes) {
        this.buffer = Buffer.alloc(0);
        throw new Error(`Độ dài khai báo ${length} byte vượt trần cho phép`);
      }

      // Đã biết độ dài nhưng thân chưa về đủ.
      if (this.buffer.length < 4 + length) break;

      messages.push(this.buffer.subarray(4, 4 + length));
      this.buffer = this.buffer.subarray(4 + length);
    }

    return messages;
  }

  /** Đóng gói một thông điệp để gửi đi: 4 byte độ dài rồi tới thân. */
  static encode(payload: string | Buffer): Buffer {
    const body = Buffer.isBuffer(payload) ? payload : Buffer.from(payload, "utf8");
    const header = Buffer.alloc(4);
    // Độ dài tính bằng BYTE, không phải số ký tự — cùng một cái bẫy như
    // Content-Length của HTTP.
    header.writeUInt32BE(body.length, 0);
    return Buffer.concat([header, body]);
  }

  get pending(): number {
    return this.buffer.length;
  }
}

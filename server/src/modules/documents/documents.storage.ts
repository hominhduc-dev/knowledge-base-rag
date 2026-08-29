// ---------------------------------------------------------------------------
// Lưu tệp gốc trên đĩa, trong volume `uploads` của Docker.
//
// KHÔNG phục vụ thư mục này qua Caddy. Backend phải kiểm phạm vi rồi mới truyền
// nội dung — để Caddy phục vụ tĩnh là bỏ qua toàn bộ kiểm soát, và đoán được
// đường dẫn là đọc được tài liệu đơn vị khác.
// ---------------------------------------------------------------------------
import { createHash } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { env } from "../../config/env.js";
import { notFound } from "../../lib/errors.js";

export const sha256 = (buffer: Buffer): string =>
  createHash("sha256").update(buffer).digest("hex");

/**
 * Đường dẫn tương đối của tệp, dựng từ băm nội dung.
 *
 * Dùng băm chứ không dùng tên tệp người dùng đặt, vì hai lý do. Thứ nhất, tên
 * tệp là dữ liệu người dùng cung cấp: `../../etc/passwd` hay ký tự lạ của
 * Windows đều là chuyện có thật. Thứ hai, `documents.file_hash` đã UNIQUE nên
 * hai tài liệu trùng nội dung chỉ chiếm một tệp.
 *
 * Chia hai cấp thư mục theo hai ký tự đầu để không dồn hàng nghìn tệp vào một
 * thư mục — thao tác liệt kê trên thư mục lớn rất chậm.
 */
export function duongDanLuu(fileHash: string, sourceType: string): string {
  const duoi = sourceType === "DOCX" ? "docx" : "pdf";
  return path.posix.join(fileHash.slice(0, 2), fileHash.slice(2, 4), `${fileHash}.${duoi}`);
}

function duongDanTuyetDoi(relative: string): string {
  const goc = path.resolve(env.UPLOAD_DIR);
  const day = path.resolve(goc, relative);

  // Chốt chặn cuối cùng chống thoát thư mục. `duongDanLuu` chỉ sinh ra băm hex
  // nên không thể chứa `..`, nhưng đường dẫn cũng đến từ cột `file_path` trong
  // CSDL — kiểm ở đây là kiểm cả trường hợp dữ liệu đó bị sửa.
  if (day !== goc && !day.startsWith(goc + path.sep)) {
    throw new Error(`Đường dẫn tệp thoát khỏi thư mục lưu trữ: ${relative}`);
  }
  return day;
}

export async function luuTep(buffer: Buffer, relative: string): Promise<void> {
  const day = duongDanTuyetDoi(relative);
  await mkdir(path.dirname(day), { recursive: true });
  await writeFile(day, buffer);
}

export async function docTep(relative: string): Promise<Buffer> {
  try {
    return await readFile(duongDanTuyetDoi(relative));
  } catch {
    // Bản ghi còn trong CSDL nhưng tệp đã mất — volume bị xóa, hoặc khôi phục
    // CSDL mà không khôi phục volume.
    throw notFound("Không tìm thấy tệp gốc của tài liệu này trên máy chủ.");
  }
}

export async function xoaTep(relative: string): Promise<void> {
  try {
    await unlink(duongDanTuyetDoi(relative));
  } catch {
    // Tệp đã không còn thì coi như xóa xong. Ném lỗi ở đây sẽ chặn việc xóa bản
    // ghi trong CSDL, để lại một tài liệu không xóa được.
  }
}

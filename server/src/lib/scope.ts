// ---------------------------------------------------------------------------
// QUY TẮC PHẠM VI — CHỈ ĐƯỢC VIẾT Ở FILE NÀY.
//
// Mọi truy vấn chạm tới `documents` hoặc `chunks` đều phải lấy điều kiện lọc từ
// đây. Viết lại quy tắc ở chỗ khác là tạo ra một bản sao sẽ lệch đi theo thời
// gian, và bản lệch đó chính là chỗ rò rỉ.
//
// Ba ràng buộc bắt buộc, lấy từ docs/phan-quyen.md:
//
//   1. Bộ lọc nằm trong `WHERE`, chạy TRƯỚC khi xếp hạng. Lấy top-k rồi mới lọc
//      thì kết quả có thể RỖNG dù dữ liệu tồn tại — lỗi im lặng. Đây là lý do
//      `department_id` được lặp xuống bảng `chunks`.
//
//   2. KHÔNG kiểm phạm vi ở controller. Kiểm ở controller rồi truy vấn không lọc
//      thì bộ kiểm thử chống rò rỉ vẫn đỏ, vì nó gọi thẳng tầng truy vấn.
//
//   3. Nhánh ADMIN là một nhánh RIÊNG BIỆT, không phải `OR role = 'ADMIN'` nhét
//      chung vào biểu thức. Viết chung là chỗ dễ vô tình mở quyền cho vai khác
//      nhất, và cũng khó đọc nhất khi rà soát.
// ---------------------------------------------------------------------------
import { Prisma } from "@prisma/client";
import type { AuthenticatedUser } from "../types/express.js";

/** Mức hiển thị tối đa mà người dùng thường đọc được. Dự phòng mở rộng. */
export const MAX_VISIBILITY = 1;

/**
 * Người dùng này được đọc tài liệu của những đơn vị nào.
 *
 * ADMIN trả `null` — nghĩa là KHÔNG giới hạn, chứ không phải "không đơn vị nào".
 * Chỗ dùng phải phân biệt được hai nghĩa đó; trả mảng rỗng cho ADMIN sẽ khiến
 * họ không thấy gì cả.
 */
export function scopeOf(user: AuthenticatedUser): string[] | null {
  return user.role === "ADMIN" ? null : user.departmentIds;
}

/**
 * Điều kiện lọc cho Prisma, dùng với `documents` và `chunks` — hai bảng đều có
 * cặp cột `departmentId` + `visibility`.
 *
 * `departmentId: null` nghĩa là tài liệu TOÀN TRƯỜNG, ai cũng đọc được.
 */
export function scopeWhere(user: AuthenticatedUser): Prisma.DocumentWhereInput {
  const departmentIds = scopeOf(user);

  // Nhánh ADMIN, tách hẳn ra: không thêm điều kiện phạm vi nào.
  if (departmentIds === null) return {};

  return {
    visibility: { lte: MAX_VISIBILITY },
    OR: [
      { departmentId: null }, // toàn trường
      { departmentId: { in: departmentIds } }, // đơn vị của chính mình
    ],
  };
}

/**
 * Cùng quy tắc trên, nhưng dưới dạng mảnh SQL để ghép vào truy vấn tìm kiếm lai.
 *
 * Truy hồi không dùng Prisma được vì cần toán tử `<=>` của pgvector và `ts_rank`,
 * nên phải có bản SQL. Hai bản này BẮT BUỘC phải cùng nghĩa — sửa một cái thì
 * sửa cả cái kia, và `tests/scope-isolation.test.ts` chạy qua cả hai đường.
 *
 * Dùng `Prisma.sql` chứ không nối chuỗi: tham số đi qua placeholder nên không
 * có đường nào để chèn SQL.
 */
export function scopeSql(user: AuthenticatedUser, alias = "c"): Prisma.Sql {
  const departmentIds = scopeOf(user);
  const cot = Prisma.raw(`"${alias}"`);

  // Nhánh ADMIN: điều kiện luôn đúng. Viết `TRUE` thay vì bỏ trống để chỗ gọi
  // ghép chuỗi `WHERE ... AND ...` không phải xử lý trường hợp rỗng.
  if (departmentIds === null) return Prisma.sql`TRUE`;

  // Mảng rỗng: người dùng chưa được gán đơn vị nào. Vẫn đọc được tài liệu toàn
  // trường. `= ANY('{}')` luôn sai nên nhánh thứ hai tự vô hiệu, không cần
  // trường hợp riêng.
  return Prisma.sql`(
    ${cot}."visibility" <= ${MAX_VISIBILITY}
    AND (
      ${cot}."department_id" IS NULL
      OR ${cot}."department_id" = ANY(${departmentIds}::uuid[])
    )
  )`;
}

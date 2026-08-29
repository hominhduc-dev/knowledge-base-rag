// ---------------------------------------------------------------------------
// Ma trận phân quyền — hằng số, KHÔNG phải dữ liệu giả.
//
// Đây là bản dịch trực tiếp của bảng ở `docs/phan-quyen.md` mục 3. Sửa một bên
// thì phải sửa cả bên kia, và sửa cả `server/src/middleware/role.middleware.ts`.
//
// Không có endpoint nào trả bảng này: nó là hằng số, không phải dữ liệu. Gọi API
// để lấy một thứ không bao giờ đổi là thêm một điểm hỏng mà không được gì.
//
// Vì sao nằm ở đây chứ không ở `lib/mock-data.ts`: mọi thứ trong file đó rồi sẽ
// bị xóa khi các endpoint tương ứng xong. Bảng này thì không — nó ở lại.
//
// TODO: khi dựng `packages/shared/` thì chuyển sang đó để máy chủ dùng chung một
// định nghĩa, đúng như phụ lục A đã chốt.
// ---------------------------------------------------------------------------

export type RoleCode = "STUDENT" | "ADMIN";

/** Thứ tự cột trên bảng. Nhãn phải khớp `ROLE_LABEL` ở `server/src/lib/roles.ts`. */
export const ROLE_COLUMNS: { code: RoleCode; label: string }[] = [
  { code: "STUDENT", label: "Sinh viên" },
  { code: "ADMIN", label: "Quản trị viên" },
];

export type PermissionRow = {
  /** Mô tả chức năng, hiển thị ở cột đầu. */
  name: string;
  /** Những vai được phép. Không có tên trong đây là không có quyền. */
  allowed: RoleCode[];
};

export const PERMISSIONS: PermissionRow[] = [
  { name: "Hỏi đáp trong phạm vi của mình", allowed: ["STUDENT", "ADMIN"] },
  { name: "Xem danh sách tài liệu trong phạm vi", allowed: ["STUDENT", "ADMIN"] },
  { name: "Mở file gốc của tài liệu", allowed: ["STUDENT", "ADMIN"] },
  { name: "Đổi mật khẩu của chính mình", allowed: ["STUDENT", "ADMIN"] },
  { name: "Tải lên · sửa · gỡ tài liệu", allowed: ["ADMIN"] },
  { name: "Chạy lại job xử lý thất bại", allowed: ["ADMIN"] },
  { name: "Xem và quản lý người dùng", allowed: ["ADMIN"] },
  { name: "Tạo · sửa đơn vị, gán thành viên", allowed: ["ADMIN"] },
  { name: "Chạy bộ đánh giá, xem kết quả đo", allowed: ["ADMIN"] },
];

export function coQuyen(row: PermissionRow, role: RoleCode): boolean {
  return row.allowed.includes(role);
}

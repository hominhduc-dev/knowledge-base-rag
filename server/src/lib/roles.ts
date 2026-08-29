// ---------------------------------------------------------------------------
// Vai trò — hiện thực mục 4 của TONG-QUAN-DU-AN.md và mục 3.3 của thiết kế.
//
// HAI vai, không thêm vai thứ ba. Bảy chức danh thật trong trường chỉ tạo ra hai
// mức quyền khác nhau; thêm vai là phình phạm vi giữa kỳ.
//
// Câu phải thuộc khi bảo vệ:
//   VAI quyết định LÀM ĐƯỢC GÌ · ĐƠN VỊ quyết định THẤY ĐƯỢC GÌ.
//
// Hai sinh viên cùng vai STUDENT nhưng khác khoa vẫn nhận hai tập kết quả khác
// nhau, vì phạm vi lấy từ `department_members` chứ không từ cột `role`. Tách hai
// trục này để thêm vai mới sau này không phải sửa câu truy vấn truy hồi — quy
// tắc phạm vi nằm trọn trong `lib/scope.ts`.
// ---------------------------------------------------------------------------
import { MemberRole } from "@prisma/client";

/**
 * Vai hiệu dụng của một người trên toàn hệ thống.
 *
 * Vai gắn với TỪNG dòng `department_members`, nên một người có thể là ADMIN ở
 * phòng ban mình và STUDENT ở nơi khác. Quy tắc: hễ có MỘT tư cách ADMIN thì
 * hiệu dụng là ADMIN.
 *
 * Không có tư cách nào thì trả STUDENT — mặc định là mức quyền THẤP NHẤT. Mặc
 * định mở là kiểu lỗi mà không ai phát hiện cho tới khi đã muộn.
 */
export function effectiveRole(roles: readonly MemberRole[]): MemberRole {
  return roles.includes(MemberRole.ADMIN) ? MemberRole.ADMIN : MemberRole.STUDENT;
}

/** Nhãn hiển thị. Frontend nhận sẵn chuỗi này ở `role`, `roleCode` giữ mã gốc. */
export const ROLE_LABEL: Record<MemberRole, string> = {
  STUDENT: "Sinh viên",
  ADMIN: "Quản trị viên",
};

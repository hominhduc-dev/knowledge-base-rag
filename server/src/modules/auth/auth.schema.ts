// ---------------------------------------------------------------------------
// Zod cho /auth/* — docs/api-contract.md mục 3.
// ---------------------------------------------------------------------------
import { z } from "zod";

/** Độ dài tối thiểu của mật khẩu mới. Contract mục 3: dưới 8 thì 422. */
export const MIN_PASSWORD_LENGTH = 8;

export const loginSchema = z.object({
  // Một ô nhập duy nhất, nhận MSSV hoặc email trường. Không validate khuôn
  // email ở đây: `2351220193` là giá trị hợp lệ.
  // `error` (zod 4) phủ cả trường hợp thiếu hẳn lẫn sai kiểu — nếu chỉ đặt
  // thông báo ở `.min(1)` thì body rỗng sẽ trả về câu tiếng Anh mặc định.
  account: z
    .string({ error: "Vui lòng nhập tài khoản trường" })
    .trim()
    .min(1, "Vui lòng nhập tài khoản trường")
    .max(255, "Tài khoản không được quá 255 ký tự"),
  // Không áp chính sách độ dài lúc đăng nhập — mật khẩu cũ có thể ngắn hơn
  // chính sách hiện hành, và báo "mật khẩu quá ngắn" là tiết lộ nó sai ở đâu.
  password: z.string({ error: "Vui lòng nhập mật khẩu" }).min(1, "Vui lòng nhập mật khẩu"),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string({ error: "Vui lòng nhập mật khẩu hiện tại" })
      .min(1, "Vui lòng nhập mật khẩu hiện tại"),
    newPassword: z
      .string({ error: "Vui lòng nhập mật khẩu mới" })
      .min(MIN_PASSWORD_LENGTH, `Mật khẩu mới phải có ít nhất ${MIN_PASSWORD_LENGTH} ký tự`)
      .max(72, "Mật khẩu không được quá 72 ký tự"), // bcrypt cắt cụt sau byte thứ 72
  })
  .refine((body) => body.currentPassword !== body.newPassword, {
    message: "Mật khẩu mới phải khác mật khẩu hiện tại",
    path: ["newPassword"],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

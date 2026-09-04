// ---------------------------------------------------------------------------
// Zod cho /chat và /conversations — docs/api-contract.md mục 5.
// ---------------------------------------------------------------------------
import { z } from "zod";

export const askSchema = z.object({
  question: z
    .string({ error: "Vui lòng nhập câu hỏi" })
    .trim()
    .min(3, "Câu hỏi phải có ít nhất 3 ký tự")
    .max(500, "Câu hỏi không được quá 500 ký tự"),
  // `null` được chấp nhận vì frontend gửi thẳng state chưa có hội thoại nào.
  conversationId: z.uuid("Mã hội thoại không hợp lệ").nullish(),
});

export const conversationIdParam = z.object({
  id: z.uuid("Mã hội thoại không hợp lệ"),
});

export type AskInput = z.infer<typeof askSchema>;

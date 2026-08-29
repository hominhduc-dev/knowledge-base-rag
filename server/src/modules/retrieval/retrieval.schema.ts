// ---------------------------------------------------------------------------
// Zod cho POST /search — docs/api-contract.md mục 6.
// ---------------------------------------------------------------------------
import { z } from "zod";

export const searchSchema = z.object({
  query: z
    .string({ error: "Vui lòng nhập câu truy vấn" })
    .trim()
    .min(3, "Câu truy vấn phải có ít nhất 3 ký tự")
    .max(500, "Câu truy vấn không được quá 500 ký tự"),
  // Trần 20 để một request không kéo về cả bảng chunks khi truy hồi thật vào.
  topK: z.coerce
    .number({ error: "topK phải là số" })
    .int("topK phải là số nguyên")
    .min(1, "topK phải từ 1 trở lên")
    .max(20, "topK tối đa là 20")
    .optional(),
});

export type SearchInput = z.infer<typeof searchSchema>;

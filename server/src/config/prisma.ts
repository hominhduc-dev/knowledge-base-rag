// ---------------------------------------------------------------------------
// PrismaClient singleton.
//
// Một tiến trình = một client. Tạo nhiều client là tạo nhiều connection pool
// chồng lên nhau, và transaction pooler của Supabase sẽ hết slot rất nhanh.
//
// URL lấy thẳng từ `datasource db` trong schema.prisma (env DATABASE_URL) —
// không truyền lại ở đây để tránh hai nguồn sự thật lệch nhau.
// ---------------------------------------------------------------------------
import { PrismaClient } from "@prisma/client";
import { isProduction } from "./env.js";

// Ở chế độ dev, tsx watch nạp lại module nhưng không tạo tiến trình mới —
// giữ client trên globalThis để lần nạp sau dùng lại đúng pool cũ.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: isProduction ? ["warn", "error"] : ["query", "warn", "error"],
  });

if (!isProduction) globalForPrisma.prisma = prisma;

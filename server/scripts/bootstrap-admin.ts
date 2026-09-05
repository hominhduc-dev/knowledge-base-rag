import { prisma } from "../src/config/prisma.js";
import { PROGRAM_CODE } from "../src/lib/roles.js";

/** Sau migration, chỉ định quản trị đầu tiên; mặc định chỉ xem kế hoạch. */
async function main() {
  const args = process.argv.slice(2);
  const code = args.find((arg) => arg.startsWith("--code="))?.slice(7).trim().toUpperCase();
  if (!code || args.some((arg) => arg !== "--apply" && !arg.startsWith("--code="))) {
    throw new Error("Dùng: tsx --env-file=.env scripts/bootstrap-admin.ts --code=MA_CAN_BO [--apply]");
  }
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(731050901)`;
    const existing = await tx.user.findFirst({
      where: { isActive: true, memberships: { some: { department: { code: PROGRAM_CODE }, role: "SYSTEM_ADMIN" } } },
      select: { id: true },
    });
    if (existing) throw new Error("Đã có quản trị hệ thống hoạt động. Hãy phân quyền qua ứng dụng.");
    const target = await tx.user.findFirst({
      where: { code, isActive: true, memberships: { some: { role: "CONTENT_ADMIN" } } },
      select: { id: true, code: true },
    });
    if (!target) throw new Error("Cần chỉ định một tài khoản quản trị cũ còn hoạt động.");
    const department = await tx.department.findUniqueOrThrow({ where: { code: PROGRAM_CODE }, select: { id: true } });
    if (!args.includes("--apply")) {
      console.log(`Kế hoạch: gán ${target.code} vai SYSTEM_ADMIN trong CNTT. Chưa thay đổi dữ liệu; thêm --apply để thực hiện.`);
      return;
    }
    await tx.departmentMember.upsert({
      where: { userId_departmentId: { userId: target.id, departmentId: department.id } },
      update: { role: "SYSTEM_ADMIN" },
      create: { userId: target.id, departmentId: department.id, role: "SYSTEM_ADMIN" },
    });
    console.log(`Đã gán ${target.code} làm quản trị hệ thống CNTT.`);
  });
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Không thể bootstrap quản trị.");
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());

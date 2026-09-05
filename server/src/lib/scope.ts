import { Prisma } from "@prisma/client";
import type { AuthenticatedUser } from "../types/express.js";
import { PROGRAM_CODE, canManageContent } from "./roles.js";

export const MAX_VISIBILITY = 1;

/** Một ngành duy nhất. Vai quản trị không mở rộng kho sang các khoa khác. */
export function scopeOf(user: AuthenticatedUser): string[] {
  return user.departments.filter((d) => d.code === PROGRAM_CODE).map((d) => d.id);
}

export function scopeWhere(user: AuthenticatedUser): Prisma.DocumentWhereInput {
  return {
    visibility: { lte: MAX_VISIBILITY },
    OR: [
      { departmentId: null },
      { departmentId: { in: scopeOf(user) }, department: { code: PROGRAM_CODE } },
    ],
  };
}

/** Mọi truy vấn ghi cũng giữ bộ lọc để tránh truy cập bằng id của tài liệu cũ. */
export function documentWriteWhere(user: AuthenticatedUser): Prisma.DocumentWhereInput {
  return canManageContent(user.role) ? scopeWhere(user) : { id: { in: [] } };
}

export function scopeSql(user: AuthenticatedUser, alias = "c"): Prisma.Sql {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(alias)) throw new Error("Invalid SQL alias");
  const column = Prisma.raw(`"${alias}"`);
  return Prisma.sql`(
    ${column}."visibility" <= ${MAX_VISIBILITY}
    AND (
      ${column}."department_id" IS NULL
      OR (
        ${column}."department_id" = ANY(${scopeOf(user)}::uuid[])
        AND ${column}."department_id" IN (SELECT "id" FROM "departments" WHERE "code" = ${PROGRAM_CODE})
      )
    )
  )`;
}

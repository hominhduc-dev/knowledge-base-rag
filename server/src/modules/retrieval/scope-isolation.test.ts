import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import { after, before, describe, it } from "node:test";
import type { Server } from "node:http";
import bcrypt from "bcryptjs";
import { MemberRole } from "@prisma/client";
import { prisma } from "../../config/prisma.js";
import { createApp } from "../../app.js";
import { scopeSql, scopeWhere } from "../../lib/scope.js";
import { effectiveRole } from "../../lib/roles.js";
import { signToken } from "../../middleware/auth.middleware.js";
import type { AuthenticatedUser } from "../../types/express.js";
import * as documents from "../documents/documents.service.js";
import * as admin from "../admin/admin.service.js";
import { login } from "../auth/auth.service.js";

// Fixture có ghi dữ liệu: chỉ chạy trong DB thử nghiệm riêng.
const isolated = new URL(process.env.DATABASE_URL ?? "postgresql://localhost/none").pathname.startsWith("/tangthu_cntt_test_");
describe("CNTT — ba vai, quyền tài liệu và quyền tài khoản", { skip: !isolated }, () => {
  const tag = randomUUID().slice(0, 8);
  const users = {} as Record<MemberRole, AuthenticatedUser>;
  let outsideUser: AuthenticatedUser;
  let outsideId: string;
  let departmentId: string;
  let docIds: string[] = [];
  let accountIds: string[] = [];
  let server: Server;
  let base: string;
  const hash = (s: string) => createHash("sha256").update(s).digest("hex");
  const hasCode = (code: string) => (error: unknown) => (error as { code?: string }).code === code;

  before(async () => {
    const dept = await prisma.department.findUniqueOrThrow({ where: { code: "CNTT" } });
    departmentId = dept.id;
    const outside = await prisma.department.create({ data: { code: `TEST_${tag}`, name: "Ngoài CNTT", type: "FACULTY" } });
    outsideId = outside.id;
    const passwordHash = await bcrypt.hash("Test-only-password-123", 4);
    async function makeUser(role: MemberRole, other = false): Promise<AuthenticatedUser> {
      const d = other ? outside : dept;
      const u = await prisma.user.create({ data: {
        email: `${tag}-${role}-${other}@test.invalid`.toLowerCase(), fullName: `Test ${role}`, passwordHash,
        memberships: { create: { departmentId: d.id, role } },
      } });
      accountIds.push(u.id);
      return { id: u.id, code: null, email: u.email, fullName: u.fullName, role,
        departments: [{ id: d.id, code: d.code, name: d.name, role }], departmentIds: [d.id] };
    }
    for (const role of Object.values(MemberRole)) users[role] = await makeUser(role);
    outsideUser = await makeUser(MemberRole.SYSTEM_ADMIN, true);
    for (const [index, id] of [null, departmentId, outsideId].entries()) {
      const doc = await prisma.document.create({ data: {
        title: `Fixture ${tag} ${index}`, departmentId: id, sourceType: "PDF", filePath: `fixture-${tag}.pdf`,
        fileHash: hash(`${tag}-${index}`), uploadedById: users.SYSTEM_ADMIN.id, status: "FAILED",
        chunks: { create: { chunkIndex: 0, content: `CNTT fixture ${index}`, contentHash: hash(`${tag}-chunk-${index}`),
          tokenCount: 4, visibility: 1, departmentId: id } },
      } });
      docIds.push(doc.id);
    }
    server = createApp().listen(0, "127.0.0.1");
    await new Promise<void>((resolve) => server.once("listening", resolve));
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    base = `http://127.0.0.1:${address.port}/api`;
  });
  after(async () => {
    if (server) await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    await prisma.document.deleteMany({ where: { id: { in: docIds } } });
    await prisma.user.deleteMany({ where: { id: { in: accountIds } } });
    if (outsideId) await prisma.department.delete({ where: { id: outsideId } });
    await prisma.$disconnect();
  });

  for (const role of Object.values(MemberRole)) {
    it(`${role}: Prisma và SQL chỉ trả CNTT + tài liệu chung`, async () => {
      const user = users[role];
      const orm = await prisma.document.findMany({ where: { id: { in: docIds }, AND: [scopeWhere(user)] }, select: { id: true } });
      const sql = await prisma.$queryRaw<{ document_id: string }[]>`SELECT c.document_id FROM chunks c WHERE ${scopeSql(user)} AND c.document_id = ANY(${docIds}::uuid[])`;
      const expected = docIds.slice(0, 2).sort();
      assert.deepEqual(orm.map((d) => d.id).sort(), expected);
      assert.deepEqual(sql.map((d) => d.document_id).sort(), expected);
    });
    it(`${role}: không mở hoặc sửa tài liệu ngoài ngành bằng id`, async () => {
      await assert.rejects(documents.getFile(docIds[2]!, users[role]), hasCode("FORBIDDEN_SCOPE"));
      await assert.rejects(documents.update(docIds[2]!, { title: "Không được sửa" }, users[role]),
        hasCode(role === "USER" ? "FORBIDDEN_ROLE" : "FORBIDDEN_SCOPE"));
    });
  }
  it("USER không thể upload, xóa hay retry qua service", async () => {
    await assert.rejects(documents.create({} as Express.Multer.File, "PDF", { title: "Forbidden" }, users.USER), hasCode("FORBIDDEN_ROLE"));
    await assert.rejects(documents.remove(docIds[0]!, users.USER), hasCode("FORBIDDEN_ROLE"));
    await assert.rejects(documents.retry(docIds[1]!, users.USER), hasCode("FORBIDDEN_ROLE"));
  });
  it("CONTENT_ADMIN sửa và retry được; không chuyển/tạo tài liệu sang khoa khác", async () => {
    const updated = await documents.update(docIds[1]!, { title: "Đã sửa bởi quản trị nội dung" }, users.CONTENT_ADMIN);
    assert.equal(updated.canEdit, true);
    assert.ok((await documents.retry(docIds[1]!, users.CONTENT_ADMIN)).jobId);
    await assert.rejects(documents.update(docIds[1]!, { departmentId: outsideId }, users.CONTENT_ADMIN), hasCode("FORBIDDEN_SCOPE"));
    await assert.rejects(documents.create({} as Express.Multer.File, "PDF", { title: "Outside", departmentId: outsideId }, users.SYSTEM_ADMIN), hasCode("FORBIDDEN_SCOPE"));
  });
  it("CONTENT_ADMIN không liệt kê tài khoản, khóa hay cấp quyền", async () => {
    await assert.rejects(admin.danhSachNguoiDung({ page: 1, pageSize: 10 }, users.CONTENT_ADMIN), hasCode("FORBIDDEN_ROLE"));
    await assert.rejects(admin.suaNguoiDung(users.USER.id, { isActive: false }, users.CONTENT_ADMIN), hasCode("FORBIDDEN_ROLE"));
    await assert.rejects(admin.ganThanhVien(departmentId, { userId: users.USER.id, roleCode: "SYSTEM_ADMIN" }, users.CONTENT_ADMIN), hasCode("FORBIDDEN_ROLE"));
  });
  it("SYSTEM_ADMIN chỉ thấy và quản lý tài khoản CNTT", async () => {
    const result = await admin.danhSachNguoiDung({ page: 1, pageSize: 100 }, users.SYSTEM_ADMIN);
    assert.ok(result.items.some((u) => u.id === users.USER.id));
    assert.ok(!result.items.some((u) => u.id === outsideUser.id));
    assert.ok(result.items.every((u) => u.memberships.every((m) => m.code === "CNTT")));
    await assert.rejects(admin.suaNguoiDung(outsideUser.id, { isActive: false }, users.SYSTEM_ADMIN), hasCode("NOT_FOUND"));
  });
  it("Không tự khóa hoặc tự hạ vai của quản trị hệ thống", async () => {
    await assert.rejects(admin.suaNguoiDung(users.SYSTEM_ADMIN.id, { isActive: false }, users.SYSTEM_ADMIN), hasCode("VALIDATION_ERROR"));
    await assert.rejects(admin.ganThanhVien(departmentId, { userId: users.SYSTEM_ADMIN.id, roleCode: "USER" }, users.SYSTEM_ADMIN), hasCode("VALIDATION_ERROR"));
  });
  it("Tài khoản ngoài ngành không đăng nhập được dù mang vai SYSTEM_ADMIN cũ", async () => {
    await assert.rejects(login({ account: outsideUser.email, password: "Test-only-password-123" }),
      (error: unknown) => hasCode("UNAUTHENTICATED")(error) && (error as Error).message.includes("CNTT"));
    const response = await fetch(`${base}/auth/me`, { headers: { Authorization: `Bearer ${signToken(outsideUser.id)}` } });
    assert.equal(response.status, 401);
  });
  it("Vai quản trị cũ ở khoa khác không nâng quyền của USER tại CNTT", async () => {
    await prisma.departmentMember.create({ data: { userId: users.USER.id, departmentId: outsideId, role: "SYSTEM_ADMIN" } });
    const session = await login({ account: users.USER.email, password: "Test-only-password-123" });
    assert.equal(session.user.roleCode, "USER");
    assert.deepEqual(session.memberships.map((m) => m.code), ["CNTT"]);
    const response = await fetch(`${base}/users`, { headers: { Authorization: `Bearer ${session.token}` } });
    assert.equal(response.status, 403);
  });
  it("HTTP cho phép nội dung sửa tài liệu, hệ thống xem tài khoản; USER bị chặn", async () => {
    const patch = (role: MemberRole) => fetch(`${base}/documents/${docIds[0]}`, {
      method: "PATCH", headers: { Authorization: `Bearer ${signToken(users[role].id)}`, "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Tài liệu chung đã kiểm qua HTTP" }),
    });
    assert.equal((await patch("USER")).status, 403);
    assert.equal((await patch("CONTENT_ADMIN")).status, 200);
    assert.equal((await fetch(`${base}/users`, { headers: { Authorization: `Bearer ${signToken(users.SYSTEM_ADMIN.id)}` } })).status, 200);
  });
  it("JWT còn hạn không giữ quyền cũ khi quản trị thay vai hoặc khóa tài khoản", async () => {
    const token = signToken(users.CONTENT_ADMIN.id);
    const headers = { Authorization: `Bearer ${token}` };
    assert.equal((await fetch(`${base}/users`, { headers })).status, 403);
    await admin.ganThanhVien(departmentId, { userId: users.CONTENT_ADMIN.id, roleCode: "USER" }, users.SYSTEM_ADMIN);
    assert.equal((await fetch(`${base}/documents`, { method: "POST", headers })).status, 403);
    await admin.suaNguoiDung(users.CONTENT_ADMIN.id, { isActive: false }, users.SYSTEM_ADMIN);
    assert.equal((await fetch(`${base}/auth/me`, { headers })).status, 403);
  });
  it("Vai hiệu dụng ưu tiên SYSTEM_ADMIN > CONTENT_ADMIN > USER", () => {
    assert.equal(effectiveRole([]), "USER");
    assert.equal(effectiveRole(["USER", "CONTENT_ADMIN"]), "CONTENT_ADMIN");
    assert.equal(effectiveRole(["SYSTEM_ADMIN", "CONTENT_ADMIN"]), "SYSTEM_ADMIN");
  });
});

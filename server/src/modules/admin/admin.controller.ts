import type { Request, Response } from "express";
import { ok } from "../../lib/http.js";
import { currentUser } from "../../middleware/auth.middleware.js";
import {
  doiVaiSchema,
  idParam,
  suaNguoiDungSchema,
  thanhVienParam,
  userQuerySchema,
} from "./admin.schema.js";
import * as service from "./admin.service.js";

/** GET /departments — mọi vai, danh sách rút gọn không kèm số đếm. */
export async function danhSachDonVi(_req: Request, res: Response): Promise<void> {
  ok(res, await service.danhSachRutGon());
}

/** GET /departments/full — SYSTEM_ADMIN */
export async function danhSachDonViDayDu(req: Request, res: Response): Promise<void> {
  ok(res, await service.danhSachDayDu(currentUser(req)));
}

/** GET /users — SYSTEM_ADMIN */
export async function danhSachNguoiDung(req: Request, res: Response): Promise<void> {
  ok(res, await service.danhSachNguoiDung(userQuerySchema.parse(req.query), currentUser(req)));
}

/** PATCH /users/:id — SYSTEM_ADMIN, chỉ bật/tắt */
export async function suaNguoiDung(req: Request, res: Response): Promise<void> {
  const { id } = idParam.parse(req.params);
  const input = suaNguoiDungSchema.parse(req.body);
  ok(res, await service.suaNguoiDung(id, input, currentUser(req)));
}

/** POST /departments/:id/members — SYSTEM_ADMIN, gán hoặc đổi vai */
export async function ganThanhVien(req: Request, res: Response): Promise<void> {
  const { id } = idParam.parse(req.params);
  const input = doiVaiSchema.parse(req.body);
  ok(res, await service.ganThanhVien(id, input, currentUser(req)), 201);
}

/** DELETE /departments/:id/members/:userId — SYSTEM_ADMIN */
export async function goThanhVien(req: Request, res: Response): Promise<void> {
  const { id, userId } = thanhVienParam.parse(req.params);
  await service.goThanhVien(id, userId, currentUser(req));
  res.status(204).end();
}

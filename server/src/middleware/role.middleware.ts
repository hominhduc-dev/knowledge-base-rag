import type { NextFunction, Request, Response } from "express";
import { MemberRole } from "@prisma/client";
import { forbiddenRole } from "../lib/errors.js";
import { currentUser } from "./auth.middleware.js";

export function requireRole(...allowed: MemberRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (!allowed.includes(currentUser(req).role)) throw forbiddenRole();
      next();
    } catch (error) { next(error); }
  };
}
export const requireAdmin = requireRole(MemberRole.CONTENT_ADMIN, MemberRole.SYSTEM_ADMIN);
export const requireSystemAdmin = requireRole(MemberRole.SYSTEM_ADMIN);

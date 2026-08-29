import type { Request, Response } from "express";
import { ok } from "../../lib/http.js";
import { currentUser } from "../../middleware/auth.middleware.js";
import { searchSchema } from "./retrieval.schema.js";
import * as service from "./retrieval.service.js";

/** POST /search */
export async function search(req: Request, res: Response): Promise<void> {
  const input = searchSchema.parse(req.body);
  ok(res, await service.search(input, currentUser(req)));
}

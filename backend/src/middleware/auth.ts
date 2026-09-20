import { Request, Response, NextFunction } from "express";

/**
 * Placeholder auth middleware — real JWT/session auth in a later phase.
 */
export function requireAuth(_req: Request, _res: Response, next: NextFunction) {
  next();
}

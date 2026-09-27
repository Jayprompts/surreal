import type { RequestHandler } from 'express';
import { z } from 'zod';
import { AppError } from '../utils/AppError.js';

// Validates req.body against a zod schema and replaces it with the cleaned (trimmed…) data.
export const validate =
  (schema: z.ZodType): RequestHandler =>
  (req, _res, next) => {
    const result = schema.safeParse(req.body ?? {});
    if (!result.success) {
      throw new AppError(400, 'Validation failed', z.flattenError(result.error).fieldErrors);
    }
    req.body = result.data;
    next();
  };

// Route params that must be a UUID (account ids, key ids…): a malformed one is a 400, not a database error.
export function uuidParam(value: unknown, label = 'id'): string {
  const result = z.uuid().safeParse(value);
  if (!result.success) throw new AppError(400, `Invalid ${label}`);
  return result.data;
}

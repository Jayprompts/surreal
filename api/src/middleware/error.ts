import type { ErrorRequestHandler, RequestHandler } from 'express';
import { AppError } from '../utils/AppError.js';
import { isProd } from '../config/env.js';

export const notFound: RequestHandler = (req, _res, next) => {
  next(new AppError(404, `Route not found: ${req.method} ${req.originalUrl}`));
};

// Turns known library errors into clean AppErrors so clients get a useful 4xx instead of a 500.
function normalize(err: unknown): unknown {
  // Malformed JSON body sent by the client
  if (typeof err === 'object' && err !== null && 'type' in err && err.type === 'entity.parse.failed') {
    return new AppError(400, 'Invalid JSON body');
  }

  // Postgres unique violation, e.g. two requests creating the same record at the same moment
  if (typeof err === 'object' && err !== null && 'code' in err && err.code === '23505') {
    return new AppError(409, 'That already exists');
  }

  // Standard HTTP errors from Express internals (413 body too large, …)
  if (typeof err === 'object' && err !== null && 'status' in err && typeof err.status === 'number') {
    const status = err.status;
    if (status >= 400 && status < 500) {
      const message = 'expose' in err && err.expose && err instanceof Error ? err.message : 'Request failed';
      return new AppError(status, status === 404 ? 'Not found' : message);
    }
  }

  return err;
}

export const errorHandler: ErrorRequestHandler = (rawErr, _req, res, _next) => {
  const err = normalize(rawErr);
  const isAppError = err instanceof AppError;
  const status = isAppError ? err.statusCode : 500;

  if (status >= 500) console.error(err);

  res.status(status).json({
    success: false,
    error: {
      message: isAppError ? err.message : 'Something went wrong',
      ...(isAppError && err.details ? { details: err.details } : {}),
      ...(!isProd && !isAppError && err instanceof Error ? { stack: err.stack } : {}),
    },
  });
};

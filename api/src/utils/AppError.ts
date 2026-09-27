export class AppError extends Error {
  statusCode: number;
  details?: unknown;
  // A stable, machine-readable reason the website and app can branch on (e.g. "mfa_required").
  code?: string;

  constructor(statusCode: number, message: string, details?: unknown, code?: string) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.details = details;
    this.code = code;
  }
}

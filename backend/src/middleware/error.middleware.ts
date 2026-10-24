import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  const timestamp = new Date().toISOString();

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      status: err.statusCode,
      message: err.message,
      errors: err.errors,
      timestamp,
    });
  }

  // Handle unexpected internal errors
  console.error('Unhandled Server Error:', err);
  return res.status(500).json({
    status: 500,
    message: 'Internal Server Error',
    timestamp,
  });
}

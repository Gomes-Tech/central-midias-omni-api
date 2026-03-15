import { randomUUID } from 'crypto';
import { NextFunction, Request, Response } from 'express';
import {
  REQUEST_ID_HEADER,
  REQUEST_ID_KEY,
} from '../interceptors/request-id.interceptor';

/**
 * Middleware que define o Request ID no início do pipeline (antes dos guards).
 * Assim o requestId fica disponível mesmo quando um guard lança exceção (ex: 403).
 */
export function requestIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const requestId = (req.headers[REQUEST_ID_HEADER] as string) || randomUUID();
  (req as any)[REQUEST_ID_KEY] = requestId;
  res.setHeader(REQUEST_ID_HEADER, requestId);
  next();
}

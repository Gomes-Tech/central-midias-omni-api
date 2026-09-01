import type { NextFunction, Request, Response } from 'express';
import multer from 'multer';

/**
 * Teto de bytes por arquivo no parser global (a rota pode limitar menos via @MaxFileSize).
 * Evita uploads enormes antes dos interceptors. Rotas de material não usam este teto.
 */
const MULTIPART_MAX_FILE_BYTES = 100 * 1024 * 1024;

const memoryStorage = multer.memoryStorage();

const limitedUpload = multer({
  storage: memoryStorage,
  limits: { fileSize: MULTIPART_MAX_FILE_BYTES },
});

const unlimitedUpload = multer({
  storage: memoryStorage,
});

const parseLimitedMultipart = limitedUpload.any() as unknown as (
  req: Request,
  res: Response,
  cb: (err?: unknown) => void,
) => void;

const parseUnlimitedMultipart = unlimitedUpload.any() as unknown as (
  req: Request,
  res: Response,
  cb: (err?: unknown) => void,
) => void;

function requestPath(req: Request): string {
  const raw = req.originalUrl || req.url || req.path || '';
  const pathOnly = raw.split('?')[0] ?? '';
  return pathOnly.replace(/\/+$/, '') || '/';
}

/**
 * POST /api/materials e POST /api/materials/:id/files (com ou sem prefixo /api).
 */
export function isUnlimitedMaterialUpload(req: Pick<Request, 'method' | 'originalUrl' | 'url' | 'path'>): boolean {
  if (req.method !== 'POST') {
    return false;
  }

  const path = requestPath(req as Request);

  return (
    /^\/(?:api\/)?materials$/.test(path) ||
    /^\/(?:api\/)?materials\/[^/]+\/files$/.test(path)
  );
}

/**
 * Parseia multipart/form-data em todas as rotas que enviarem esse Content-Type.
 * Assim `request.file` / `request.files` existem antes dos interceptors globais
 * (tipo e tamanho), sem repetir FileInterceptor em cada rota.
 *
 * Não use `FileInterceptor` nas rotas: o body já foi consumido e o segundo parse
 * quebraria o upload.
 */
export function multipartMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const ct = req.headers['content-type'];
  if (typeof ct !== 'string' || !ct.includes('multipart/form-data')) {
    next();
    return;
  }

  const parseMultipart = isUnlimitedMaterialUpload(req)
    ? parseUnlimitedMultipart
    : parseLimitedMultipart;

  parseMultipart(req, res, (err: unknown) => {
    if (err) {
      next(err);
      return;
    }

    const files = req.files as unknown;
    if (Array.isArray(files) && files.length === 1) {
      req.file = files[0];
    }

    next();
  });
}

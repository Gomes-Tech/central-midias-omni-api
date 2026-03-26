import type { NextFunction } from 'express';
import multer from 'multer';

/**
 * Teto de bytes por arquivo no parser global (a rota pode limitar menos via @MaxFileSize).
 * Evita uploads enormes antes dos interceptors.
 */
const MULTIPART_MAX_FILE_BYTES = 100 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MULTIPART_MAX_FILE_BYTES },
});

// `multer().any()` tipa `req/res` usando uma cópia de `express-serve-static-core` que pode
// divergir da usada no projeto, causando erro de compatibilidade. Como aqui só precisamos
// do efeito colateral (popular `req.file/req.files`), tipamos como `unknown`.
const parseMultipart: (
  req: unknown,
  res: unknown,
  cb: (err?: unknown) => void,
) => void = upload.any();

/**
 * Parseia multipart/form-data em todas as rotas que enviarem esse Content-Type.
 * Assim `request.file` / `request.files` existem antes dos interceptors globais
 * (tipo e tamanho), sem repetir FileInterceptor em cada rota.
 *
 * Não use `FileInterceptor` nas rotas: o body já foi consumido e o segundo parse
 * quebraria o upload.
 */
export function multipartMiddleware(
  req: any,
  res: any,
  next: NextFunction,
): void {
  const ct = req.headers['content-type'];
  if (typeof ct !== 'string' || !ct.includes('multipart/form-data')) {
    next();
    return;
  }

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

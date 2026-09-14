import {
  MULTIPART_MAX_FILE_BYTES,
  MULTIPART_MAX_FILE_MB,
  MULTIPART_MAX_FILES,
  MULTIPART_MAX_REQUEST_BYTES,
} from '@common/constants/multipart-limits';
import { UnauthorizedException } from '@common/filters';
import {
  MAX_IMAGE_PLACEHOLDERS,
  PRINT_IMAGE_MAX_BYTES,
  PRINT_MULTIPART_FIELD_BYTES,
  PRINT_MULTIPART_MAX_BYTES,
} from '@common/constants/print-image-limits';
import { unlinkUploadTemp } from '@infrastructure/providers/storage/upload-body';
import { BadRequestException, PayloadTooLargeException } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import multer, { MulterError } from 'multer';
import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join } from 'node:path';

const memoryStorage = multer.memoryStorage();
const materialUploadDir = join(tmpdir(), 'omni-material-uploads');

const parsePrintMultipart = multer({
  storage: memoryStorage,
  limits: {
    fileSize: PRINT_IMAGE_MAX_BYTES,
    files: MAX_IMAGE_PLACEHOLDERS,
    fields: 3,
    fieldSize: PRINT_MULTIPART_FIELD_BYTES,
    parts: MAX_IMAGE_PLACEHOLDERS + 3,
  },
}).any();

const parseLimitedMultipart = multer({
  storage: memoryStorage,
  limits: {
    fileSize: MULTIPART_MAX_FILE_BYTES,
    files: MULTIPART_MAX_FILES,
  },
}).any() as unknown as (
  req: Request,
  res: Response,
  cb: (err?: unknown) => void,
) => void;

const parseMaterialMultipart = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      try {
        mkdirSync(materialUploadDir, { recursive: true });
        cb(null, materialUploadDir);
      } catch (error) {
        cb(error as Error, materialUploadDir);
      }
    },
    filename: (_req, file, cb) => {
      cb(null, `${randomUUID()}${extname(file.originalname)}`);
    },
  }),
  limits: {
    files: MULTIPART_MAX_FILES,
  },
}).any() as unknown as (
  req: Request,
  res: Response,
  cb: (err?: unknown) => void,
) => void;

function requestPath(req: Request): string {
  const raw = req.originalUrl || req.url || req.path || '';
  const pathOnly = raw.split('?')[0] ?? '';
  return pathOnly.replace(/\/+$/, '') || '/';
}

export function isPrintImageUpload(req: Request): boolean {
  return (
    req.method === 'POST' &&
    /^\/(?:api\/)?materials\/[^/]+\/print-exports$/.test(requestPath(req))
  );
}

/** POST /api/materials e POST /api/materials/:id/files (com ou sem prefixo /api). */
export function isMaterialUpload(
  req: Pick<Request, 'method' | 'originalUrl' | 'url' | 'path'>,
): boolean {
  if (req.method !== 'POST') {
    return false;
  }

  const path = requestPath(req as Request);

  return (
    /^\/(?:api\/)?materials$/.test(path) ||
    /^\/(?:api\/)?materials\/[^/]+\/files$/.test(path)
  );
}

function parseContentLength(req: Request): number | null {
  const raw = req.headers['content-length'];
  if (typeof raw !== 'string' || raw.trim() === '') {
    return null;
  }

  const length = Number(raw);
  if (!Number.isFinite(length) || length < 0) {
    return null;
  }

  return length;
}

function hasAuthCredentials(req: Request): boolean {
  const authorization = req.headers.authorization;
  const apiKey = req.headers['x-api-key'];

  return (
    typeof authorization === 'string' &&
    authorization.trim().length > 0 &&
    typeof apiKey === 'string' &&
    apiKey.trim().length > 0
  );
}

function collectFiles(req: Request): Array<Express.Multer.File> {
  const collected: Express.Multer.File[] = [];

  if (req.file) {
    collected.push(req.file);
  }

  const files = req.files as unknown;
  if (Array.isArray(files)) {
    collected.push(...files.filter(Boolean));
  } else if (files && typeof files === 'object') {
    for (const value of Object.values(files)) {
      if (Array.isArray(value)) {
        collected.push(...value.filter(Boolean));
      } else if (value) {
        collected.push(value as Express.Multer.File);
      }
    }
  }

  return collected;
}

function registerTempCleanup(req: Request, res: Response): void {
  let cleaned = false;

  const cleanup = () => {
    if (cleaned) {
      return;
    }
    cleaned = true;
    void Promise.all(collectFiles(req).map((file) => unlinkUploadTemp(file)));
  };

  res.once('finish', cleanup);
  res.once('close', cleanup);
}

function toUploadError(err: unknown, printUpload = false): unknown {
  if (!(err instanceof MulterError)) {
    return err;
  }

  if (err.code === 'LIMIT_FILE_SIZE') {
    return new PayloadTooLargeException(
      `Arquivo excede o tamanho máximo permitido de ${printUpload ? 5 : MULTIPART_MAX_FILE_MB}MB.`,
    );
  }

  if (err.code === 'LIMIT_FILE_COUNT') {
    return new BadRequestException(
      `Envie no máximo ${MULTIPART_MAX_FILES} arquivos por requisição.`,
    );
  }

  return new BadRequestException('Falha ao processar o upload.');
}

/**
 * Parseia multipart/form-data em todas as rotas que enviarem esse Content-Type.
 *
 * Materiais (qualquer MIME permitido) vão a disco em streaming — sem teto de MB —
 * e o storage lê o stream. Demais rotas continuam em memória com teto de 100 MB.
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

  if (!hasAuthCredentials(req)) {
    next(new UnauthorizedException('Authentication required'));
    return;
  }

  const materialUpload = isMaterialUpload(req);
  const printUpload = isPrintImageUpload(req);
  const contentLength = parseContentLength(req);
  if (
    !materialUpload &&
    contentLength !== null &&
    contentLength >
      (printUpload ? PRINT_MULTIPART_MAX_BYTES : MULTIPART_MAX_REQUEST_BYTES)
  ) {
    next(
      new PayloadTooLargeException(
        'O upload excede o tamanho máximo permitido.',
      ),
    );
    return;
  }

  const parseMultipart = printUpload
    ? parsePrintMultipart
    : materialUpload
      ? parseMaterialMultipart
      : parseLimitedMultipart;

  parseMultipart(req, res, (err: unknown) => {
    if (err) {
      next(toUploadError(err, printUpload));
      return;
    }

    const files = req.files as unknown;
    if (Array.isArray(files) && files.length === 1) {
      req.file = files[0];
    }

    if (materialUpload) {
      registerTempCleanup(req, res);
    }

    next();
  });
}

import { BadRequestException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { diskStorage } from 'multer';

/**
 * Uploads live in apps/api/uploads (gitignored). Anchored to the working
 * directory, NOT __dirname — dist/ is deleted on every rebuild and must
 * never contain user data. Override with UPLOAD_DIR for deployments.
 */
export const UPLOAD_DIR =
  process.env.UPLOAD_DIR ?? path.resolve(process.cwd(), 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

export const imageMulterOptions = {
  storage: diskStorage({
    destination: (_req, _file, cb) => {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
      cb(null, UPLOAD_DIR);
    },
    filename: (_req, file, cb) => {
      cb(null, `${randomUUID()}${EXT_BY_MIME[file.mimetype] ?? '.bin'}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (
    _req: unknown,
    file: Express.Multer.File,
    cb: (error: Error | null, accept: boolean) => void,
  ) => {
    if (!EXT_BY_MIME[file.mimetype]) {
      cb(new BadRequestException('Only JPEG, PNG and WebP images are accepted'), false);
      return;
    }
    cb(null, true);
  },
};

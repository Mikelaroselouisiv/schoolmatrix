import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';

const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'image/svg+xml': '.svg',
};

@Injectable()
export class UploadsService {
  constructor() {
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }
  }

  async saveFile(
    buffer: Buffer,
    mimetype: string,
    originalName?: string,
  ): Promise<string> {
    const ext =
      EXT_BY_MIME[mimetype] ??
      (originalName ? path.extname(originalName).toLowerCase() : '.bin');
    const safeExt = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'].includes(
      ext,
    )
      ? ext
      : '.jpg';
    const filename = `${randomUUID()}${safeExt}`;
    const filepath = path.join(UPLOADS_DIR, filename);
    fs.writeFileSync(filepath, buffer);
    return `uploads/${filename}`;
  }
}

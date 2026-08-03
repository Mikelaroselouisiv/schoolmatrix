import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import * as fs from 'fs';
import { Request, Response, NextFunction } from 'express';
import { AppModule } from './app.module';
import { resolveMediaUrl } from './uploads/media-url';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const storageRoot = process.env.STORAGE_ROOT || join(process.cwd(), 'storage');
  const uploadsDir = join(storageRoot, 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  // Fichier absent en local (nœud miroir) → redirection URL publique GCS.
  app.use('/uploads', (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    const name = (req.path || '').replace(/^\/+/, '').split('/')[0];
    if (!name || name.includes('..')) return next();
    const localFile = join(uploadsDir, name);
    if (fs.existsSync(localFile)) return next();
    const publicUrl = resolveMediaUrl(`uploads/${name}`);
    if (publicUrl && /^https?:\/\//i.test(publicUrl)) {
      return res.redirect(302, publicUrl);
    }
    return next();
  });
  app.useStaticAssets(uploadsDir, { prefix: '/uploads/' });
  app.enableCors({
    origin: (origin, cb) => {
      if (!origin || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
        return cb(null, true);
      }
      return cb(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Sync-Key'],
  });
  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
}
bootstrap();

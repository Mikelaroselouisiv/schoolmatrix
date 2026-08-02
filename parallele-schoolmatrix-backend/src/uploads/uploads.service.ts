import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { StorageService } from '../storage/storage.service';
import { GcsService } from '../gcs/gcs.service';
import { S3Service } from '../s3/s3.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FileMetadata } from '../file-metadata/file-metadata.entity';

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'image/svg+xml': '.svg',
};

@Injectable()
export class UploadsService {
  constructor(
    private readonly storage: StorageService,
    private readonly gcs: GcsService,
    private readonly s3: S3Service,
    @InjectRepository(FileMetadata)
    private readonly fileMetaRepo: Repository<FileMetadata>,
  ) {}

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
    const filepath = this.storage.resolveLocalPath('uploads', filename);
    fs.writeFileSync(filepath, buffer);

    const relativePath = this.storage.getRelativePath('uploads', filename);

    // Priorité GCS (GCP). S3 conservé en secours legacy uniquement.
    let remoteKey: string | null = null;
    if (this.gcs.isEnabled()) {
      remoteKey = await this.gcs.upload('uploads', filename, buffer, mimetype);
    } else if (this.s3.isEnabled()) {
      remoteKey = await this.s3.upload('uploads', filename, buffer, mimetype);
    }

    const meta = this.fileMetaRepo.create({
      local_path: relativePath,
      s3_key: remoteKey, // colonne historique = clé objet cloud (GCS ou S3)
      sync_status: remoteKey ? 'synced' : 'local_only',
      last_synced_at: remoteKey ? new Date() : null,
      original_filename: originalName ?? null,
      mime_type: mimetype,
      size_bytes: buffer.length,
    });
    await this.fileMetaRepo.save(meta);

    return `uploads/${filename}`;
  }
}

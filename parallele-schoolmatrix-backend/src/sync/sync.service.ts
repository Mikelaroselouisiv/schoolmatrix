/**
 * Sync SchoolMatrix — protocole état (uuid + curseur temporel).
 * Source de vérité = nœud LOCAL. En conflit, LOCAL gagne.
 */
import {
  BadRequestException,
  Injectable,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityMetadata, In, Repository } from 'typeorm';
import { SyncNode } from './sync-node.entity';
import { SyncEvent } from './sync-event.entity';
import {
  APPEND_ONLY_ENTITIES,
  SYNC_ENTITY_MAP,
  SyncEntityName,
  listSyncEntityNames,
} from './sync.entities';

export type SyncWireRecord = {
  uuid: string;
  updatedAt: string;
  deletedAt: string | null;
  data: Record<string, unknown>;
};

@Injectable()
export class SyncService implements OnModuleInit {
  private nodeId: string = 'LOCAL';

  constructor(
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
    @InjectRepository(SyncNode)
    private readonly syncNodeRepo: Repository<SyncNode>,
    @InjectRepository(SyncEvent)
    private readonly syncEventRepo: Repository<SyncEvent>,
  ) {}

  async onModuleInit() {
    this.nodeId =
      this.configService.get<string>('NODE_ID') ??
      this.configService.get<string>('SYNC_NODE_ID') ??
      'LOCAL';
    await this.ensureNodeRegistered();
  }

  getNodeId(): string {
    return this.nodeId;
  }

  listEntities(): SyncEntityName[] {
    return listSyncEntityNames();
  }

  private async ensureNodeRegistered(): Promise<void> {
    const existing = await this.syncNodeRepo.findOne({
      where: { id: this.nodeId },
    });
    if (!existing) {
      await this.syncNodeRepo.save(
        this.syncNodeRepo.create({
          id: this.nodeId,
          name: this.nodeId,
        }),
      );
    }
  }

  async recordEvent(
    entityType: string,
    entityId: string,
    eventType: string,
    payload?: Record<string, unknown>,
  ): Promise<void> {
    await this.syncEventRepo.save(
      this.syncEventRepo.create({
        node_id: this.nodeId,
        entity_type: entityType,
        entity_id: entityId,
        event_type: eventType,
        payload: payload ?? null,
      }),
    );
  }

  private isLocalTruthNode(): boolean {
    const id = this.nodeId.toUpperCase();
    return (
      id === 'LOCAL' ||
      id === 'LOCAL-MOTHER' ||
      id.startsWith('LOCAL') ||
      id.includes('MOTHER') ||
      id.includes('SERVER')
    );
  }

  private isCloudSource(sourceNodeId?: string): boolean {
    const s = (sourceNodeId ?? '').toUpperCase();
    return s === 'GCP' || s === 'CLOUD' || s.includes('GCP');
  }

  async pull(entityName: string, since?: string, take = 200) {
    const def = SYNC_ENTITY_MAP.get(entityName as SyncEntityName);
    if (!def) {
      throw new BadRequestException(`Entité sync inconnue: ${entityName}`);
    }
    const limit = Math.min(Math.max(take || 200, 1), 1000);
    const sinceDate = new Date(since || '1970-01-01T00:00:00.000Z');
    if (Number.isNaN(sinceDate.getTime())) {
      throw new BadRequestException('since ISO8601 invalide');
    }

    const repo = this.dataSource.getRepository(def.target);
    const meta = repo.metadata;
    const timeProp = def.timeField;

    const rows = await repo
      .createQueryBuilder('e')
      .where(`e.${timeProp} > :since`, { since: sinceDate })
      .orderBy(`e.${timeProp}`, 'ASC')
      .addOrderBy('e.id', 'ASC')
      .take(limit)
      .getMany();

    if (rows.length === 0) {
      return {
        entity: entityName,
        records: [] as SyncWireRecord[],
        nextCursor: sinceDate.toISOString(),
        count: 0,
      };
    }

    const withIds = await repo.find({
      where: { id: In(rows.map((r: any) => r.id)) } as any,
      loadRelationIds: true,
    });
    const byId = new Map(withIds.map((r: any) => [r.id, r]));

    const records: SyncWireRecord[] = rows.map((row: any) => {
      const full = byId.get(row.id) ?? row;
      const t = full[timeProp] ?? row[timeProp];
      const updatedAt =
        t instanceof Date ? t.toISOString() : new Date(t).toISOString();
      return {
        uuid: String(full.id),
        updatedAt,
        deletedAt: null,
        data: this.toWireData(full, meta),
      };
    });

    return {
      entity: entityName,
      records,
      nextCursor: records[records.length - 1].updatedAt,
      count: records.length,
    };
  }

  async push(body: {
    entity: string;
    sourceNodeId?: string;
    records: Array<{
      uuid: string;
      updatedAt?: string;
      deletedAt?: string | null;
      data: Record<string, unknown>;
    }>;
  }) {
    const def = SYNC_ENTITY_MAP.get(body.entity as SyncEntityName);
    if (!def) {
      throw new BadRequestException(`Entité sync inconnue: ${body.entity}`);
    }
    const repo = this.dataSource.getRepository(def.target);
    const meta = repo.metadata;
    const results: Array<{
      uuid: string;
      action: 'created' | 'updated' | 'skipped' | 'error';
      error?: string;
    }> = [];

    for (const record of body.records || []) {
      const uuid = String(record.uuid || '');
      if (!uuid) {
        results.push({ uuid: '', action: 'error', error: 'uuid manquant' });
        continue;
      }
      try {
        const action = await this.applyOne(
          def.name,
          repo,
          meta,
          def.timeField,
          record,
          body.sourceNodeId,
        );
        results.push({ uuid, action });
      } catch (err: any) {
        results.push({
          uuid,
          action: 'error',
          error: err?.message || String(err),
        });
      }
    }

    const applied = results.filter(
      (r) => r.action === 'created' || r.action === 'updated',
    ).length;
    const skipped = results.filter((r) => r.action === 'skipped').length;
    const errors = results.filter((r) => r.action === 'error').length;

    return {
      entity: body.entity,
      sourceNodeId: body.sourceNodeId ?? null,
      results,
      applied,
      skipped,
      errors,
    };
  }

  private async applyOne(
    entityName: SyncEntityName,
    repo: Repository<any>,
    meta: EntityMetadata,
    timeField: 'updated_at' | 'created_at',
    record: {
      uuid: string;
      updatedAt?: string;
      deletedAt?: string | null;
      data: Record<string, unknown>;
    },
    sourceNodeId?: string,
  ): Promise<'created' | 'updated' | 'skipped'> {
    const existing = await repo.findOne({
      where: { id: record.uuid } as any,
      loadRelationIds: true,
    });

    if (APPEND_ONLY_ENTITIES.has(entityName)) {
      if (existing) return 'skipped';
      await this.persist(repo, meta, record.uuid, record.data, record.updatedAt, timeField);
      return 'created';
    }

    if (!existing) {
      await this.persist(repo, meta, record.uuid, record.data, record.updatedAt, timeField);
      return 'created';
    }

    const incomingAt = this.parseTime(record.updatedAt);
    const existingAt = this.parseTime(existing[timeField]);

    if (!this.shouldApply(incomingAt, existingAt, sourceNodeId)) {
      return 'skipped';
    }

    await this.persist(repo, meta, record.uuid, record.data, record.updatedAt, timeField);
    return 'updated';
  }

  /**
   * LOCAL (vérité) : n’écrase jamais une ligne existante venant du cloud.
   * CLOUD (miroir) : accepte le local y compris à horodatage égal.
   */
  private shouldApply(
    incomingAt: Date,
    existingAt: Date,
    sourceNodeId?: string,
  ): boolean {
    const localTruth = this.isLocalTruthNode();
    const fromCloud = this.isCloudSource(sourceNodeId);

    if (localTruth && fromCloud) {
      return false;
    }
    if (!localTruth && !fromCloud) {
      // miroir reçoit le local
      return incomingAt.getTime() >= existingAt.getTime();
    }
    return incomingAt.getTime() > existingAt.getTime();
  }

  private parseTime(value: unknown): Date {
    if (value instanceof Date) return value;
    if (typeof value === 'string' || typeof value === 'number') {
      const d = new Date(value);
      if (!Number.isNaN(d.getTime())) return d;
    }
    return new Date(0);
  }

  private toWireData(entity: any, meta: EntityMetadata): Record<string, unknown> {
    const data: Record<string, unknown> = {};
    for (const col of meta.columns) {
      if (col.relationMetadata) continue;
      const prop = col.propertyName;
      if (prop === 'id') continue;
      let v = entity[prop];
      if (v instanceof Date) v = v.toISOString();
      data[prop] = v ?? null;
    }
    for (const rel of meta.relations) {
      if (!(rel.isManyToOne || (rel.isOneToOne && rel.isOwning))) continue;
      const prop = rel.propertyName;
      const v = entity[prop];
      if (v == null) {
        data[prop] = null;
      } else if (typeof v === 'string' || typeof v === 'number') {
        data[prop] = v;
      } else if (typeof v === 'object' && v.id != null) {
        data[prop] = v.id;
      } else {
        data[prop] = null;
      }
    }
    return data;
  }

  private async persist(
    repo: Repository<any>,
    meta: EntityMetadata,
    uuid: string,
    data: Record<string, unknown>,
    updatedAt: string | undefined,
    timeField: 'updated_at' | 'created_at',
  ): Promise<void> {
    const payload: Record<string, unknown> = { id: uuid };

    for (const col of meta.columns) {
      if (col.relationMetadata) continue;
      const prop = col.propertyName;
      if (prop === 'id') continue;
      if (Object.prototype.hasOwnProperty.call(data, prop)) {
        payload[prop] = data[prop];
      }
    }

    for (const rel of meta.relations) {
      if (!(rel.isManyToOne || (rel.isOneToOne && rel.isOwning))) continue;
      const prop = rel.propertyName;
      if (!Object.prototype.hasOwnProperty.call(data, prop)) continue;
      const fk = data[prop];
      if (fk == null || fk === '') {
        payload[prop] = null;
      } else {
        payload[prop] = { id: fk };
      }
    }

    if (updatedAt && timeField === 'updated_at') {
      payload.updated_at = new Date(updatedAt);
    }

    const entity = repo.create(payload as any);
    await repo.save(entity);
  }
}

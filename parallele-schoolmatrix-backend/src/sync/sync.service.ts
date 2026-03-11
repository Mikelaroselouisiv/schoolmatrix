/**
 * Service de fondation pour la synchronisation future.
 * Fournit NODE_ID et structure pour tracer les écritures.
 * Ne contient pas le moteur de sync complet.
 */
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SyncNode } from './sync-node.entity';
import { SyncEvent } from './sync-event.entity';

@Injectable()
export class SyncService implements OnModuleInit {
  private nodeId: string = 'LOCAL';

  constructor(
    private readonly configService: ConfigService,
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

  /**
   * Enregistre un événement de sync (fondation pour future implémentation).
   */
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
}

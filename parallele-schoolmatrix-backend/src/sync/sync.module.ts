import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { SyncNode } from './sync-node.entity';
import { SyncEvent } from './sync-event.entity';
import { SyncService } from './sync.service';

@Global()
@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([SyncNode, SyncEvent]),
  ],
  providers: [SyncService],
  exports: [SyncService],
})
export class SyncModule {}

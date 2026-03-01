import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('rooms')
@UseGuards(JwtAuthGuard)
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Get()
  async list() {
    const rooms = await this.roomsService.findAll();
    return {
      ok: true,
      rooms: rooms.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        active: r.active,
        created_at: r.created_at,
        updated_at: r.updated_at,
      })),
    };
  }

  @Get(':id')
  async one(@Param('id') id: string) {
    const room = await this.roomsService.findOne(id);
    return {
      ok: true,
      room: {
        id: room.id,
        name: room.name,
        description: room.description,
        active: room.active,
        created_at: room.created_at,
        updated_at: room.updated_at,
      },
    };
  }

  @Post()
  async create(@Body() body: { name: string; description?: string }) {
    const room = await this.roomsService.create({
      name: body.name,
      description: body.description,
    });
    return {
      ok: true,
      room: {
        id: room.id,
        name: room.name,
        description: room.description,
        active: room.active,
        created_at: room.created_at,
        updated_at: room.updated_at,
      },
    };
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() body: { name?: string; description?: string; active?: boolean },
  ) {
    const room = await this.roomsService.update(id, body);
    return {
      ok: true,
      room: {
        id: room.id,
        name: room.name,
        description: room.description,
        active: room.active,
        created_at: room.created_at,
        updated_at: room.updated_at,
      },
    };
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.roomsService.delete(id);
    return { ok: true, deleted: true };
  }
}

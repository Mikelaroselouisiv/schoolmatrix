import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Room } from './room.entity';

@Injectable()
export class RoomsService {
  constructor(
    @InjectRepository(Room)
    private readonly roomRepo: Repository<Room>,
  ) {}

  async findAll(): Promise<Room[]> {
    return this.roomRepo.find({ order: { name: 'ASC' } });
  }

  async findOne(id: string): Promise<Room> {
    const room = await this.roomRepo.findOne({ where: { id } });
    if (!room) {
      throw new NotFoundException('Room not found');
    }
    return room;
  }

  async create(params: { name: string; description?: string }): Promise<Room> {
    const name = params.name.trim();
    const exists = await this.roomRepo.findOne({ where: { name } });
    if (exists) {
      throw new BadRequestException('Room name already exists');
    }
    const room = this.roomRepo.create({
      name,
      description: params.description?.trim(),
      active: true,
    });
    return this.roomRepo.save(room);
  }

  async update(
    id: string,
    params: { name?: string; description?: string; active?: boolean },
  ): Promise<Room> {
    const room = await this.roomRepo.findOne({ where: { id } });
    if (!room) {
      throw new NotFoundException('Room not found');
    }
    if (params.name !== undefined) {
      const name = params.name.trim();
      const exists = await this.roomRepo.findOne({ where: { name } });
      if (exists && exists.id !== id) {
        throw new BadRequestException('Room name already exists');
      }
      room.name = name;
    }
    if (params.description !== undefined) {
      room.description = params.description.trim() || undefined;
    }
    if (params.active !== undefined) room.active = params.active;
    return this.roomRepo.save(room);
  }

  async delete(id: string): Promise<void> {
    const room = await this.roomRepo.findOne({ where: { id } });
    if (!room) {
      throw new NotFoundException('Room not found');
    }
    await this.roomRepo.remove(room);
  }
}

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SchoolProfile } from './school-profile.entity';

@Injectable()
export class SchoolProfileService {
  constructor(
    @InjectRepository(SchoolProfile)
    private readonly profileRepo: Repository<SchoolProfile>,
  ) {}

  async getProfile(): Promise<SchoolProfile | null> {
    const [p] = await this.profileRepo.find({ take: 1 });
    return p ?? null;
  }

  async ensureProfile(): Promise<SchoolProfile> {
    const existing = await this.getProfile();
    if (existing) return existing;
    const profile = this.profileRepo.create({
      name: 'Parallele SchoolMatrix',
      domain: 'localhost',
      primary_color: '#1e293b',
      secondary_color: '#334155',
      active: true,
    });
    return this.profileRepo.save(profile);
  }

  async updateProfile(params: {
    name?: string;
    slogan?: string;
    domain?: string;
    logo_url?: string | null;
    primary_color?: string;
    secondary_color?: string;
    active?: boolean;
  }): Promise<SchoolProfile> {
    const profile = await this.ensureProfile();
    if (params.name !== undefined) profile.name = params.name;
    if (params.slogan !== undefined) {
      profile.slogan = params.slogan === '' ? null : params.slogan ?? null;
    }
    if (params.domain !== undefined) profile.domain = params.domain;
    if (params.logo_url !== undefined) profile.logo_url = params.logo_url ?? null;
    if (params.primary_color !== undefined) profile.primary_color = params.primary_color;
    if (params.secondary_color !== undefined) profile.secondary_color = params.secondary_color;
    if (params.active !== undefined) profile.active = params.active;
    return this.profileRepo.save(profile);
  }
}

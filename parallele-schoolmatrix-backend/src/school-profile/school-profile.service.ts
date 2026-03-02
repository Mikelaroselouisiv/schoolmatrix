import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SchoolProfile } from './school-profile.entity';
import { AcademicYear } from '../academic-year/academic-year.entity';
import { Period } from '../period/period.entity';

export type CurrentContext = {
  current_academic_year_id: string | null;
  current_academic_year_name: string | null;
  current_period_id: string | null;
  current_period_name: string | null;
};

@Injectable()
export class SchoolProfileService {
  constructor(
    @InjectRepository(SchoolProfile)
    private readonly profileRepo: Repository<SchoolProfile>,
    @InjectRepository(AcademicYear)
    private readonly academicYearRepo: Repository<AcademicYear>,
    @InjectRepository(Period)
    private readonly periodRepo: Repository<Period>,
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
    current_academic_year_id?: string | null;
    current_period_id?: string | null;
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
    if (params.current_academic_year_id !== undefined) {
      profile.current_academic_year_id = params.current_academic_year_id || null;
    }
    if (params.current_period_id !== undefined) {
      profile.current_period_id = params.current_period_id || null;
    }
    return this.profileRepo.save(profile);
  }

  async getCurrentContext(): Promise<CurrentContext> {
    const profile = await this.getProfile();
    const yearId = profile?.current_academic_year_id ?? null;
    const periodId = profile?.current_period_id ?? null;
    let yearName: string | null = null;
    let periodName: string | null = null;
    if (yearId) {
      const ay = await this.academicYearRepo.findOne({ where: { id: yearId } });
      yearName = ay?.name ?? null;
    }
    if (periodId) {
      const p = await this.periodRepo.findOne({ where: { id: periodId } });
      periodName = p?.name ?? null;
    }
    return {
      current_academic_year_id: yearId,
      current_academic_year_name: yearName,
      current_period_id: periodId,
      current_period_name: periodName,
    };
  }
}

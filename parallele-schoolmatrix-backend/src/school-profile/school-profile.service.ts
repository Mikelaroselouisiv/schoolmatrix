import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SchoolProfile } from './school-profile.entity';
import { AcademicYear } from '../academic-year/academic-year.entity';
import { Period } from '../period/period.entity';
import { Class } from '../classes/class.entity';
import { Student } from '../students/student.entity';
import { User } from '../users/user.entity';
import { Role } from '../roles/role.entity';
import { SyncKickService } from '../sync/sync-kick.service';

export type DashboardStats = {
  classesCount: number;
  studentsCount: number;
  teachersCount: number;
};

export type CurrentContext = {
  current_academic_year_id: string | null;
  current_academic_year_name: string | null;
  current_period_id: string | null;
  current_period_name: string | null;
};

@Injectable()
export class SchoolProfileService implements OnModuleInit {
  constructor(
    @InjectRepository(SchoolProfile)
    private readonly profileRepo: Repository<SchoolProfile>,
    @InjectRepository(AcademicYear)
    private readonly academicYearRepo: Repository<AcademicYear>,
    @InjectRepository(Period)
    private readonly periodRepo: Repository<Period>,
    @InjectRepository(Class)
    private readonly classRepo: Repository<Class>,
    @InjectRepository(Student)
    private readonly studentRepo: Repository<Student>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
    private readonly syncKick: SyncKickService,
  ) {}

  async onModuleInit() {
    await this.dedupeProfiles();
  }

  /**
   * Profil canonique = plus ancien créé. Fusionne les champs du plus récent
   * puis supprime les doublons.
   */
  async dedupeProfiles(): Promise<SchoolProfile | null> {
    const all = await this.profileRepo.find({
      order: { created_at: 'ASC' },
    });
    if (all.length === 0) return null;
    if (all.length === 1) return all[0];

    const keep = all[0];
    const newest = all.reduce((a, b) =>
      a.updated_at.getTime() >= b.updated_at.getTime() ? a : b,
    );
    keep.name = newest.name;
    keep.slogan = newest.slogan;
    keep.domain = newest.domain;
    keep.logo_url = newest.logo_url;
    keep.primary_color = newest.primary_color;
    keep.secondary_color = newest.secondary_color;
    keep.active = newest.active;
    keep.current_academic_year_id = newest.current_academic_year_id;
    keep.current_period_id = newest.current_period_id;
    keep.updated_at = newest.updated_at;
    await this.profileRepo.save(keep);

    await this.profileRepo
      .createQueryBuilder()
      .delete()
      .where('id != :id', { id: keep.id })
      .execute();

    return keep;
  }

  async getProfile(): Promise<SchoolProfile | null> {
    const [p] = await this.profileRepo.find({
      order: { created_at: 'ASC' },
      take: 1,
    });
    return p ?? null;
  }

  async ensureProfile(): Promise<SchoolProfile> {
    await this.dedupeProfiles();
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
    const saved = await this.profileRepo.save(profile);
    this.syncKick.kick('school-profile');
    return saved;
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

  /** Statistiques tableau de bord (réservé directeurs / superadmin). */
  async getDashboardStats(): Promise<DashboardStats> {
    const [classesCount, studentsCount, teacherRole] = await Promise.all([
      this.classRepo.count(),
      this.studentRepo.count(),
      this.roleRepo.findOne({ where: { name: 'TEACHER' } }),
    ]);
    let teachersCount = 0;
    if (teacherRole) {
      teachersCount = await this.userRepo.count({
        where: { role: { id: teacherRole.id }, active: true },
      });
    }
    return { classesCount, studentsCount, teachersCount };
  }
}

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Class } from '../classes/class.entity';
import { User } from '../users/user.entity';
import {
  ClassDayMoment,
  ClassMomentKind,
} from './class-day-moment.entity';
import {
  SchoolDutyKind,
  SchoolWeekDuty,
} from './school-week-duty.entity';
import {
  CLASS_MOMENT_LABELS,
  CLASS_WEEKDAYS,
  SCHOOL_DUTY_LABELS,
  assertTimeRange,
  parseClassMomentKind,
  parseHhMm,
  parseSchoolDutyKind,
  parseWeekday,
  personName,
} from './schedule-day.constants';

export type ClassDayMomentDto = {
  id: string;
  class_id: string;
  class_name: string | null;
  academic_year: string | null;
  kind: ClassMomentKind;
  title: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  label: string | null;
  created_at: Date;
  updated_at: Date;
};

export type SchoolWeekDutyDto = {
  id: string;
  academic_year: string;
  kind: SchoolDutyKind;
  title: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  responsible_user_id: number | null;
  responsible_name: string | null;
  created_at: Date;
  updated_at: Date;
};

@Injectable()
export class ScheduleMomentsService {
  constructor(
    @InjectRepository(ClassDayMoment)
    private readonly momentRepo: Repository<ClassDayMoment>,
    @InjectRepository(SchoolWeekDuty)
    private readonly dutyRepo: Repository<SchoolWeekDuty>,
    @InjectRepository(Class)
    private readonly classRepo: Repository<Class>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  private toMomentDto(m: ClassDayMoment): ClassDayMomentDto {
    const title =
      m.label?.trim() || CLASS_MOMENT_LABELS[m.kind] || m.kind;
    return {
      id: m.id,
      class_id: m.class?.id ?? m.class_id,
      class_name: m.class?.name ?? null,
      academic_year: m.academic_year ?? null,
      kind: m.kind,
      title,
      day_of_week: m.day_of_week,
      start_time: m.start_time,
      end_time: m.end_time,
      label: m.label ?? null,
      created_at: m.created_at,
      updated_at: m.updated_at,
    };
  }

  private toDutyDto(d: SchoolWeekDuty): SchoolWeekDutyDto {
    return {
      id: d.id,
      academic_year: d.academic_year,
      kind: d.kind,
      title: SCHOOL_DUTY_LABELS[d.kind] || d.kind,
      day_of_week: d.day_of_week,
      start_time: d.start_time,
      end_time: d.end_time,
      responsible_user_id: d.responsible?.id ?? d.responsible_user_id ?? null,
      responsible_name: personName(d.responsible),
      created_at: d.created_at,
      updated_at: d.updated_at,
    };
  }

  async listClassMoments(filters: {
    class_id?: string;
    academic_year?: string;
    kind?: string;
    day_of_week?: number;
  }): Promise<ClassDayMomentDto[]> {
    const qb = this.momentRepo
      .createQueryBuilder('m')
      .leftJoinAndSelect('m.class', 'class')
      .orderBy('m.day_of_week', 'ASC')
      .addOrderBy('m.start_time', 'ASC');
    if (filters.class_id) {
      qb.andWhere('m.class_id = :class_id', { class_id: filters.class_id });
    }
    if (filters.academic_year) {
      qb.andWhere('m.academic_year = :academic_year', {
        academic_year: filters.academic_year,
      });
    }
    if (filters.kind) {
      qb.andWhere('m.kind = :kind', {
        kind: parseClassMomentKind(filters.kind),
      });
    }
    if (filters.day_of_week != null) {
      qb.andWhere('m.day_of_week = :day', {
        day: parseWeekday(filters.day_of_week),
      });
    }
    const rows = await qb.getMany();
    return rows.map((m) => this.toMomentDto(m));
  }

  async createClassMoments(body: {
    class_id: string;
    academic_year?: string;
    kind: string;
    days?: number[];
    day_of_week?: number;
    start_time: string;
    end_time: string;
    label?: string | null;
  }): Promise<ClassDayMomentDto[]> {
    if (!body.class_id?.trim()) {
      throw new BadRequestException('class_id requis');
    }
    const cls = await this.classRepo.findOne({ where: { id: body.class_id } });
    if (!cls) throw new BadRequestException('Classe introuvable');
    const kind = parseClassMomentKind(body.kind);
    const start = parseHhMm(body.start_time, 'début');
    const end = parseHhMm(body.end_time, 'fin');
    assertTimeRange(start, end);
    const days = (body.days?.length
      ? body.days
      : body.day_of_week != null
        ? [body.day_of_week]
        : [...CLASS_WEEKDAYS]
    ).map((d) => parseWeekday(d));
    const uniqueDays = [...new Set(days)];
    const year = body.academic_year?.trim() || null;
    const label = body.label?.trim() || null;
    const saved: ClassDayMoment[] = [];
    for (const day of uniqueDays) {
      const row = this.momentRepo.create({
        class_id: cls.id,
        class: cls,
        academic_year: year,
        kind,
        day_of_week: day,
        start_time: start,
        end_time: end,
        label,
      });
      saved.push(await this.momentRepo.save(row));
    }
    return saved.map((m) => this.toMomentDto({ ...m, class: cls }));
  }

  async updateClassMoment(
    id: string,
    body: Partial<{
      kind: string;
      day_of_week: number;
      start_time: string;
      end_time: string;
      label: string | null;
    }>,
  ): Promise<ClassDayMomentDto> {
    const row = await this.momentRepo.findOne({
      where: { id },
      relations: ['class'],
    });
    if (!row) throw new NotFoundException('Moment introuvable');
    if (body.kind !== undefined) row.kind = parseClassMomentKind(body.kind);
    if (body.day_of_week !== undefined) {
      row.day_of_week = parseWeekday(body.day_of_week);
    }
    if (body.start_time !== undefined) {
      row.start_time = parseHhMm(body.start_time, 'début');
    }
    if (body.end_time !== undefined) {
      row.end_time = parseHhMm(body.end_time, 'fin');
    }
    assertTimeRange(row.start_time, row.end_time);
    if (body.label !== undefined) {
      row.label = body.label?.trim() || null;
    }
    return this.toMomentDto(await this.momentRepo.save(row));
  }

  async deleteClassMoment(id: string): Promise<void> {
    const row = await this.momentRepo.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Moment introuvable');
    await this.momentRepo.remove(row);
  }

  async listDuties(filters: {
    academic_year?: string;
    kind?: string;
  }): Promise<SchoolWeekDutyDto[]> {
    const qb = this.dutyRepo
      .createQueryBuilder('d')
      .leftJoinAndSelect('d.responsible', 'responsible')
      .orderBy('d.day_of_week', 'ASC');
    if (filters.academic_year) {
      qb.andWhere('d.academic_year = :academic_year', {
        academic_year: filters.academic_year,
      });
    }
    if (filters.kind) {
      qb.andWhere('d.kind = :kind', {
        kind: parseSchoolDutyKind(filters.kind),
      });
    }
    const rows = await qb.getMany();
    return rows.map((d) => this.toDutyDto(d));
  }

  async upsertWeekDuties(body: {
    academic_year: string;
    kind?: string;
    start_time: string;
    end_time: string;
    days: { day_of_week: number; responsible_user_id?: number | null }[];
  }): Promise<SchoolWeekDutyDto[]> {
    const year = body.academic_year?.trim();
    if (!year) throw new BadRequestException('academic_year requis');
    const kind = parseSchoolDutyKind(body.kind);
    const start = parseHhMm(body.start_time, 'début');
    const end = parseHhMm(body.end_time, 'fin');
    assertTimeRange(start, end);
    if (!Array.isArray(body.days) || body.days.length === 0) {
      throw new BadRequestException('Indiquez au moins un jour');
    }
    const out: SchoolWeekDuty[] = [];
    for (const dayBody of body.days) {
      const day = parseWeekday(dayBody.day_of_week);
      let responsible: User | null = null;
      const uid = dayBody.responsible_user_id;
      if (uid != null) {
        responsible = await this.userRepo.findOne({ where: { id: uid } });
        if (!responsible) {
          throw new BadRequestException(`Utilisateur ${uid} introuvable`);
        }
      }
      let row = await this.dutyRepo.findOne({
        where: { academic_year: year, kind, day_of_week: day },
        relations: ['responsible'],
      });
      if (!row) {
        row = this.dutyRepo.create({
          academic_year: year,
          kind,
          day_of_week: day,
          start_time: start,
          end_time: end,
          responsible_user_id: responsible?.id ?? null,
          responsible,
        });
      } else {
        row.start_time = start;
        row.end_time = end;
        row.responsible = responsible;
        row.responsible_user_id = responsible?.id ?? null;
      }
      out.push(await this.dutyRepo.save(row));
    }
    return out.map((d) => this.toDutyDto(d));
  }

  async deleteDuty(id: string): Promise<void> {
    const row = await this.dutyRepo.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Responsabilité introuvable');
    await this.dutyRepo.remove(row);
  }
}

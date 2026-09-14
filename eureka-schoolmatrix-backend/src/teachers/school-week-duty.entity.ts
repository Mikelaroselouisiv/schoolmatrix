import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Class } from '../classes/class.entity';
import type { MorningDutyCycle } from '../roles/education-levels';

/** Programmation du début de journée (montée du drapeau, rentrée). */
export const SCHOOL_DUTY_KINDS = ['FLAG', 'RENTREE', 'DEVOTION'] as const;
export type SchoolDutyKind = (typeof SCHOOL_DUTY_KINDS)[number];

@Entity('school_week_duty')
@Index('UQ_school_week_duty_flag_year_day', ['academic_year', 'day_of_week'], {
  unique: true,
  where: `kind = 'FLAG'`,
})
@Index('UQ_school_week_duty_rentree_year_cycle_day_user', [
  'academic_year',
  'cycle',
  'day_of_week',
  'responsible_user_id',
], {
  unique: true,
  where: `kind = 'RENTREE'`,
})
export class SchoolWeekDuty {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 20 })
  academic_year: string;

  /** FLAG | RENTREE | DEVOTION (ancien) */
  @Column({ type: 'varchar', length: 20 })
  kind: SchoolDutyKind;

  /** PRESCOLAIRE | PRIMAIRE — rentrée seulement. */
  @Column({ type: 'varchar', length: 20, nullable: true })
  cycle: MorningDutyCycle | null;

  @Column({ type: 'smallint' })
  day_of_week: number;

  @Column({ type: 'varchar', length: 5 })
  start_time: string;

  @Column({ type: 'varchar', length: 5 })
  end_time: string;

  @Column({ type: 'int', nullable: true })
  responsible_user_id: number | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'responsible_user_id' })
  responsible: User | null;

  @Column({ type: 'uuid', nullable: true })
  class_id: string | null;

  @ManyToOne(() => Class, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'class_id' })
  class: Class | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

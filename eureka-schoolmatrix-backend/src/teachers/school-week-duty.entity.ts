import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';
import { User } from '../users/user.entity';

/** Tâche hebdomadaire pour toute l’école (dévotion, etc.). */
export const SCHOOL_DUTY_KINDS = ['DEVOTION'] as const;
export type SchoolDutyKind = (typeof SCHOOL_DUTY_KINDS)[number];

@Entity('school_week_duty')
@Unique('UQ_school_week_duty_year_kind_day', ['academic_year', 'kind', 'day_of_week'])
export class SchoolWeekDuty {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 20 })
  academic_year: string;

  /** DEVOTION */
  @Column({ type: 'varchar', length: 20 })
  kind: SchoolDutyKind;

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

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

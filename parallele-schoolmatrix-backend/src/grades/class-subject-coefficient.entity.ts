import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Class } from '../classes/class.entity';
import { Subject } from '../subjects/subject.entity';
import { Period } from '../period/period.entity';
import { AcademicYear } from '../academic-year/academic-year.entity';

@Entity('class_subject_coefficient')
export class ClassSubjectCoefficient {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => AcademicYear, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'academic_year_id' })
  academic_year: AcademicYear;

  @ManyToOne(() => Class, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'class_id' })
  class: Class;

  @ManyToOne(() => Subject, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'subject_id' })
  subject: Subject;

  @ManyToOne(() => Period, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'period_id' })
  period: Period;

  @Column({ type: 'decimal', precision: 6, scale: 2 })
  coefficient: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

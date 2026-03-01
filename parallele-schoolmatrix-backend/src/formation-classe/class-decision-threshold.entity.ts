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
import { Class } from '../classes/class.entity';
import { AcademicYear } from '../academic-year/academic-year.entity';

/** Seuils de moyenne pour les décisions de fin d'année par classe et année */
@Entity('class_decision_threshold')
@Unique(['class', 'academic_year'])
export class ClassDecisionThreshold {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Class, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'class_id' })
  class: Class;

  @ManyToOne(() => AcademicYear, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'academic_year_id' })
  academic_year: AcademicYear;

  /** Moyenne minimale pour ADMIS (ex: 10) */
  @Column({ type: 'decimal', precision: 6, scale: 2, default: '10' })
  min_average_admis: string;

  /** Moyenne minimale pour REDOUBLER (ex: 5). En dessous = RENVOYE pour moyennes */
  @Column({ type: 'decimal', precision: 6, scale: 2, default: '5' })
  min_average_redoubler: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

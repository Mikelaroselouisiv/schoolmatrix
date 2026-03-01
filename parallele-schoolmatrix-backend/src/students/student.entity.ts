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

@Entity('student')
export class Student {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  first_name: string;

  @Column()
  last_name: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  address: string;

  @Column({ type: 'date', nullable: true })
  birth_date: Date;

  @Column({ type: 'varchar', length: 200, nullable: true })
  birth_place: string;

  @Column({ nullable: true })
  gender: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  photo_identity_student: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  photo_identity_mother: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  photo_identity_father: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  photo_identity_responsible: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  mother_name: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  mother_phone: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  father_name: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  father_phone: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  responsible_name: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  responsible_phone: string;

  @ManyToOne(() => Class, (cls) => cls.students, { nullable: false })
  @JoinColumn({ name: 'class_id' })
  class: Class;

  @Column({ type: 'varchar', length: 50, unique: true, nullable: true })
  order_number: string | null;

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Student } from './student.entity';
import { Class } from '../classes/class.entity';

@Injectable()
export class StudentsService {
  constructor(
    @InjectRepository(Student)
    private readonly studentRepo: Repository<Student>,
  ) {}

  private randomLetter(): string {
    return 'ABCDEFGHJKLMNPQRSTUVWXYZ'[Math.floor(Math.random() * 24)];
  }

  private randomDigit(): string {
    return String(Math.floor(Math.random() * 10));
  }

  /** Génère un numéro de dossier unique : 2 lettres + 6 chiffres (ex: KJ482917) */
  private async generateDossierNumber(excludeStudentId?: string): Promise<string> {
    const letters = Array.from({ length: 2 }, () => this.randomLetter()).join('');
    const digits = Array.from({ length: 6 }, () => this.randomDigit()).join('');
    const candidate = `${letters}${digits}`;
    const qb = this.studentRepo.createQueryBuilder('s').where('s.order_number = :candidate', { candidate });
    if (excludeStudentId) {
      qb.andWhere('s.id != :excludeId', { excludeId: excludeStudentId });
    }
    const exists = await qb.getOne();
    if (exists) return this.generateDossierNumber(excludeStudentId);
    return candidate;
  }

  async findAll(classId?: string): Promise<Student[]> {
    const qb = this.studentRepo
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.class', 'c')
      .orderBy('s.last_name', 'ASC')
      .addOrderBy('s.first_name', 'ASC');
    if (classId) {
      qb.andWhere('s.class_id = :classId', { classId });
    }
    return qb.getMany();
  }

  async findOne(id: string): Promise<Student> {
    const s = await this.studentRepo.findOne({
      where: { id },
      relations: ['class'],
    });
    if (!s) {
      throw new NotFoundException('Student not found');
    }
    return s;
  }

  async create(params: {
    first_name: string;
    last_name: string;
    class_id: string;
    email?: string;
    phone?: string;
    address?: string;
    birth_date?: string;
    birth_place?: string;
    gender?: string;
    photo_identity_student?: string;
    photo_identity_mother?: string;
    photo_identity_father?: string;
    photo_identity_responsible?: string;
    mother_name?: string;
    mother_phone?: string;
    father_name?: string;
    father_phone?: string;
    responsible_name?: string;
    responsible_phone?: string;
  }): Promise<Student> {
    const order_number = await this.generateDossierNumber();
    const student = this.studentRepo.create({
      order_number,
      first_name: params.first_name.trim(),
      last_name: params.last_name.trim(),
      email: params.email?.trim(),
      phone: params.phone?.trim(),
      address: params.address?.trim(),
      birth_date: params.birth_date ? new Date(params.birth_date) : undefined,
      birth_place: params.birth_place?.trim(),
      gender: params.gender?.trim(),
      photo_identity_student: params.photo_identity_student?.trim() || undefined,
      photo_identity_mother: params.photo_identity_mother?.trim() || undefined,
      photo_identity_father: params.photo_identity_father?.trim() || undefined,
      photo_identity_responsible:
        params.photo_identity_responsible?.trim() || undefined,
      mother_name: params.mother_name?.trim() || undefined,
      mother_phone: params.mother_phone?.trim() || undefined,
      father_name: params.father_name?.trim() || undefined,
      father_phone: params.father_phone?.trim() || undefined,
      responsible_name: params.responsible_name?.trim() || undefined,
      responsible_phone: params.responsible_phone?.trim() || undefined,
      class: { id: params.class_id },
      active: true,
    });
    return this.studentRepo.save(student);
  }

  async update(
    id: string,
    params: Partial<{
      first_name: string;
      last_name: string;
      class_id: string;
      email: string;
      phone: string;
      address: string;
      birth_date: string;
      birth_place: string;
      gender: string;
      active: boolean;
      photo_identity_student: string;
      photo_identity_mother: string;
      photo_identity_father: string;
      photo_identity_responsible: string;
      mother_name: string;
      mother_phone: string;
      father_name: string;
      father_phone: string;
      responsible_name: string;
      responsible_phone: string;
    }>,
  ): Promise<Student> {
    const student = await this.studentRepo.findOne({
      where: { id },
      relations: ['class'],
    });
    if (!student) {
      throw new NotFoundException('Student not found');
    }
    if (!student.order_number || !student.order_number.trim()) {
      student.order_number = await this.generateDossierNumber(student.id);
    }
    if (params.first_name !== undefined) student.first_name = params.first_name.trim();
    if (params.last_name !== undefined) student.last_name = params.last_name.trim();
    if (params.class_id !== undefined) student.class = { id: params.class_id } as Class;
    if (params.email !== undefined) student.email = params.email.trim() || undefined;
    if (params.phone !== undefined) student.phone = params.phone.trim() || undefined;
    if (params.address !== undefined) student.address = params.address.trim() || undefined;
    if (params.birth_date !== undefined) {
      student.birth_date = params.birth_date ? new Date(params.birth_date) : undefined;
    }
    if (params.birth_place !== undefined) {
      student.birth_place = params.birth_place?.trim() || undefined;
    }
    if (params.gender !== undefined) student.gender = params.gender.trim() || undefined;
    if (params.active !== undefined) student.active = params.active;
    if (params.photo_identity_student !== undefined) {
      student.photo_identity_student =
        params.photo_identity_student?.trim() || undefined;
    }
    if (params.photo_identity_mother !== undefined) {
      student.photo_identity_mother =
        params.photo_identity_mother?.trim() || undefined;
    }
    if (params.photo_identity_father !== undefined) {
      student.photo_identity_father =
        params.photo_identity_father?.trim() || undefined;
    }
    if (params.photo_identity_responsible !== undefined) {
      student.photo_identity_responsible =
        params.photo_identity_responsible?.trim() || undefined;
    }
    if (params.mother_name !== undefined) {
      student.mother_name = params.mother_name?.trim() || undefined;
    }
    if (params.mother_phone !== undefined) {
      student.mother_phone = params.mother_phone?.trim() || undefined;
    }
    if (params.father_name !== undefined) {
      student.father_name = params.father_name?.trim() || undefined;
    }
    if (params.father_phone !== undefined) {
      student.father_phone = params.father_phone?.trim() || undefined;
    }
    if (params.responsible_name !== undefined) {
      student.responsible_name = params.responsible_name?.trim() || undefined;
    }
    if (params.responsible_phone !== undefined) {
      student.responsible_phone = params.responsible_phone?.trim() || undefined;
    }
    return this.studentRepo.save(student);
  }

  async regenerateOrderNumber(id: string): Promise<Student> {
    const student = await this.studentRepo.findOne({
      where: { id },
      relations: ['class'],
    });
    if (!student) {
      throw new NotFoundException('Student not found');
    }
    student.order_number = await this.generateDossierNumber(id);
    return this.studentRepo.save(student);
  }

  async delete(id: string): Promise<void> {
    const student = await this.studentRepo.findOne({ where: { id } });
    if (!student) {
      throw new NotFoundException('Student not found');
    }
    await this.studentRepo.remove(student);
  }
}

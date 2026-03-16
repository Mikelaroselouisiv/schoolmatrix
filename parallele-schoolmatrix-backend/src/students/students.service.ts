import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Student } from './student.entity';
import { Class } from '../classes/class.entity';
import { FormationClasseService } from '../formation-classe/formation-classe.service';
import { ClassesService } from '../classes/classes.service';

export type ImportResult = {
  created: number;
  skipped: number;
  errors: { row: number; message: string }[];
};

@Injectable()
export class StudentsService {
  constructor(
    @InjectRepository(Student)
    private readonly studentRepo: Repository<Student>,
    @Inject(forwardRef(() => FormationClasseService))
    private readonly formationClasseService: FormationClasseService,
    private readonly classesService: ClassesService,
  ) {}

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
    order_number: string;
    academic_year_id?: string;
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
    const raw = (params.order_number ?? '').trim();
    if (!raw) {
      throw new BadRequestException('L\'identifiant élève (numéro ministère) est obligatoire.');
    }
    const existing = await this.studentRepo.findOne({ where: { order_number: raw } });
    if (existing) {
      throw new BadRequestException(`Un élève avec l'identifiant « ${raw} » existe déjà.`);
    }
    const student = this.studentRepo.create({
      order_number: raw,
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
    const saved = await this.studentRepo.save(student);
    if (params.academic_year_id) {
      await this.formationClasseService.addStudentToClass(
        saved.id,
        params.academic_year_id,
        params.class_id,
      );
    }
    return saved;
  }

  async update(
    id: string,
    params: Partial<{
      first_name: string;
      last_name: string;
      class_id: string;
      order_number: string;
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
    if (params.order_number !== undefined) {
      const raw = params.order_number.trim();
      if (raw) {
        const existing = await this.studentRepo.findOne({ where: { order_number: raw } });
        if (existing && existing.id !== id) {
          throw new BadRequestException(`Un élève avec l'identifiant « ${raw} » existe déjà.`);
        }
        student.order_number = raw;
      } else {
        student.order_number = null;
      }
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

  async findByOrderNumber(orderNumber: string): Promise<Student | null> {
    const raw = (orderNumber ?? '').trim();
    if (!raw) return null;
    return this.studentRepo.findOne({
      where: { order_number: raw },
      relations: ['class'],
    });
  }

  async delete(id: string): Promise<void> {
    const student = await this.studentRepo.findOne({ where: { id } });
    if (!student) {
      throw new NotFoundException('Student not found');
    }
    await this.studentRepo.remove(student);
  }

  /** Import en masse depuis un CSV (UTF-8, séparateur ;). Première ligne = en-têtes. */
  async importFromCsv(csvContent: string, academicYearId: string): Promise<ImportResult> {
    const result: ImportResult = { created: 0, skipped: 0, errors: [] };
    const lines = csvContent.split(/\r?\n/).map((line) => line.split(';').map((cell) => cell.trim()));
    if (lines.length < 2) {
      result.errors.push({ row: 0, message: 'Fichier vide ou une seule ligne (en-têtes requis).' });
      return result;
    }
    const headerRow = lines[0].map((h) => h.toLowerCase().replace(/\s+/g, '_').normalize('NFD').replace(/\p{Diacritic}/gu, ''));
    const idx = (names: string[]) => {
      const i = headerRow.findIndex((h) => names.some((n) => h === n || h.includes(n)));
      return i >= 0 ? i : -1;
    };
    const iOrder = idx(['identifiant', 'order_number', 'numero_ministere', 'numero']);
    const iPrenom = idx(['prenom', 'first_name']);
    const iNom = idx(['nom', 'last_name']);
    const iClasse = idx(['classe', 'class']);
    if (iOrder < 0 || iPrenom < 0 || iNom < 0 || iClasse < 0) {
      result.errors.push({
        row: 0,
        message: 'En-têtes requis : Identifiant (ou N° ministère), Prénom, Nom, Classe. Voir le modèle.',
      });
      return result;
    }
    const iDate = idx(['date_naissance', 'date_naissance', 'birth_date', 'date']);
    const iGenre = idx(['genre', 'gender']);
    const iTel = idx(['telephone', 'tel', 'phone']);
    const iEmail = idx(['email']);
    const iNomMere = idx(['nom_mere', 'mere', 'mother_name']);
    const iTelMere = idx(['tel_mere', 'telephone_mere']);
    const iNomPere = idx(['nom_pere', 'pere', 'father_name']);
    const iTelPere = idx(['tel_pere', 'telephone_pere']);

    const allClasses = await this.classesService.findAll();
    const classByName = new Map<string, string>(allClasses.map((c) => [c.name.trim(), c.id]));

    for (let r = 1; r < lines.length; r++) {
      const row = lines[r];
      const rowNum = r + 1;
      const get = (i: number) => (i >= 0 && i < row.length ? (row[i] ?? '').trim() : '');
      const orderNumber = get(iOrder);
      const first_name = get(iPrenom);
      const last_name = get(iNom);
      const className = get(iClasse);
      if (!orderNumber) {
        result.errors.push({ row: rowNum, message: 'Identifiant (n° ministère) manquant.' });
        continue;
      }
      if (!first_name || !last_name) {
        result.errors.push({ row: rowNum, message: 'Prénom et nom obligatoires.' });
        continue;
      }
      if (!className) {
        result.errors.push({ row: rowNum, message: 'Classe manquante.' });
        continue;
      }
      const classId = classByName.get(className);
      if (!classId) {
        result.errors.push({ row: rowNum, message: `Classe « ${className} » introuvable. Créez-la d'abord.` });
        continue;
      }
      const existing = await this.studentRepo.findOne({ where: { order_number: orderNumber } });
      if (existing) {
        result.skipped++;
        continue;
      }
      const birth_date = get(iDate);
      const gender = get(iGenre);
      const phone = get(iTel);
      const email = get(iEmail);
      const mother_name = get(iNomMere);
      const mother_phone = get(iTelMere);
      const father_name = get(iNomPere);
      const father_phone = get(iTelPere);
      try {
        await this.create({
          order_number: orderNumber,
          first_name,
          last_name,
          class_id: classId,
          academic_year_id: academicYearId,
          birth_date: birth_date && /^\d{4}-\d{2}-\d{2}$/.test(birth_date) ? birth_date : undefined,
          gender: gender || undefined,
          phone: phone || undefined,
          email: email || undefined,
          mother_name: mother_name || undefined,
          mother_phone: mother_phone || undefined,
          father_name: father_name || undefined,
          father_phone: father_phone || undefined,
        });
        result.created++;
      } catch (err: any) {
        result.errors.push({ row: rowNum, message: err?.message || 'Erreur à l\'enregistrement.' });
      }
    }
    return result;
  }
}

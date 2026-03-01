import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StudentClassAssignment } from './student-class-assignment.entity';
import { ClassDecisionThreshold } from './class-decision-threshold.entity';
import { Student } from '../students/student.entity';
import { Class } from '../classes/class.entity';
import { AcademicYear } from '../academic-year/academic-year.entity';
import { Grade } from '../grades/grade.entity';
import { ClassSubjectCoefficient } from '../grades/class-subject-coefficient.entity';
import { DisciplinaryMeasure } from '../discipline/disciplinary-measure.entity';
import {
  DECISION_ADMIS,
  DECISION_REDOUBLER,
  DECISION_RENVOYE,
  DECISION_EXPELLED,
} from './student-class-assignment.entity';

@Injectable()
export class FormationClasseService {
  constructor(
    @InjectRepository(StudentClassAssignment)
    private readonly assignmentRepo: Repository<StudentClassAssignment>,
    @InjectRepository(ClassDecisionThreshold)
    private readonly thresholdRepo: Repository<ClassDecisionThreshold>,
    @InjectRepository(Student)
    private readonly studentRepo: Repository<Student>,
    @InjectRepository(Class)
    private readonly classRepo: Repository<Class>,
    @InjectRepository(AcademicYear)
    private readonly academicYearRepo: Repository<AcademicYear>,
    @InjectRepository(Grade)
    private readonly gradeRepo: Repository<Grade>,
    @InjectRepository(ClassSubjectCoefficient)
    private readonly coefRepo: Repository<ClassSubjectCoefficient>,
    @InjectRepository(DisciplinaryMeasure)
    private readonly measureRepo: Repository<DisciplinaryMeasure>,
  ) {}

  async getStudentsByClassAndYear(academicYearId: string, classId: string): Promise<any[]> {
    const assignments = await this.assignmentRepo.find({
      where: {
        academic_year: { id: academicYearId },
        class: { id: classId },
      },
      relations: ['student', 'class', 'academic_year'],
      order: { student: { last_name: 'ASC', first_name: 'ASC' } as any },
    });
    return assignments.map((a) => ({
      id: a.student?.id,
      first_name: a.student?.first_name,
      last_name: a.student?.last_name,
      order_number: (a.student as any)?.order_number,
      decision: a.decision,
      average: a.average ? Number(a.average) : null,
      assignment_id: a.id,
    }));
  }

  /** Retourne les élèves d'une classe pour une année. Utilise student_class_assignment si existant, sinon student.class_id. */
  async getClassStudents(academicYearId: string, classId: string): Promise<any[]> {
    const assignments = await this.assignmentRepo.find({
      where: {
        academic_year: { id: academicYearId },
        class: { id: classId },
      },
      relations: ['student', 'class', 'academic_year'],
      order: { student: { last_name: 'ASC', first_name: 'ASC' } as any },
    });
    if (assignments.length > 0) {
      return assignments.map((a) => ({
        id: a.student?.id,
        first_name: a.student?.first_name,
        last_name: a.student?.last_name,
        order_number: (a.student as Student)?.order_number,
        decision: a.decision,
        average: a.average ? Number(a.average) : null,
        assignment_id: a.id,
      }));
    }
    // Fallback: étudiants avec class_id actuel (pour première année ou compatibilité)
    const students = await this.studentRepo.find({
      where: { class: { id: classId } },
      relations: ['class'],
      order: { last_name: 'ASC', first_name: 'ASC' },
    });
    return students.map((s) => ({
      id: s.id,
      first_name: s.first_name,
      last_name: s.last_name,
      order_number: s.order_number,
      decision: null,
      average: null,
      assignment_id: null,
    }));
  }

  async getOrCreateThreshold(classId: string, academicYearId: string): Promise<ClassDecisionThreshold> {
    let t = await this.thresholdRepo.findOne({
      where: { class: { id: classId }, academic_year: { id: academicYearId } },
      relations: ['class', 'academic_year'],
    });
    if (!t) {
      t = this.thresholdRepo.create({
        class: { id: classId },
        academic_year: { id: academicYearId },
        min_average_admis: '10',
        min_average_redoubler: '5',
      });
      t = await this.thresholdRepo.save(t);
    }
    return t;
  }

  async saveThreshold(
    classId: string,
    academicYearId: string,
    minAverageAdmis: number,
    minAverageRedoubler: number,
  ): Promise<ClassDecisionThreshold> {
    const t = await this.getOrCreateThreshold(classId, academicYearId);
    t.min_average_admis = String(minAverageAdmis);
    t.min_average_redoubler = String(minAverageRedoubler);
    return this.thresholdRepo.save(t);
  }

  async findAllThresholds(academicYearId?: string, classId?: string): Promise<any[]> {
    const qb = this.thresholdRepo
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.class', 'c')
      .leftJoinAndSelect('t.academic_year', 'ay')
      .orderBy('ay.name', 'DESC')
      .addOrderBy('c.name', 'ASC');
    if (academicYearId) qb.andWhere('t.academic_year_id = :ay', { ay: academicYearId });
    if (classId) qb.andWhere('t.class_id = :cid', { cid: classId });
    const list = await qb.getMany();
    return list.map((t) => ({
      id: t.id,
      class_id: t.class?.id,
      class_name: t.class?.name,
      academic_year_id: t.academic_year?.id,
      academic_year_name: t.academic_year?.name,
      min_average_admis: Number(t.min_average_admis),
      min_average_redoubler: Number(t.min_average_redoubler),
    }));
  }

  async computeStudentAverage(studentId: string, academicYearId: string, classId: string): Promise<number | null> {
    const grades = await this.gradeRepo.find({
      where: {
        student: { id: studentId },
        academic_year: { id: academicYearId },
        class: { id: classId },
      },
      relations: ['subject', 'period'],
    });
    if (grades.length === 0) return null;
    let sum = 0;
    let totalCoef = 0;
    for (const g of grades) {
      const coef = Number(g.coefficient) || 1;
      sum += Number(g.grade_value) * coef;
      totalCoef += coef;
    }
    if (totalCoef === 0) return null;
    return Math.round((sum / totalCoef) * 100) / 100;
  }

  async hasExpelledMeasure(studentId: string): Promise<boolean> {
    const m = await this.measureRepo.findOne({
      where: { student: { id: studentId }, measure_type: 'RENVOYE_DEFINITIVEMENT' },
    });
    return !!m;
  }

  async computeAndSetDecisions(academicYearId: string, classId: string): Promise<{ updated: number }> {
    const threshold = await this.getOrCreateThreshold(classId, academicYearId);
    const minAdmis = Number(threshold.min_average_admis);
    const minRedoubler = Number(threshold.min_average_redoubler);

    const assignments = await this.assignmentRepo.find({
      where: { academic_year: { id: academicYearId }, class: { id: classId } },
      relations: ['student'],
    });

    let updated = 0;
    for (const a of assignments) {
      const sid = a.student?.id;
      if (!sid) continue;

      const expelled = await this.hasExpelledMeasure(sid);
      if (expelled) {
        a.decision = DECISION_EXPELLED;
        a.average = a.average;
        await this.assignmentRepo.save(a);
        updated++;
        continue;
      }

      const avg = await this.computeStudentAverage(sid, academicYearId, classId);
      a.average = avg != null ? String(avg) : null;

      if (avg == null) {
        a.decision = null;
      } else if (avg >= minAdmis) {
        a.decision = DECISION_ADMIS;
      } else if (avg >= minRedoubler) {
        a.decision = DECISION_REDOUBLER;
      } else {
        a.decision = DECISION_RENVOYE;
      }
      await this.assignmentRepo.save(a);
      updated++;
    }
    return { updated };
  }

  async setDecision(assignmentId: string, decision: string): Promise<StudentClassAssignment> {
    const a = await this.assignmentRepo.findOne({
      where: { id: assignmentId },
      relations: ['student', 'class', 'academic_year'],
    });
    if (!a) throw new NotFoundException('Assignment not found');
    a.decision = decision;
    return this.assignmentRepo.save(a);
  }

  async ensureAssignmentsFromCurrentStudents(academicYearId: string): Promise<{ created: number }> {
    const students = await this.studentRepo.find({
      where: { active: true },
      relations: ['class'],
    });

    let created = 0;
    for (const s of students) {
      if (!s.class?.id) continue;
      const existing = await this.assignmentRepo.findOne({
        where: { student: { id: s.id }, academic_year: { id: academicYearId } },
      });
      if (existing) continue;

      const a = this.assignmentRepo.create({
        student: { id: s.id },
        academic_year: { id: academicYearId },
        class: { id: s.class.id },
        decision: null,
        average: null,
      });
      await this.assignmentRepo.save(a);
      created++;
    }
    return { created };
  }

  async runFormationForNextYear(currentYearId: string, nextYearId: string): Promise<{ created: number; promoted: number }> {
    const currentYear = await this.academicYearRepo.findOne({ where: { id: currentYearId } });
    const nextYear = await this.academicYearRepo.findOne({ where: { id: nextYearId } });
    if (!currentYear || !nextYear) throw new BadRequestException('Année académique introuvable');

    const classes = await this.classRepo.find({ order: { name: 'ASC' } });
    const classByName = new Map(classes.map((c) => [c.name, c]));

    let created = 0;
    let promoted = 0;

    const assignments = await this.assignmentRepo.find({
      where: { academic_year: { id: currentYearId } },
      relations: ['student', 'class', 'academic_year'],
    });

    for (const a of assignments) {
      const sid = a.student?.id;
      if (!sid) continue;

      const existingNext = await this.assignmentRepo.findOne({
        where: { student: { id: sid }, academic_year: { id: nextYearId } },
      });
      if (existingNext) continue;

      let nextClassId: string;
      if (a.decision === DECISION_ADMIS) {
        const currentClass = a.class;
        const nextClass = this.findNextLevelClass(currentClass, classes);
        nextClassId = nextClass?.id ?? currentClass?.id;
        promoted++;
      } else if (a.decision === DECISION_REDOUBLER || a.decision === DECISION_RENVOYE || a.decision === DECISION_EXPELLED) {
        nextClassId = a.class?.id;
      } else {
        nextClassId = a.class?.id;
      }

      const nextA = this.assignmentRepo.create({
        student: { id: sid },
        academic_year: { id: nextYearId },
        class: { id: nextClassId },
        decision: null,
        average: null,
      });
      await this.assignmentRepo.save(nextA);
      created++;
    }

    const { created: extra } = await this.ensureAssignmentsFromCurrentStudents(nextYearId);
    created += extra;

    return { created, promoted };
  }

  private findNextLevelClass(current: Class, classes: Class[]): Class | null {
    const name = current?.name ?? '';
    const match = name.match(/^(\d+)([A-Za-z]*)$/);
    if (!match) return null;
    const level = parseInt(match[1], 10);
    const suffix = match[2] || '';
    const nextName = `${level + 1}${suffix}`;
    return classes.find((c) => c.name === nextName) ?? null;
  }

  async addStudentToClass(studentId: string, academicYearId: string, classId: string): Promise<StudentClassAssignment> {
    const existing = await this.assignmentRepo.findOne({
      where: { student: { id: studentId }, academic_year: { id: academicYearId } },
    });
    if (existing) {
      existing.class = { id: classId } as Class;
      return this.assignmentRepo.save(existing);
    }
    const a = this.assignmentRepo.create({
      student: { id: studentId },
      academic_year: { id: academicYearId },
      class: { id: classId },
      decision: null,
      average: null,
    });
    return this.assignmentRepo.save(a);
  }

  async removeStudentFromClass(assignmentId: string): Promise<void> {
    const a = await this.assignmentRepo.findOne({ where: { id: assignmentId } });
    if (!a) throw new NotFoundException('Assignment not found');
    await this.assignmentRepo.remove(a);
  }
}

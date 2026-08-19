import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserLinkedStudent } from '../users/user-linked-student.entity';

export interface ParentChild {
  id: string;
  order_number: string | null;
  first_name: string;
  last_name: string;
  class_id: string | null;
  class_name: string | null;
  photo_identity_student: string | null;
}

/**
 * Rattachement parent → élève.
 *
 * Source unique : `user_linked_student`, alimentée par `linked_student_ids`
 * dans l'administration des utilisateurs. L'ancienne table `student_parent`
 * n'était écrite par aucun code : cet endpoint renvoyait donc toujours une
 * liste vide. Elle n'est plus lue.
 */
@Injectable()
export class StudentParentsService {
  constructor(
    @InjectRepository(UserLinkedStudent)
    private readonly linkedRepo: Repository<UserLinkedStudent>,
  ) {}

  async getChildrenForParent(parentUserId: number): Promise<ParentChild[]> {
    const links = await this.linkedRepo
      .createQueryBuilder('l')
      .innerJoinAndSelect('l.student', 's')
      .leftJoinAndSelect('s.class', 'c')
      .where('l.user_id = :uid', { uid: parentUserId })
      .orderBy('s.last_name', 'ASC')
      .addOrderBy('s.first_name', 'ASC')
      .getMany();

    return links.map((l) => ({
      id: l.student.id,
      order_number: l.student.order_number ?? null,
      first_name: l.student.first_name,
      last_name: l.student.last_name,
      class_id: l.student.class?.id ?? null,
      class_name: l.student.class?.name ?? null,
      photo_identity_student: l.student.photo_identity_student ?? null,
    }));
  }

  /** Identifiants d'élèves rattachés — utilisé par le périmètre parent. */
  async getLinkedStudentIds(parentUserId: number): Promise<string[]> {
    const rows = await this.linkedRepo
      .createQueryBuilder('l')
      .select('l.student_id', 'student_id')
      .where('l.user_id = :uid', { uid: parentUserId })
      .getRawMany<{ student_id: string }>();
    return rows.map((r) => r.student_id).filter(Boolean);
  }
}

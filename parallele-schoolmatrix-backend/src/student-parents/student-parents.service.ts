import { Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';

@Injectable()
export class StudentParentsService {
  constructor(private readonly users: UsersService) {}

  /** Même source que GET /users/me/linked-students (user_linked_student). */
  async getChildrenForParent(parentUserId: number): Promise<any[]> {
    const user = await this.users.findOne(parentUserId).catch(() => null);
    if (!user) return [];
    const roleName = user.role?.name ?? (typeof user.role === 'string' ? user.role : '');
    if (roleName !== 'PARENT') return [];
    return this.users.getLinkedStudentsForFiche(parentUserId);
  }
}

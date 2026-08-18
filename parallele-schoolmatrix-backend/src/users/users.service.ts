import { Injectable, NotFoundException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './user.entity';
import { UserLinkedStudent } from './user-linked-student.entity';
import { Role } from '../roles/role.entity';
import { Student } from '../students/student.entity';
import { SyncKickService } from '../sync/sync-kick.service';
import { DEFAULT_STAFF_EMAIL_DOMAIN, DEFAULT_STAFF_PASSWORD } from './staff-account.constants';
import { buildStaffEmail } from './staff-email';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    @InjectRepository(UserLinkedStudent)
    private readonly linkedStudentRepo: Repository<UserLinkedStudent>,
    @InjectRepository(Role)
    private readonly rolesRepo: Repository<Role>,
    @InjectRepository(Student)
    private readonly studentRepo: Repository<Student>,
    private readonly syncKick: SyncKickService,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepo.findOne({ where: { email: email.toLowerCase().trim() } });
  }

  async findByEmailOrPhone(login: string): Promise<User | null> {
    const trimmed = login.trim();
    if (!trimmed) return null;
    const byEmail = await this.findByEmail(trimmed);
    if (byEmail) return byEmail;
    const digitsOnly = trimmed.replace(/\D/g, '');
    if (digitsOnly.length < 6) return null;
    const users = await this.usersRepo
      .createQueryBuilder('u')
      .where("REGEXP_REPLACE(COALESCE(u.phone, ''), '[^0-9]', '', 'g') = :digits", { digits: digitsOnly })
      .getMany();
    return users[0] ?? null;
  }

  async countUsers(): Promise<number> {
    return this.usersRepo.count();
  }

  async findAll(): Promise<User[]> {
    return this.usersRepo.find({ order: { id: 'ASC' } });
  }

  async findParents(): Promise<User[]> {
    return this.usersRepo
      .createQueryBuilder('u')
      .leftJoinAndSelect('u.role', 'r')
      .where('r.name = :role', { role: 'PARENT' })
      .getMany();
  }

  async findOne(id: number): Promise<User> {
    const user = await this.usersRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async createUser(params: {
    first_name?: string;
    last_name?: string;
    email: string;
    address?: string;
    phone?: string;
    whatsapp?: string;
    password: string;
    roleName?: string;
    profile_photo_url?: string;
    cover_photo_url?: string;
    order_number?: string;
    linked_student_ids?: string[];
    must_change_password?: boolean;
  }): Promise<User> {
    const email = params.email.toLowerCase().trim();
    const first_name = params.first_name?.trim() || '—';
    const last_name = params.last_name?.trim() || '—';
    const address = params.address?.trim() || '—';
    const phone = params.phone?.trim() || '—';
    const exists = await this.usersRepo.findOne({ where: { email } });
    if (exists) throw new BadRequestException('Email already exists');
    const pwd = (params.password ?? '').trim();
    if (pwd.length < 6) throw new BadRequestException('Le mot de passe doit faire au moins 6 caractères');
    const roleName = (params.roleName ?? 'PARENT').toUpperCase().trim();
    const role = await this.rolesRepo.findOne({ where: { name: roleName } });
    if (!role) throw new BadRequestException(`Role not found: ${roleName}`);
    const password_hash = await bcrypt.hash(pwd, 10);
    const user = this.usersRepo.create({
      first_name,
      last_name,
      email,
      address,
      phone,
      whatsapp: params.whatsapp?.trim(),
      profile_photo_url: params.profile_photo_url?.trim(),
      cover_photo_url: params.cover_photo_url?.trim(),
      order_number: params.order_number?.trim() || undefined,
      password_hash,
      role,
      active: true,
      must_change_password: params.must_change_password === true,
    });
    const saved = await this.usersRepo.save(user);
    if (params.linked_student_ids?.length) {
      for (const studentId of [...new Set(params.linked_student_ids.filter(Boolean))]) {
        await this.linkStudent(saved.id, studentId, false);
      }
    }
    this.syncKick.kick('user-create');
    return saved;
  }

  /**
   * Lien officiel compte ↔ élève (`user_linked_student`) — même table que
   * l’écran Utilisateurs (« Dossiers élèves liés » / n° ministère).
   * Ajoute sans retirer les autres enfants déjà liés.
   */
  async linkStudent(userId: number, studentId: string, kick = true): Promise<boolean> {
    const student = await this.studentRepo.findOne({ where: { id: studentId } });
    if (!student) return false;
    const existing = await this.linkedStudentRepo.findOne({
      where: { user: { id: userId }, student: { id: studentId } },
    });
    if (existing) return false;
    await this.linkedStudentRepo.save(
      this.linkedStudentRepo.create({
        user: { id: userId } as User,
        student: { id: studentId } as Student,
      }),
    );
    if (kick) this.syncKick.kick('user-link-student');
    return true;
  }

  async setUserRole(userId: number, roleName: string): Promise<User> {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    const role = await this.rolesRepo.findOne({ where: { name: roleName.toUpperCase().trim() } });
    if (!role) throw new BadRequestException(`Role not found: ${roleName}`);
    user.role = role;
    const saved = await this.usersRepo.save(user);
    this.syncKick.kick('user-role');
    return saved;
  }

  async updateUser(userId: number, params: Partial<{
    first_name: string;
    last_name: string;
    email: string;
    address: string;
    phone: string;
    whatsapp: string;
    active: boolean;
    profile_photo_url: string;
    cover_photo_url: string;
    order_number: string;
    password: string;
    linked_student_ids: string[];
  }>): Promise<User> {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (params.first_name !== undefined) user.first_name = params.first_name.trim() || undefined;
    if (params.last_name !== undefined) user.last_name = params.last_name.trim() || undefined;
    if (params.email !== undefined) {
      const email = params.email.toLowerCase().trim();
      const exists = await this.usersRepo.findOne({ where: { email } });
      if (exists && exists.id !== userId) throw new BadRequestException('Email already exists');
      user.email = email;
    }
    if (params.address !== undefined) user.address = params.address.trim() || undefined;
    if (params.phone !== undefined) user.phone = params.phone.trim() || undefined;
    if (params.whatsapp !== undefined) user.whatsapp = params.whatsapp.trim() || undefined;
    if (params.active !== undefined) user.active = params.active;
    if (params.profile_photo_url !== undefined) user.profile_photo_url = params.profile_photo_url.trim() || undefined;
    if (params.cover_photo_url !== undefined) user.cover_photo_url = params.cover_photo_url.trim() || undefined;
    if (params.order_number !== undefined) user.order_number = params.order_number.trim() || null;
    if (params.password !== undefined && params.password.length > 0) {
      user.password_hash = await bcrypt.hash(params.password, 10);
    }
    if (params.linked_student_ids !== undefined) {
      await this.linkedStudentRepo.delete({ user: { id: userId } });
      for (const studentId of [...new Set(params.linked_student_ids.filter(Boolean))]) {
        await this.linkStudent(userId, studentId, false);
      }
    }
    const saved = await this.usersRepo.save(user);
    this.syncKick.kick('user-update');
    return saved;
  }

  async getLinkedStudentIds(userId: number): Promise<string[]> {
    const links = await this.linkedStudentRepo.find({
      where: { user: { id: userId } },
      relations: ['student'],
    });
    return links.map((l) => l.student.id);
  }

  async getLinkedStudentsForFiche(userId: number): Promise<{ id: string; order_number: string | null; first_name: string; last_name: string; class_id: string; class_name: string }[]> {
    const links = await this.linkedStudentRepo.find({
      where: { user: { id: userId } },
      relations: ['student', 'student.class'],
    });
    return links.map((l) => ({
      id: l.student.id,
      order_number: l.student.order_number ?? null,
      first_name: l.student.first_name,
      last_name: l.student.last_name,
      class_id: l.student.class?.id ?? '',
      class_name: l.student.class?.name ?? '—',
    }));
  }

  async deleteUser(userId: number): Promise<{ deleted: boolean }> {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    await this.usersRepo.remove(user);
    this.syncKick.kick('user-delete');
    return { deleted: true };
  }

  async validatePassword(user: User, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.password_hash);
  }

  async resetPassword(userId: number, newPassword: string): Promise<User> {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    const pwd = newPassword?.trim() ?? '';
    if (pwd.length < 6) throw new BadRequestException('Le mot de passe doit faire au moins 6 caractères');
    user.password_hash = await bcrypt.hash(pwd, 10);
    user.must_change_password = true;
    const saved = await this.usersRepo.save(user);
    this.syncKick.kick('user-password');
    return saved;
  }

  private phoneDigits(phone: string): string {
    return phone.replace(/\D/g, '');
  }

  async findByPhoneDigits(digits: string): Promise<User | null> {
    if (digits.length < 6) return null;
    return (
      (await this.usersRepo
        .createQueryBuilder('u')
        .where("REGEXP_REPLACE(COALESCE(u.phone, ''), '[^0-9]', '', 'g') = :digits", { digits })
        .getOne()) ?? null
    );
  }

  async assertEmailAvailable(email: string, exceptUserId?: number): Promise<void> {
    const exists = await this.usersRepo.findOne({ where: { email } });
    if (exists && exists.id !== exceptUserId) {
      throw new BadRequestException('Cet e-mail est déjà utilisé');
    }
  }

  async assertPhoneAvailable(phone: string, exceptUserId?: number): Promise<void> {
    const digits = this.phoneDigits(phone);
    if (digits.length < 6) return;
    const existing = await this.findByPhoneDigits(digits);
    if (existing && existing.id !== exceptUserId) {
      throw new BadRequestException('Ce numéro de téléphone est déjà utilisé');
    }
  }

  async nextAvailableStaffEmail(lastName: string, firstName: string, domain: string): Promise<string> {
    const base = buildStaffEmail(lastName, firstName, domain);
    const at = base.indexOf('@');
    const local = base.slice(0, at);
    const host = base.slice(at);
    let candidate = base;
    let n = 1;
    while (await this.usersRepo.findOne({ where: { email: candidate } })) {
      n += 1;
      candidate = `${local}${n}${host}`;
    }
    return candidate;
  }

  async updateOwnProfile(
    userId: number,
    params: Partial<{ first_name: string; last_name: string; email: string; phone: string; profile_photo_url: string }>,
  ): Promise<User> {
    const user = await this.findOne(userId);
    if (params.first_name !== undefined) {
      const v = params.first_name.trim();
      if (!v) throw new BadRequestException('Le prénom est requis');
      user.first_name = v;
    }
    if (params.last_name !== undefined) {
      const v = params.last_name.trim();
      if (!v) throw new BadRequestException('Le nom est requis');
      user.last_name = v;
    }
    if (params.email !== undefined) {
      const email = params.email.toLowerCase().trim();
      if (!email.includes('@')) throw new BadRequestException('E-mail invalide');
      await this.assertEmailAvailable(email, userId);
      user.email = email;
    }
    if (params.phone !== undefined) {
      const phone = params.phone.trim();
      if (!phone) throw new BadRequestException('Le téléphone est requis');
      await this.assertPhoneAvailable(phone, userId);
      user.phone = phone;
    }
    if (params.profile_photo_url !== undefined) {
      user.profile_photo_url = params.profile_photo_url.trim() || null;
    }
    const saved = await this.usersRepo.save(user);
    this.syncKick.kick('user-self-profile');
    return saved;
  }

  async changeOwnPassword(userId: number, currentPassword: string, newPassword: string): Promise<User> {
    const user = await this.findOne(userId);
    const current = (currentPassword ?? '').trim();
    const next = (newPassword ?? '').trim();
    if (!(await this.validatePassword(user, current))) {
      throw new UnauthorizedException('Mot de passe actuel incorrect');
    }
    if (next.length < 6) {
      throw new BadRequestException('Le nouveau mot de passe doit faire au moins 6 caractères');
    }
    if (next === current) {
      throw new BadRequestException('Le nouveau mot de passe doit être différent de l’actuel');
    }
    if (next === DEFAULT_STAFF_PASSWORD) {
      throw new BadRequestException('Choisissez un mot de passe personnel, pas le mot de passe par défaut');
    }
    user.password_hash = await bcrypt.hash(next, 10);
    user.must_change_password = false;
    const saved = await this.usersRepo.save(user);
    this.syncKick.kick('user-self-password');
    return saved;
  }

  async provisionTeachers(params: {
    teachers: { last_name: string; first_name: string; phone: string }[];
    email_domain?: string;
    password?: string;
  }): Promise<{
    created: { id: number; last_name: string; first_name: string; email: string; phone: string }[];
    skipped: { last_name: string; first_name: string; phone: string; reason: string }[];
  }> {
    const domain = (params.email_domain ?? DEFAULT_STAFF_EMAIL_DOMAIN).replace(/^@/, '').trim();
    const password = (params.password ?? DEFAULT_STAFF_PASSWORD).trim();
    const created: { id: number; last_name: string; first_name: string; email: string; phone: string }[] = [];
    const skipped: { last_name: string; first_name: string; phone: string; reason: string }[] = [];

    for (const raw of params.teachers) {
      const last_name = (raw.last_name ?? '').trim();
      const first_name = (raw.first_name ?? '').trim();
      const phone = (raw.phone ?? '').trim();
      if (!last_name || !first_name || !phone) {
        skipped.push({ last_name, first_name, phone, reason: 'nom, prénom et téléphone requis' });
        continue;
      }
      const digits = this.phoneDigits(phone);
      const existingPhone = await this.findByPhoneDigits(digits);
      if (existingPhone) {
        skipped.push({ last_name, first_name, phone, reason: `téléphone déjà utilisé (${existingPhone.email})` });
        continue;
      }
      const email = await this.nextAvailableStaffEmail(last_name, first_name, domain);
      const user = await this.createUser({
        last_name,
        first_name,
        phone,
        email,
        password,
        roleName: 'TEACHER',
        must_change_password: true,
      });
      created.push({
        id: user.id,
        last_name: user.last_name ?? last_name,
        first_name: user.first_name ?? first_name,
        email: user.email,
        phone: user.phone ?? phone,
      });
    }
    return { created, skipped };
  }
}

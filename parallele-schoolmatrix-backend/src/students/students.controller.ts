import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { StudentsService } from './students.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { isPreschoolClass } from '../utils/preschool';

@Controller('students')
@UseGuards(JwtAuthGuard)
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Get()
  async list(@Query('class_id') classId?: string) {
    const students = await this.studentsService.findAll(classId);
    return {
      ok: true,
      students: students.map((s) => ({
        id: s.id,
        order_number: s.order_number,
        first_name: s.first_name,
        last_name: s.last_name,
        email: s.email,
        phone: s.phone,
        address: s.address,
        birth_date: s.birth_date,
        birth_place: s.birth_place,
        gender: s.gender,
        photo_identity_student: s.photo_identity_student,
        photo_identity_mother: s.photo_identity_mother,
        photo_identity_father: s.photo_identity_father,
        photo_identity_responsible: s.photo_identity_responsible,
        mother_name: s.mother_name,
        mother_phone: s.mother_phone,
        father_name: s.father_name,
        father_phone: s.father_phone,
        responsible_name: s.responsible_name,
        responsible_phone: s.responsible_phone,
        class_id: s.class?.id,
        class_name: s.class?.name,
        active: s.active,
        created_at: s.created_at,
        updated_at: s.updated_at,
      })),
    };
  }

  @Get(':id')
  async one(@Param('id') id: string) {
    const s = await this.studentsService.findOne(id);
    const c = s.class;
    const isPreschool = isPreschoolClass(c?.description, c?.level);
    return {
      ok: true,
      student: {
        id: s.id,
        order_number: s.order_number,
        first_name: s.first_name,
        last_name: s.last_name,
        email: s.email,
        phone: s.phone,
        address: s.address,
        birth_date: s.birth_date,
        birth_place: s.birth_place,
        gender: s.gender,
        photo_identity_student: s.photo_identity_student,
        photo_identity_mother: s.photo_identity_mother,
        photo_identity_father: s.photo_identity_father,
        photo_identity_responsible: s.photo_identity_responsible,
        mother_name: s.mother_name,
        mother_phone: s.mother_phone,
        father_name: s.father_name,
        father_phone: s.father_phone,
        responsible_name: s.responsible_name,
        responsible_phone: s.responsible_phone,
        class_id: s.class?.id,
        class_name: s.class?.name,
        is_preschool: isPreschool,
        active: s.active,
        created_at: s.created_at,
        updated_at: s.updated_at,
      },
    };
  }

  @Post()
  async create(@Body() body: Record<string, unknown>) {
    const s = await this.studentsService.create(body as any);
    return {
      ok: true,
      student: {
        id: s.id,
        order_number: s.order_number,
        first_name: s.first_name,
        last_name: s.last_name,
        email: s.email,
        phone: s.phone,
        address: s.address,
        birth_date: s.birth_date,
        birth_place: s.birth_place,
        gender: s.gender,
        photo_identity_student: s.photo_identity_student,
        photo_identity_mother: s.photo_identity_mother,
        photo_identity_father: s.photo_identity_father,
        photo_identity_responsible: s.photo_identity_responsible,
        mother_name: s.mother_name,
        mother_phone: s.mother_phone,
        father_name: s.father_name,
        father_phone: s.father_phone,
        responsible_name: s.responsible_name,
        responsible_phone: s.responsible_phone,
        class_id: s.class?.id,
        active: s.active,
        created_at: s.created_at,
        updated_at: s.updated_at,
      },
    };
  }

  @Post(':id/regenerate-order-number')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN')
  async regenerateOrderNumber(@Param('id') id: string) {
    const s = await this.studentsService.regenerateOrderNumber(id);
    return {
      ok: true,
      student: {
        id: s.id,
        order_number: s.order_number,
        first_name: s.first_name,
        last_name: s.last_name,
        email: s.email,
        phone: s.phone,
        address: s.address,
        birth_date: s.birth_date,
        birth_place: s.birth_place,
        gender: s.gender,
        photo_identity_student: s.photo_identity_student,
        photo_identity_mother: s.photo_identity_mother,
        photo_identity_father: s.photo_identity_father,
        photo_identity_responsible: s.photo_identity_responsible,
        mother_name: s.mother_name,
        mother_phone: s.mother_phone,
        father_name: s.father_name,
        father_phone: s.father_phone,
        responsible_name: s.responsible_name,
        responsible_phone: s.responsible_phone,
        class_id: s.class?.id,
        active: s.active,
        created_at: s.created_at,
        updated_at: s.updated_at,
      },
    };
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    const s = await this.studentsService.update(id, body as any);
    return {
      ok: true,
      student: {
        id: s.id,
        order_number: s.order_number,
        first_name: s.first_name,
        last_name: s.last_name,
        email: s.email,
        phone: s.phone,
        address: s.address,
        birth_date: s.birth_date,
        birth_place: s.birth_place,
        gender: s.gender,
        photo_identity_student: s.photo_identity_student,
        photo_identity_mother: s.photo_identity_mother,
        photo_identity_father: s.photo_identity_father,
        photo_identity_responsible: s.photo_identity_responsible,
        mother_name: s.mother_name,
        mother_phone: s.mother_phone,
        father_name: s.father_name,
        father_phone: s.father_phone,
        responsible_name: s.responsible_name,
        responsible_phone: s.responsible_phone,
        class_id: s.class?.id,
        active: s.active,
        created_at: s.created_at,
        updated_at: s.updated_at,
      },
    };
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.studentsService.delete(id);
    return { ok: true, deleted: true };
  }
}

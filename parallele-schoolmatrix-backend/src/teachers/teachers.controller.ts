import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { TeachersService } from './teachers.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('teachers')
@UseGuards(JwtAuthGuard)
export class TeachersController {
  constructor(private readonly teachersService: TeachersService) {}

  @Get()
  async list(
    @Query('class_id') classId?: string,
    @Query('subject_id') subjectId?: string,
  ) {
    const teachers =
      await this.teachersService.findTeachersForClassAndSubject(classId, subjectId);
    return {
      ok: true,
      teachers: teachers.map((t) => ({
        id: t.id,
        first_name: t.first_name,
        last_name: t.last_name,
        email: t.email,
        phone: t.phone,
        active: t.active,
      })),
    };
  }

  @Get(':id')
  async one(@Param('id', ParseIntPipe) id: number) {
    const teacher = await this.teachersService.findOneTeacher(id);
    const classes = await this.teachersService.getTeacherClasses(id);
    const subjects = await this.teachersService.getTeacherSubjects(id);
    const slots = await this.teachersService.getScheduleSlots({ teacher_id: id });
    return {
      ok: true,
      teacher: {
        id: teacher.id,
        first_name: teacher.first_name,
        last_name: teacher.last_name,
        email: teacher.email,
        phone: teacher.phone,
        active: teacher.active,
        classes,
        subjects,
        schedule_slots: slots,
      },
    };
  }

  @Get(':id/classes')
  async getClasses(@Param('id', ParseIntPipe) id: number) {
    const classes = await this.teachersService.getTeacherClasses(id);
    return { ok: true, classes };
  }

  @Post(':id/classes')
  async addClass(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { class_id: string; is_main?: boolean },
  ) {
    const assignment = await this.teachersService.addClassTeacher(
      id,
      body.class_id,
      body.is_main ?? false,
    );
    return {
      ok: true,
      assignment: {
        id: assignment.id,
        class_id: assignment.class?.id ?? assignment.class_id,
        is_main: assignment.is_main,
        created_at: assignment.created_at,
      },
    };
  }

  @Delete(':id/classes/:classId')
  async removeClass(
    @Param('id', ParseIntPipe) id: number,
    @Param('classId') classId: string,
  ) {
    await this.teachersService.removeClassTeacher(id, classId);
    return { ok: true, deleted: true };
  }

  @Get(':id/subjects')
  async getSubjects(@Param('id', ParseIntPipe) id: number) {
    const subjects = await this.teachersService.getTeacherSubjects(id);
    return { ok: true, subjects };
  }

  @Post(':id/subjects')
  async addSubject(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { subject_id: string },
  ) {
    const assignment = await this.teachersService.addTeacherSubject(
      id,
      body.subject_id,
    );
    return {
      ok: true,
      assignment: {
        id: assignment.id,
        subject_id: assignment.subject?.id ?? (assignment as any).subject_id,
        created_at: assignment.created_at,
      },
    };
  }

  @Delete(':id/subjects/:subjectId')
  async removeSubject(
    @Param('id', ParseIntPipe) id: number,
    @Param('subjectId') subjectId: string,
  ) {
    await this.teachersService.removeTeacherSubject(id, subjectId);
    return { ok: true, deleted: true };
  }
}

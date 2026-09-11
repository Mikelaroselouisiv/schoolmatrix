import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ParentScopeGuard } from '../auth/parent-scope.guard';
import { DenyParents } from '../auth/parent-scope.decorator';
import { ScheduleMomentsService } from './schedule-moments.service';

@Controller('school-week-duties')
@UseGuards(JwtAuthGuard, ParentScopeGuard)
@DenyParents()
export class SchoolWeekDutiesController {
  constructor(private readonly moments: ScheduleMomentsService) {}

  @Get()
  async list(
    @Query('academic_year') academicYear?: string,
    @Query('kind') kind?: string,
  ) {
    const duties = await this.moments.listDuties({
      academic_year: academicYear,
      kind,
    });
    return { ok: true, school_week_duties: duties };
  }

  /** Crée ou met à jour la dévotion (une fois pour toute l’école, un responsable par jour). */
  @Put()
  async upsert(
    @Body()
    body: {
      academic_year: string;
      kind?: string;
      start_time: string;
      end_time: string;
      days: { day_of_week: number; responsible_user_id?: number | null }[];
    },
  ) {
    const school_week_duties = await this.moments.upsertWeekDuties(body);
    return { ok: true, school_week_duties };
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.moments.deleteDuty(id);
    return { ok: true, deleted: true };
  }
}

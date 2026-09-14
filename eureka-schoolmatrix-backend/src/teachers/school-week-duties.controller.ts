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
import {
  MorningOpeningDayBody,
  ScheduleMomentsService,
} from './schedule-moments.service';

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

  /** Programmation du début de journée (drapeau + rentrée préscolaire / primaire). */
  @Put()
  async upsert(
    @Body()
    body: {
      academic_year: string;
      days: MorningOpeningDayBody[];
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

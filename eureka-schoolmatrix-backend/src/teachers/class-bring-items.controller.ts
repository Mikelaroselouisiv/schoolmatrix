import { Body, Controller, Get, Put, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ParentScopeGuard } from '../auth/parent-scope.guard';
import { DenyParents } from '../auth/parent-scope.decorator';
import { ScheduleMomentsService } from './schedule-moments.service';

@Controller('class-bring-items')
@UseGuards(JwtAuthGuard, ParentScopeGuard)
@DenyParents()
export class ClassBringItemsController {
  constructor(private readonly moments: ScheduleMomentsService) {}

  @Get()
  async list(
    @Query('class_id') classId?: string,
    @Query('academic_year') academicYear?: string,
  ) {
    const items = await this.moments.listBringItems(classId ?? '', academicYear);
    return { ok: true, items };
  }

  @Put()
  async replace(
    @Body()
    body: {
      class_id: string;
      academic_year?: string | null;
      lines: string[];
    },
  ) {
    const items = await this.moments.replaceBringItems(body);
    return { ok: true, items };
  }
}

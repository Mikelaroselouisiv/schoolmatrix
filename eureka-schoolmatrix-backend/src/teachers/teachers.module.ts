import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClassTeacher } from './class-teacher.entity';
import { TeacherSubject } from './teacher-subject.entity';
import { TeacherClassSubject } from './teacher-class-subject.entity';
import { ScheduleSlot } from './schedule-slot.entity';
import { ClassDayMoment } from './class-day-moment.entity';
import { SchoolWeekDuty } from './school-week-duty.entity';
import { User } from '../users/user.entity';
import { Role } from '../roles/role.entity';
import { Subject } from '../subjects/subject.entity';
import { Class } from '../classes/class.entity';
import { Room } from '../rooms/room.entity';
import { Student } from '../students/student.entity';
import { TeachersService } from './teachers.service';
import { ScheduleMomentsService } from './schedule-moments.service';
import { TeachersController } from './teachers.controller';
import { ScheduleSlotsController } from './schedule-slots.controller';
import { StudentScheduleController } from './student-schedule.controller';
import { ScheduleMomentsController } from './schedule-moments.controller';
import { SchoolWeekDutiesController } from './school-week-duties.controller';
import { ParentScopeModule } from '../auth/parent-scope.module';

@Module({
  imports: [
    ParentScopeModule,
    TypeOrmModule.forFeature([
      ClassTeacher,
      TeacherSubject,
      TeacherClassSubject,
      ScheduleSlot,
      ClassDayMoment,
      SchoolWeekDuty,
      User,
      Role,
      Subject,
      Class,
      Room,
      Student,
    ]),
  ],
  controllers: [
    TeachersController,
    ScheduleSlotsController,
    StudentScheduleController,
    ScheduleMomentsController,
    SchoolWeekDutiesController,
  ],
  providers: [TeachersService, ScheduleMomentsService],
  exports: [TeachersService, ScheduleMomentsService],
})
export class TeachersModule {}

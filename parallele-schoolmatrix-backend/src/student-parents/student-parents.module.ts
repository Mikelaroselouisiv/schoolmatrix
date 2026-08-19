import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserLinkedStudent } from '../users/user-linked-student.entity';
import { StudentParentsService } from './student-parents.service';
import { StudentParentsController } from './student-parents.controller';

@Module({
  imports: [TypeOrmModule.forFeature([UserLinkedStudent])],
  controllers: [StudentParentsController],
  providers: [StudentParentsService],
  exports: [StudentParentsService],
})
export class StudentParentsModule {}

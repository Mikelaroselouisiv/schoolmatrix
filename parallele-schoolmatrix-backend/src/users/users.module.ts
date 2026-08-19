import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { UserLinkedStudent } from './user-linked-student.entity';
import { Role } from '../roles/role.entity';
import { Student } from '../students/student.entity';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { ParentScopeModule } from '../auth/parent-scope.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserLinkedStudent, Role, Student]),
    ParentScopeModule,
  ],
  providers: [UsersService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}

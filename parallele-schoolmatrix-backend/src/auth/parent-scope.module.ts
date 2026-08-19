import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserLinkedStudent } from '../users/user-linked-student.entity';
import { ParentScopeGuard } from './parent-scope.guard';

/** Fournit ParentScopeGuard aux modules métier qui exposent des données élève. */
@Module({
  imports: [TypeOrmModule.forFeature([UserLinkedStudent])],
  providers: [ParentScopeGuard],
  exports: [ParentScopeGuard, TypeOrmModule],
})
export class ParentScopeModule {}

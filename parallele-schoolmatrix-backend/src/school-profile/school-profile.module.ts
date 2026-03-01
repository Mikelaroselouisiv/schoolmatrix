import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SchoolProfile } from './school-profile.entity';
import { SchoolProfileService } from './school-profile.service';
import { SchoolProfileController } from './school-profile.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SchoolProfile])],
  controllers: [SchoolProfileController],
  providers: [SchoolProfileService],
  exports: [SchoolProfileService],
})
export class SchoolProfileModule {
  constructor(private readonly schoolProfileService: SchoolProfileService) {}

  async onModuleInit() {
    await this.schoolProfileService.ensureProfile();
  }
}

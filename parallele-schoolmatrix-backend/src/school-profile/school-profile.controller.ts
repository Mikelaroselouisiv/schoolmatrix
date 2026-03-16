import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { SchoolProfileService } from './school-profile.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('school')
export class SchoolProfileController {
  constructor(private readonly schoolProfileService: SchoolProfileService) {}

  @Get('home')
  async getForHome() {
    const profile = await this.schoolProfileService.getProfile();
    if (!profile) {
      return { ok: true, school: null };
    }
    return {
      ok: true,
      school: {
        id: profile.id,
        name: profile.name,
        slogan: profile.slogan ?? null,
        domain: profile.domain ?? null,
        logo_url: profile.logo_url ?? null,
        primary_color: profile.primary_color,
        secondary_color: profile.secondary_color,
        active: profile.active,
      },
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('current-context')
  async getCurrentContext() {
    const ctx = await this.schoolProfileService.getCurrentContext();
    return { ok: true, ...ctx };
  }

  /** Statistiques sensibles : uniquement directeurs et superadmin. */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'DIRECTEUR_GENERAL', 'SCHOOL_ADMIN')
  @Get('dashboard-stats')
  async getDashboardStats() {
    const stats = await this.schoolProfileService.getDashboardStats();
    return { ok: true, ...stats };
  }

  @UseGuards(JwtAuthGuard)
  @Patch('profile')
  async updateProfile(
    @Body()
    body: {
      name?: string;
      slogan?: string;
      domain?: string;
      logo_url?: string | null;
      primary_color?: string;
      secondary_color?: string;
      active?: boolean;
      current_academic_year_id?: string | null;
      current_period_id?: string | null;
    },
  ) {
    const profile = await this.schoolProfileService.updateProfile(body);
    return {
      ok: true,
      school: {
        id: profile.id,
        name: profile.name,
        slogan: profile.slogan ?? null,
        domain: profile.domain ?? null,
        logo_url: profile.logo_url ?? null,
        primary_color: profile.primary_color,
        secondary_color: profile.secondary_color,
        active: profile.active,
        current_academic_year_id: profile.current_academic_year_id ?? null,
        current_period_id: profile.current_period_id ?? null,
      },
    };
  }
}

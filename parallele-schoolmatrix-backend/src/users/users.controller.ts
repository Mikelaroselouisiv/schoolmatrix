import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Req, ParseIntPipe } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { User } from './user.entity';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  private toUserResponse(u: User) {
    return {
      id: u.id,
      first_name: u.first_name,
      last_name: u.last_name,
      email: u.email,
      address: u.address,
      phone: u.phone,
      whatsapp: u.whatsapp,
      profile_photo_url: u.profile_photo_url,
      cover_photo_url: u.cover_photo_url,
      role: u.role?.name,
      active: u.active,
      created_at: u.created_at,
      updated_at: u.updated_at,
    };
  }

  @Get('me')
  async me(@Req() req: { user?: { userId?: number; sub?: number; id?: number } }) {
    const userId = req.user?.userId ?? req.user?.sub ?? req.user?.id;
    if (!userId) return { ok: true, user: req.user };
    const user = await this.usersService.findOne(userId as number);
    return { ok: true, user: this.toUserResponse(user) };
  }

  @Get('admin-only')
  adminOnly() {
    return { ok: true, message: 'Admin access' };
  }

  @Get()
  async listUsers() {
    const users = await this.usersService.findAll();
    return {
      ok: true,
      users: users.map((u) => this.toUserResponse(u)),
    };
  }

  @Post()
  async createUser(@Body() body: {
    first_name?: string;
    last_name?: string;
    email: string;
    address?: string;
    phone?: string;
    whatsapp?: string;
    password: string;
    roleName?: string;
    profile_photo_url?: string;
    cover_photo_url?: string;
  }) {
    const user = await this.usersService.createUser({
      first_name: body.first_name,
      last_name: body.last_name,
      email: body.email,
      address: body.address,
      phone: body.phone,
      whatsapp: body.whatsapp,
      password: body.password,
      roleName: body.roleName ?? 'PARENT',
      profile_photo_url: body.profile_photo_url,
      cover_photo_url: body.cover_photo_url,
    });
    return { ok: true, user: this.toUserResponse(user) };
  }

  @Patch(':id/role')
  async setUserRole(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { roleName: string },
  ) {
    const user = await this.usersService.setUserRole(id, body.roleName);
    return { ok: true, user: this.toUserResponse(user) };
  }

  @Post(':id/reset-password')
  async resetPassword(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { newPassword: string },
  ) {
    const user = await this.usersService.resetPassword(id, body.newPassword ?? '');
    return { ok: true, user: this.toUserResponse(user) };
  }

  @Patch(':id')
  async updateUser(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: Partial<{
      first_name: string;
      last_name: string;
      email: string;
      address: string;
      phone: string;
      whatsapp: string;
      active: boolean;
      profile_photo_url: string;
      cover_photo_url: string;
      password: string;
    }>,
  ) {
    const user = await this.usersService.updateUser(id, body);
    return { ok: true, user: this.toUserResponse(user) };
  }

  @Delete(':id')
  async deleteUser(@Param('id', ParseIntPipe) id: number) {
    await this.usersService.deleteUser(id);
    return { ok: true, deleted: true };
  }
}

import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { UsersService } from '../users/users.service';

@Controller('setup')
export class SetupController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  async firstAdmin(@Body() body: { email: string; phone?: string; password: string }) {
    const count = await this.usersService.countUsers();
    if (count > 0) {
      throw new BadRequestException('Setup already completed');
    }
    return this.usersService.createUser({
      email: body.email,
      phone: body.phone,
      password: body.password,
      roleName: 'SUPER_ADMIN',
    });
  }
}

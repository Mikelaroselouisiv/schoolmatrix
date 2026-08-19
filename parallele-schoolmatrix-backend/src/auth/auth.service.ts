import { Injectable, UnauthorizedException, ConflictException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { LoginThrottleService } from './login-throttle.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly throttle: LoginThrottleService,
  ) {}

  async login(login: string, password: string, rememberMe = false, ip?: string) {
    this.throttle.assertAllowed(login, ip);

    const user = await this.users.findByEmailOrPhone(login);
    const ok = user
      ? await this.users.validatePassword(user, password)
      : false;
    if (!user || !ok) {
      this.throttle.recordFailure(login, ip);
      throw new UnauthorizedException('Invalid credentials');
    }
    // Mot de passe correct : le compteur repart, y compris si le compte est
    // désactivé (inutile de pénaliser le titulaire légitime).
    this.throttle.recordSuccess(login, ip);

    // Vérifié APRÈS le mot de passe : ne révèle pas l'existence d'un compte.
    if (user.active === false) {
      throw new UnauthorizedException(
        "Compte désactivé. Contactez l'administration de l'école.",
      );
    }

    const roleName = user.role?.name ?? (typeof user.role === 'string' ? user.role : 'PARENT');
    const payload = { sub: user.id, role: roleName, email: user.email };
    const expiresIn = rememberMe ? '365d' : '7d';
    return {
      access_token: await this.jwt.signAsync(payload, { expiresIn }),
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        phone: user.phone,
        profile_photo_url: user.profile_photo_url,
        role: user.role?.name ?? user.role,
        must_change_password: !!user.must_change_password,
      },
    };
  }

  async registerSuperAdmin(email: string, password: string) {
    const count = await this.users.countUsers();
    if (count > 0) {
      throw new ForbiddenException('Setup already completed');
    }
    const exists = await this.users.findByEmail(email.toLowerCase().trim());
    if (exists) throw new ConflictException('Email already exists');
    const user = await this.users.createUser({
      email,
      password,
      roleName: 'SUPER_ADMIN',
    });
    return { id: user.id, email: user.email, role: user.role };
  }
}

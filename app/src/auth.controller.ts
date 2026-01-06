import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import type { AuthToken } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  login(@Body() credentials: { email: string; password: string }): AuthToken {
    return this.authService.login(credentials);
  }
}

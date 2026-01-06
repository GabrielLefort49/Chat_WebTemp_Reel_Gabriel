import { Injectable, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

export interface AuthToken {
  access_token: string;
  role: 'admin' | 'user';
  email: string;
}

interface LoginPayload {
  email: string;
  password: string;
}

@Injectable()
export class AuthService {
  private adminEmail: string;
  private adminPassword: string;
  private userEmail: string;
  private userPassword: string;

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {
    this.adminEmail = this.configService.get<string>('ADMIN_EMAIL') || 'admin@example.com';
    this.adminPassword = this.configService.get<string>('ADMIN_PASSWORD') || 'admin123';
    this.userEmail = this.configService.get<string>('USER_EMAIL') || 'user@example.com';
    this.userPassword = this.configService.get<string>('USER_PASSWORD') || 'user123';
  }

  login(payload: LoginPayload): AuthToken {
    const { email, password } = payload;

    // Vérifier admin
    if (email === this.adminEmail && password === this.adminPassword) {
      const token = this.jwtService.sign(
        { email, role: 'admin' },
        { secret: this.configService.get<string>('JWT_SECRET') },
      );
      return {
        access_token: token,
        role: 'admin',
        email,
      };
    }

    // Vérifier user
    if (email === this.userEmail && password === this.userPassword) {
      const token = this.jwtService.sign(
        { email, role: 'user' },
        { secret: this.configService.get<string>('JWT_SECRET') },
      );
      return {
        access_token: token,
        role: 'user',
        email,
      };
    }

    throw new BadRequestException('Email ou mot de passe incorrect');
  }

  verifyToken(token: string): { email: string; role: 'admin' | 'user' } {
    try {
      const decoded = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });
      return {
         
        email: decoded.email,
        role: decoded.role,
      };
    } catch (error) {
      throw new BadRequestException('Token invalide ou expiré');
    }
  }
}

import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UsersService } from '../users/users.service';
import { User } from '../../generated/prisma/client';
@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    await this.checkForExistingUser(dto.email);

    const user = await this.usersService.createUser({
      email: dto.email,
      name: dto.name,
    });

    const token = await this.signToken(user.id, user.email);

    return {
      accessToken: token,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.findUser(dto.email);
    const token = await this.signToken(user!.id, user!.email);
    return {
      accessToken: token,
    };
  }

  private async findUser(email: string): Promise<User | null> {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return user;
  }

  private async checkForExistingUser(email: string) {
    const existing = await this.usersService.findByEmail(email);

    if (existing) {
      throw new BadRequestException('Email already registered');
    }
  }

  private signToken(userId: string, email: string) {
    return this.jwtService.signAsync({
      sub: userId,
      email,
    });
  }
}

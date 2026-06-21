import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User } from '../../generated/prisma/client';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  createUser(params: {
    email: string;
    name?: string;
    googleCalendarId?: string;
  }) {
    return this.prisma.user.create({
      data: {
        email: params.email,
        name: params.name,
        googleCalendarId: params.googleCalendarId,
      },
    });
  }
}

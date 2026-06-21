import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findById(id: string) {
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

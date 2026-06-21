import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { GoogleCalendarService } from '../google-calendar/google-calendar.service';

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly googleCalendarService: GoogleCalendarService,
  ) {}

  async createBooking(userId: string, dto: CreateBookingDto) {
    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(dto.endsAt);

    if (startsAt >= endsAt) {
      throw new BadRequestException('startsAt must be earlier than endsAt');
    }

    const localConflict = await this.prisma.booking.findFirst({
      where: {
        userId,
        startsAt: {
          lt: endsAt,
        },
        endsAt: {
          gt: startsAt,
        },
      },
    });

    if (localConflict) {
      throw new ConflictException('Booking conflicts with an existing booking');
    }

    const googleConflict = await this.googleCalendarService.hasConflict({
      startsAt,
      endsAt,
    });

    if (googleConflict) {
      throw new ConflictException('Booking conflicts with Google Calendar');
    }

    return this.prisma.booking.create({
      data: {
        title: dto.title,
        date: startsAt,
        startsAt,
        endsAt,
        userId,
      },
    });
  }

  listBookings(userId: string) {
    return this.prisma.booking.findMany({
      where: { userId },
      orderBy: { startsAt: 'asc' },
    });
  }
}

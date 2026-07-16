import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { GoogleCalendarService } from '../google-calendar/google-calendar.service';

@Injectable()
export class BookingsService {
  private isPrismaNotFoundError(error: unknown): error is { code: 'P2025' } {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P2025'
    );
  }

  constructor(
    private readonly prisma: PrismaService,
    private readonly googleCalendarService: GoogleCalendarService,
  ) {}

  async createBooking(auth0Id: string, dto: CreateBookingDto) {
    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(dto.endsAt);

    if (startsAt >= endsAt) {
      throw new BadRequestException('startsAt must be earlier than endsAt');
    }

    const user = await this.prisma.user.findUnique({
      where: { auth0Id },
      select: { id: true, email: true, auth0Id: true },
    });

    if (user) {
      const googleConflict = await this.googleCalendarService.hasConflict({
        startsAt,
        endsAt,
        auth0Id: user.auth0Id,
        calendarId: user.email,
      });

      if (googleConflict) {
        throw new ConflictException('Booking conflicts with Google Calendar');
      }

      const localConflict = await this.prisma.booking.findFirst({
        where: {
          startsAt: {
            lt: endsAt,
          },
          endsAt: {
            gt: startsAt,
          },
        },
      });

      if (localConflict) {
        throw new ConflictException(
          'Booking conflicts with an existing booking',
        );
      }

      return this.prisma.booking.create({
        data: {
          title: dto.title,
          date: startsAt,
          startsAt,
          endsAt,
          userAuth0Id: user.auth0Id,
        },
      });
    } else {
      throw new BadRequestException('Could not find the user');
    }
  }

  async cancelBooking(auth0Id: string, bookingId: string) {
    const existing = await this.prisma.booking.findFirst({
      where: {
        id: bookingId,
        userAuth0Id: auth0Id,
      },
    });

    if (!existing) {
      throw new NotFoundException('Booking not found');
    }

    await this.prisma.booking.delete({
      where: {
        id: bookingId,
      },
    });

    return {
      ok: true,
      bookingId,
    };
  }

  listBookings(auth0Id: string) {
    return this.prisma.booking.findMany({
      where: { userAuth0Id: auth0Id },
      orderBy: { startsAt: 'asc' },
    });
  }

  listTakenSlots() {
    return this.prisma.booking.findMany({
      select: {
        id: true,
        startsAt: true,
        endsAt: true,
      },
      orderBy: { startsAt: 'asc' },
    });
  }
}

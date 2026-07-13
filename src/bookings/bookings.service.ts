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

  async createBooking(userId: string, dto: CreateBookingDto) {
    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(dto.endsAt);

    if (startsAt >= endsAt) {
      throw new BadRequestException('startsAt must be earlier than endsAt');
    }

    const user = await this.prisma.user.findUnique({
      where: { auth0Id: userId },
    });

    const googleConflict = await this.googleCalendarService.hasConflict({
      startsAt,
      endsAt,
      userId,
      calendarId: user?.googleCalendarId ?? undefined,
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
      throw new ConflictException('Booking conflicts with an existing booking');
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

  async cancelBooking(userId: string, bookingId: string) {
    const existing = await this.prisma.booking.findFirst({
      where: {
        id: bookingId,
        userId,
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

  async getConnectedCalendar(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        email: true,
        googleCalendarId: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      user,
    };
  }

  async connectCalendar(
    userId: string,
    calendarId: string,
  ): Promise<{
    ok: true;
    user: {
      id: string;
      email: string;
      googleCalendarId: string | null;
    };
  }> {
    const normalizedCalendarId = calendarId.trim();

    if (!normalizedCalendarId) {
      throw new BadRequestException('calendarId is required');
    }

    let user: { id: string; email: string; googleCalendarId: string | null };

    try {
      user = await this.prisma.user.update({
        where: {
          id: userId,
        },
        data: {
          googleCalendarId: normalizedCalendarId,
        },
        select: {
          id: true,
          email: true,
          googleCalendarId: true,
        },
      });
    } catch (error: unknown) {
      if (this.isPrismaNotFoundError(error)) {
        throw new NotFoundException('User not found');
      }

      throw error;
    }

    return {
      ok: true,
      user,
    };
  }

  listBookings(userId: string) {
    return this.prisma.booking.findMany({
      where: { userId },
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

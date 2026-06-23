import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { PrismaService } from '../prisma/prisma.service';
import { GoogleCalendarService } from '../google-calendar/google-calendar.service';

jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

describe('BookingsService', () => {
  let service: BookingsService;

  const prisma = {
    user: {
      findUnique: jest.fn(),
    },
    booking: {
      findFirst: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
    },
  } as unknown as jest.Mocked<PrismaService>;

  const googleCalendarService = {
    hasConflict: jest.fn(),
  } as unknown as jest.Mocked<GoogleCalendarService>;

  const dto = {
    title: 'Planning meeting',
    startsAt: '2026-06-22T10:00:00.000Z',
    endsAt: '2026-06-22T11:00:00.000Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new BookingsService(prisma, googleCalendarService);
  });

  it('createBooking should validate date range', async () => {
    await expect(
      service.createBooking('user-1', {
        ...dto,
        startsAt: '2026-06-22T11:00:00.000Z',
        endsAt: '2026-06-22T10:00:00.000Z',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('createBooking should fail on Google Calendar conflict', async () => {
    prisma.user.findUnique = jest
      .fn()
      .mockResolvedValue({ googleCalendarId: 'primary' });
    googleCalendarService.hasConflict = jest.fn().mockResolvedValue(true);

    await expect(service.createBooking('user-1', dto)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('createBooking should fail on local conflict', async () => {
    prisma.user.findUnique = jest
      .fn()
      .mockResolvedValue({ googleCalendarId: 'primary' });
    googleCalendarService.hasConflict = jest.fn().mockResolvedValue(false);
    prisma.booking.findFirst = jest
      .fn()
      .mockResolvedValue({ id: 'existing-booking' });

    await expect(service.createBooking('user-1', dto)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('createBooking should persist booking when no conflict exists', async () => {
    prisma.user.findUnique = jest.fn().mockResolvedValue(null);
    googleCalendarService.hasConflict = jest.fn().mockResolvedValue(false);
    prisma.booking.findFirst = jest.fn().mockResolvedValue(null);
    prisma.booking.create = jest.fn().mockResolvedValue({ id: 'booking-1' });

    await expect(service.createBooking('user-1', dto)).resolves.toEqual({
      id: 'booking-1',
    });

    expect(prisma.booking.create).toHaveBeenCalledTimes(1);
    const createArgs = prisma.booking.create.mock.calls[0][0];
    expect(createArgs.data.title).toBe('Planning meeting');
    expect(createArgs.data.userId).toBe('user-1');
    expect(createArgs.data.startsAt).toBeInstanceOf(Date);
    expect(createArgs.data.endsAt).toBeInstanceOf(Date);
  });

  it('cancelBooking should throw when booking is not found', async () => {
    prisma.booking.findFirst = jest.fn().mockResolvedValue(null);

    await expect(service.cancelBooking('user-1', 'booking-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('cancelBooking should delete and return success payload', async () => {
    prisma.booking.findFirst = jest.fn().mockResolvedValue({ id: 'booking-1' });
    prisma.booking.delete = jest.fn().mockResolvedValue({ id: 'booking-1' });

    await expect(service.cancelBooking('user-1', 'booking-1')).resolves.toEqual(
      {
        ok: true,
        bookingId: 'booking-1',
      },
    );

    expect(prisma.booking.delete).toHaveBeenCalledWith({
      where: { id: 'booking-1' },
    });
  });

  it('getConnectedCalendar should throw when user does not exist', async () => {
    prisma.user.findUnique = jest.fn().mockResolvedValue(null);

    await expect(service.getConnectedCalendar('user-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('getConnectedCalendar should return selected user fields', async () => {
    prisma.user.findUnique = jest.fn().mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      googleCalendarId: 'primary',
    });

    await expect(service.getConnectedCalendar('user-1')).resolves.toEqual({
      user: {
        id: 'user-1',
        email: 'user@example.com',
        googleCalendarId: 'primary',
      },
    });
  });

  it('listBookings should query by user ordered by startsAt', async () => {
    prisma.booking.findMany = jest.fn().mockResolvedValue([]);

    await service.listBookings('user-9');

    expect(prisma.booking.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-9' },
      orderBy: { startsAt: 'asc' },
    });
  });

  it('listTakenSlots should return ordered startsAt and endsAt only', async () => {
    prisma.booking.findMany = jest.fn().mockResolvedValue([]);

    await service.listTakenSlots();

    expect(prisma.booking.findMany).toHaveBeenCalledWith({
      select: {
        id: true,
        startsAt: true,
        endsAt: true,
      },
      orderBy: { startsAt: 'asc' },
    });
  });
});
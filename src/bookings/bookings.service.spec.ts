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
      update: jest.fn(),
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
    prisma.user.findUnique = jest
      .fn()
      .mockResolvedValue({ auth0Id: 'user-1', email: '' });
    googleCalendarService.hasConflict = jest.fn().mockResolvedValue(false);
    prisma.booking.findFirst = jest.fn().mockResolvedValue(null);
    prisma.booking.create = jest.fn().mockResolvedValue({ id: 'booking-1' });

    await expect(service.createBooking('user-1', dto)).resolves.toEqual({
      id: 'booking-1',
    });

    const bookingPrisma = prisma.booking as unknown as {
      create: jest.Mock;
    };
    const createMock = bookingPrisma.create;
    expect(createMock).toHaveBeenCalledTimes(1);

    const createCalls = createMock.mock.calls as Array<
      [
        {
          data: {
            title: string;
            userAuth0Id: string;
            startsAt: Date;
            endsAt: Date;
          };
        },
      ]
    >;
    const createArgs = createCalls[0][0];
    expect(createArgs.data.title).toBe('Planning meeting');
    expect(createArgs.data.userAuth0Id).toBe('user-1');
    expect(createArgs.data.startsAt).toBeInstanceOf(Date);
    expect(createArgs.data.endsAt).toBeInstanceOf(Date);
  });

  it('cancelBooking should throw when booking is not found', async () => {
    prisma.booking.findFirst = jest.fn().mockResolvedValue(null);

    await expect(
      service.cancelBooking('user-1', 'booking-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
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

    const bookingPrisma = prisma.booking as unknown as {
      delete: jest.Mock;
    };
    const deleteMock = bookingPrisma.delete;
    expect(deleteMock).toHaveBeenCalledWith({
      where: { id: 'booking-1' },
    });
  });

  it('listBookings should query by user ordered by startsAt', async () => {
    prisma.booking.findMany = jest.fn().mockResolvedValue([]);

    await service.listBookings('user-9');

    const bookingPrisma = prisma.booking as unknown as {
      findMany: jest.Mock;
    };
    const findManyMock = bookingPrisma.findMany;
    expect(findManyMock).toHaveBeenCalledWith({
      where: { userAuth0Id: 'user-9' },
      orderBy: { startsAt: 'asc' },
    });
  });

  it('listTakenSlots should return ordered startsAt and endsAt only', async () => {
    prisma.booking.findMany = jest.fn().mockResolvedValue([]);

    await service.listTakenSlots();

    const bookingPrisma = prisma.booking as unknown as {
      findMany: jest.Mock;
    };
    const findManyMock = bookingPrisma.findMany;
    expect(findManyMock).toHaveBeenCalledWith({
      select: {
        id: true,
        startsAt: true,
        endsAt: true,
      },
      orderBy: { startsAt: 'asc' },
    });
  });
});

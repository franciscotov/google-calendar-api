import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { google } from 'googleapis';
import { GoogleCalendarService } from './google-calendar.service';

jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

describe('GoogleCalendarService', () => {
  let service: GoogleCalendarService;
  const getConfig = jest.fn<(key: string) => string | undefined>();
  const findUnique = jest.fn<
    () => Promise<{
      googleCalendarId: string;
    } | null>
  >();

  const configService = {
    get: getConfig,
  } as unknown as ConfigService;

  const http = {
    post: jest.fn(),
    get: jest.fn(),
  } as unknown as HttpService;

  const query = jest.fn<(params: any) => Promise<any>>();
  const calendar = jest.fn().mockReturnValue({
    freebusy: {
      query,
    },
  });

  beforeEach(() => {
    jest.clearAllMocks();
    service = new GoogleCalendarService(configService, http);
    jest.spyOn(google, 'calendar').mockImplementation(calendar as never);
    jest.spyOn(service as any, 'getAuthClient').mockResolvedValue({});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('hasConflict should return false when no auth credentials are configured', async () => {
    jest.spyOn(service as any, 'getAuthClient').mockRejectedValue('No auth');
    getConfig.mockReturnValue(undefined);

    await expect(
      service.hasConflict({
        startsAt: new Date('2026-06-22T10:00:00.000Z'),
        endsAt: new Date('2026-06-22T11:00:00.000Z'),
      }),
    ).resolves.toBe(false);

    expect(google.calendar).not.toHaveBeenCalled();
  });

  it('hasConflict should return true when freebusy has busy slots', async () => {
    query.mockResolvedValue({
      data: {
        calendars: {
          primary: {
            busy: [
              {
                start: '2026-06-22T10:15:00.000Z',
                end: '2026-06-22T10:45:00.000Z',
              },
            ],
          },
        },
      },
    });

    await expect(
      service.hasConflict({
        startsAt: new Date('2026-06-22T10:00:00.000Z'),
        endsAt: new Date('2026-06-22T11:00:00.000Z'),
        calendarId: 'primary',
        auth0Id: 'user-1',
      }),
    ).resolves.toBe(true);

    expect(query).toHaveBeenCalledTimes(1);
  });

  it('hasConflict should return false when freebusy has no busy slots', async () => {
    query.mockResolvedValue({
      data: {
        calendars: {
          primary: {
            busy: [],
          },
        },
      },
    });

    await expect(
      service.hasConflict({
        startsAt: new Date('2026-06-22T10:00:00.000Z'),
        endsAt: new Date('2026-06-22T11:00:00.000Z'),
        calendarId: 'primary',
      }),
    ).resolves.toBe(false);
  });

  it('hasConflict should return false when Google returns calendar errors', async () => {
    query.mockResolvedValue({
      data: {
        calendars: {
          primary: {
            errors: [{ reason: 'notFound' }],
            busy: [{ start: 'x', end: 'y' }],
          },
        },
      },
    });

    await expect(
      service.hasConflict({
        startsAt: new Date('2026-06-22T10:00:00.000Z'),
        endsAt: new Date('2026-06-22T11:00:00.000Z'),
        calendarId: 'primary',
      }),
    ).resolves.toBe(false);
  });

  it('hasConflict should return false when API call throws', async () => {
    query.mockRejectedValue(new Error('Google down'));

    await expect(
      service.hasConflict({
        startsAt: new Date('2026-06-22T10:00:00.000Z'),
        endsAt: new Date('2026-06-22T11:00:00.000Z'),
        calendarId: 'primary',
      }),
    ).resolves.toBe(false);
  });

  it('hasConflict should use user calendar id when present', async () => {
    findUnique.mockResolvedValue({ googleCalendarId: 'team@company.com' });
    query.mockResolvedValue({
      data: {
        calendars: {
          'team@company.com': {
            busy: [],
          },
        },
      },
    });

    await service.hasConflict({
      startsAt: new Date('2026-06-22T10:00:00.000Z'),
      endsAt: new Date('2026-06-22T11:00:00.000Z'),
      auth0Id: 'user-1',
      calendarId: 'team@company.com',
    });

    expect(query).toHaveBeenCalledWith(
      expect.objectContaining({
        requestBody: expect.objectContaining({
          items: [{ id: 'team@company.com' }],
        }),
      }),
    );
  });
});

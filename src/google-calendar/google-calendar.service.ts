import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { calendar_v3, google } from 'googleapis';
import { PrismaService } from '../prisma/prisma.service';

type ConflictCheckInput = {
  startsAt: Date;
  endsAt: Date;
  userId?: string;
  googleAccessToken?: string;
  calendarId?: string;
};

@Injectable()
export class GoogleCalendarService {
  private readonly logger = new Logger(GoogleCalendarService.name);
  private static readonly CALENDAR_READONLY_SCOPE =
    'https://www.googleapis.com/auth/calendar.readonly';

  private static readonly CALENDAR_FREEBUSY_SCOPE =
    'https://www.googleapis.com/auth/calendar.freebusy';

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  private async resolveCalendarId(
    userId?: string,
    explicitCalendarId?: string,
  ): Promise<string> {
    if (explicitCalendarId && explicitCalendarId.trim()) {
      return explicitCalendarId.trim();
    }

    if (!userId) {
      return this.configService.get<string>('GOOGLE_CALENDAR_ID') ?? 'primary';
    }

    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { googleCalendarId: true },
      });

      if (user?.googleCalendarId) {
        return user.googleCalendarId;
      }
    } catch {
      // Fallback to global calendar id when user lookup fails.
    }

    return this.configService.get<string>('GOOGLE_CALENDAR_ID') ?? 'primary';
  }

  private getAuthClient(
    googleAccessToken?: string,
  ): calendar_v3.Options['auth'] | null {
    if (googleAccessToken?.trim()) {
      const auth = new google.auth.OAuth2();
      auth.setCredentials({ access_token: googleAccessToken.trim() });
      this.logger.debug('Using request-scoped Google OAuth2 access token');
      return auth;
    }

    const projectEmail = this.configService.get<string>(
      'GOOGLE_SERVICE_ACCOUNT_EMAIL',
    );
    const privateKey = this.configService.get<string>(
      'GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY',
    );

    if (!projectEmail || !privateKey) {
      return null;
    }

    if (!privateKey.includes('BEGIN PRIVATE KEY')) {
      throw new Error(
        'GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY is not a valid private key. Use the private_key from a service-account JSON, not an API key.',
      );
    }

    this.logger.debug(
      'Using GOOGLE_SERVICE_ACCOUNT_EMAIL/PRIVATE_KEY for Calendar',
    );
    return new google.auth.JWT({
      email: projectEmail,
      key: privateKey.replace(/\\n/g, '\n'),
      scopes: [
        GoogleCalendarService.CALENDAR_READONLY_SCOPE,
        GoogleCalendarService.CALENDAR_FREEBUSY_SCOPE,
      ],
    });
  }

  async hasConflict(input: ConflictCheckInput): Promise<boolean> {
    const calendarId = await this.resolveCalendarId(
      input.userId,
      input.calendarId,
    );

    try {
      const auth = this.getAuthClient(input.googleAccessToken);

      // Skip external provider validation when Google credentials are missing.
      if (!auth) {
        this.logger.warn(
          'Skipping Google conflict check because Google credentials are missing',
        );
        return false;
      }

      const calendar = google.calendar({ version: 'v3', auth });

      this.logger.debug(
        `Querying freebusy for calendar "${calendarId}" from ${input.startsAt.toISOString()} to ${input.endsAt.toISOString()}`,
      );

      const response = await calendar.freebusy.query({
        requestBody: {
          timeZone: 'UTC',
          items: [{ id: calendarId }],
          timeMin: input.startsAt.toISOString(),
          timeMax: input.endsAt.toISOString(),
        },
      });

      const calendarResult = response.data.calendars?.[calendarId];

      if (calendarResult?.errors?.length) {
        this.logger.error(
          `Google freebusy returned errors for calendar "${calendarId}": ${JSON.stringify(calendarResult.errors)}`,
        );
        return false;
      }

      const busy = calendarResult?.busy;

      this.logger.debug(
        `Google freebusy raw result: ${JSON.stringify(busy ?? [])}`,
      );

      if (!busy || busy.length === 0) {
        return false;
      }

      return true;
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      this.logger.error(
        `Google Calendar check failed for calendar ${calendarId}: ${message}`,
      );
      return false;
    }
  }
}

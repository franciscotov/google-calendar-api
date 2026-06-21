import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';

type ConflictCheckInput = {
  startsAt: Date;
  endsAt: Date;
};

@Injectable()
export class GoogleCalendarService {
  private readonly logger = new Logger(GoogleCalendarService.name);

  constructor(private readonly configService: ConfigService) {}

  async hasConflict(input: ConflictCheckInput): Promise<boolean> {
    const projectEmail = this.configService.get<string>(
      'GOOGLE_SERVICE_ACCOUNT_EMAIL',
    );
    const privateKey = this.configService.get<string>(
      'GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY',
    );
    const calendarId = this.configService.get<string>('GOOGLE_CALENDAR_ID');

    // Skip external provider validation when Google settings are missing.
    if (!projectEmail || !privateKey || !calendarId) {
      return false;
    }

    const auth = new google.auth.JWT({
      email: projectEmail,
      key: privateKey.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
    });

    const calendar = google.calendar({ version: 'v3', auth });

    const response = await calendar.freebusy.query({
      requestBody: {
        items: [{ id: calendarId }],
        timeMin: input.startsAt.toISOString(),
        timeMax: input.endsAt.toISOString(),
      },
    });

    const busy = response.data.calendars?.[calendarId]?.busy;

    if (!busy) {
      this.logger.debug('Google freebusy returned no busy entries');
      return false;
    }

    return busy.length > 0;
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { calendar_v3, google } from 'googleapis';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';

type ConflictCheckInput = {
  startsAt: Date;
  endsAt: Date;
  userId?: string;
  calendarId?: string;
};

@Injectable()
export class GoogleCalendarService {
  private readonly logger = new Logger(GoogleCalendarService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly http: HttpService,
  ) {}

  private async getAuth0ManagementToken(): Promise<string | null> {
    const domain = this.configService.get<string>('AUTH0_DOMAIN');
    const clientId = this.configService.get<string>('AUTH0_M2M_CLIENT_ID');
    const clientSecret = this.configService.get<string>(
      'AUTH0_M2M_CLIENT_SECRET',
    );

    if (!domain || !clientId || !clientSecret) {
      return null;
    }

    try {
      const { data } = await firstValueFrom(
        this.http.post<{ access_token: string }>(
          `https://${domain}/oauth/token`,
          {
            grant_type: 'client_credentials',
            client_id: clientId,
            client_secret: clientSecret,
            audience: `https://${domain}/api/v2/`,
          },
        ),
      );

      return data.access_token ?? null;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Could not get Auth0 management token: ${message}`);
      return null;
    }
  }

  private async getGoogleAccessTokenFromAuth0User(
    userId?: string,
  ): Promise<string | null> {
    if (!userId) {
      return null;
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { auth0Id: true },
    });

    if (!user?.auth0Id) {
      return null;
    }

    const managementToken = await this.getAuth0ManagementToken();

    if (!managementToken) {
      return null;
    }

    const domain = this.configService.get<string>('AUTH0_DOMAIN');

    if (!domain) {
      return null;
    }

    try {
      const { data } = await firstValueFrom(
        this.http.get<{
          identities?: Array<{ provider?: string; access_token?: string }>;
        }>(
          `https://${domain}/api/v2/users/${encodeURIComponent(user.auth0Id)}`,
          {
            params: {
              fields: 'identities',
              include_fields: 'true',
            },
            headers: {
              Authorization: `Bearer ${managementToken}`,
            },
          },
        ),
      );

      const googleIdentity = data.identities?.find(
        (identity) => identity.provider === 'google-oauth2',
      );

      if (googleIdentity?.access_token) {
        return googleIdentity.access_token;
      }

      return null;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Could not get Google provider token from Auth0 for user ${userId}: ${message}`,
      );
      return null;
    }
  }

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

  private async getAuthClient(
    userId?: string,
  ): Promise<calendar_v3.Options['auth'] | null> {
    const tokenFromAuth0 = await this.getGoogleAccessTokenFromAuth0User(userId);

    const effectiveAccessToken = tokenFromAuth0;

    if (!effectiveAccessToken) {
      return null;
    }

    const auth = new google.auth.OAuth2();
    auth.setCredentials({
      access_token: effectiveAccessToken,
    });

    this.logger.debug(
      'Using Google OAuth2 access token obtained from Auth0 identities',
    );

    return auth;
  }

  async hasConflict(input: ConflictCheckInput): Promise<boolean> {
    const calendarId = await this.resolveCalendarId(
      input.userId,
      input.calendarId,
    );

    try {
      const auth = await this.getAuthClient(input.userId);

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

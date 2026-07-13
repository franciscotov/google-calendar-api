import { Module } from '@nestjs/common';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { GoogleCalendarModule } from '../google-calendar/google-calendar.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [GoogleCalendarModule, AuthModule],
  controllers: [BookingsController],
  providers: [BookingsService],
})
export class BookingsModule {}

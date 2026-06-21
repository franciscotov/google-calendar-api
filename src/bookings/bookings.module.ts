import { Module } from '@nestjs/common';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { GoogleCalendarModule } from '../google-calendar/google-calendar.module';

@Module({
  imports: [GoogleCalendarModule],
  controllers: [BookingsController],
  providers: [BookingsService],
})
export class BookingsModule {}

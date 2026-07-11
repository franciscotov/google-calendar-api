import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtUserDto } from '../common/dto/jwt-user.dto';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';

@Controller('bookings')
@UseGuards(JwtAuthGuard)
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Get()
  list(@CurrentUser() user: JwtUserDto) {
    return this.bookingsService.listBookings(user.sub);
  }

  @Post()
  create(@CurrentUser() user: JwtUserDto, @Body() dto: CreateBookingDto) {
    return this.bookingsService.createBooking(user.sub, dto);
  }

  @Delete(':bookingId')
  cancel(
    @CurrentUser() user: JwtUserDto,
    @Param('bookingId') bookingId: string,
  ) {
    return this.bookingsService.cancelBooking(user.sub, bookingId);
  }

  @Get('calendar')
  getConnectedCalendar(@CurrentUser() user: JwtUserDto) {
    return this.bookingsService.getConnectedCalendar(user.sub);
  }

  @Patch('calendar/connect')
  connectCalendar(
    @CurrentUser() user: JwtUserDto,
    @Body('calendarId') calendarId: string,
  ) {
    return this.bookingsService.connectCalendar(user.sub, calendarId);
  }

  @Get('taken')
  listTakenSlots() {
    return this.bookingsService.listTakenSlots();
  }
}

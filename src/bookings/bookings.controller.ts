import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Auth0Guard } from '../common/guards/auth0.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtUserDto } from '../common/dto/jwt-user.dto';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { AuthService } from '../auth/auth.service';
import { ExtractJwt } from 'passport-jwt';

@Controller('bookings')
@UseGuards(Auth0Guard)
export class BookingsController {
  constructor(
    private readonly bookingsService: BookingsService,
    private readonly authService: AuthService,
  ) {}

  @Get()
  list(@CurrentUser() user: JwtUserDto) {
    return this.bookingsService.listBookings(user.sub);
  }

  @Post()
  async create(@Req() req: unknown, @Body() dto: CreateBookingDto) {
    const token = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
    const user = await this.authService.getUserProfileFromAuth0(token!);
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

import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
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
}

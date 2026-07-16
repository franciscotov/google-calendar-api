import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Auth0Guard } from '../common/guards/auth0.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Auth0UserDto } from '../common/dto/auth0-user.dto';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';

@Controller('bookings')
@UseGuards(Auth0Guard)
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Get()
  list(@CurrentUser() user: Auth0UserDto) {
    return this.bookingsService.listBookings(user.sub);
  }

  @Post()
  async create(
    @CurrentUser() user: Auth0UserDto,
    @Body() dto: CreateBookingDto,
  ) {
    return this.bookingsService.createBooking(user.sub, dto);
  }

  @Delete(':bookingId')
  cancel(
    @CurrentUser() user: Auth0UserDto,
    @Param('bookingId') bookingId: string,
  ) {
    return this.bookingsService.cancelBooking(user.sub, bookingId);
  }

  @Get('taken')
  listTakenSlots() {
    return this.bookingsService.listTakenSlots();
  }
}
